'use server'

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { revalidatePath } from 'next/cache'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// --- CREATE ---
export async function createAppointment(slug: string, bookingData: any) {
  try {
    // 1. Validaciones iniciales
    const { data: negocio } = await supabase.from('negocios').select('*').eq('slug', slug).single()
    const teamConfig = negocio.config_web?.equipo || {};
    const availabilityMode = teamConfig.availabilityMode || 'global';
    if (!negocio?.google_refresh_token) throw new Error('Negocio no conectado')

    // 2. Auth
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
    auth.setCredentials({ refresh_token: negocio.google_refresh_token })
    const calendar = google.calendar({ version: 'v3', auth })
    const targetCalendarId = bookingData.calendarId || 'primary';
    const startDateTime = bookingData.start.replace('Z', '');
    const endDateTime = bookingData.end.replace('Z', '');
    const description = `Servicio: ${bookingData.service}\n` +
                        `Profesional: ${bookingData.workerName || 'Cualquiera'}\n` + // <--- NUEVO
                        `Cliente: ${bookingData.clientName}\nTel: ${bookingData.clientPhone}`;
    const conflictCheck = await calendar.events.list({
        calendarId: 'primary',
        timeMin: bookingData.start, 
        timeMax: bookingData.end,
        singleEvents: true,
        timeZone: 'America/Argentina/Buenos_Aires' // O la timezone de tu config
    });

    const conflictingEvents = conflictCheck.data.items || [];
    const targetWorkerId = bookingData.workerId ? String(bookingData.workerId).trim() : null;

    // 2. Revisamos uno por uno si generan conflicto real
    for (const existingEvent of conflictingEvents) {
        // Ignoramos si es transparente o cancelado
        if (existingEvent.transparency === 'transparent') continue;
        if (existingEvent.status === 'cancelled') continue;

        // Extraemos ID del profesional del evento existente
        const shared = (existingEvent.extendedProperties?.shared as any) || {};
        const eventWorkerId = shared['saas_worker_id'] ? String(shared['saas_worker_id']).trim() : null;

        let hayConflicto = false;

        if (availabilityMode === 'global') {
             // Si es Sala Única, CUALQUIER evento bloquea
             hayConflicto = true;
        } else {
             // Si es Simultáneo:
             // - Bloquea si es un evento "general" (sin profesional asignado, ej: feriado)
             // - Bloquea si es del MISMO profesional que estamos intentando reservar
             if (!eventWorkerId || (targetWorkerId && eventWorkerId === targetWorkerId)) {
                 hayConflicto = true;
             }
        }

        if (hayConflicto) {
            throw new Error('El horario seleccionado ya no está disponible (bloqueo por backend).');
        }
    }

    // 3. Crear Evento (Tu lógica original estaba bien, la mantenemos)
    // NOTA: Asumimos que bookingData.start ya viene en formato ISO correcto desde el frontend
    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `Turno: ${bookingData.clientName} (${bookingData.workerName || 'General'})`,
        description: description,
        start: { dateTime: bookingData.start, timeZone: 'America/Argentina/Buenos_Aires' },
        end: { dateTime: bookingData.end, timeZone: 'America/Argentina/Buenos_Aires' },
        attendees: bookingData.clientEmail ? [{ email: bookingData.clientEmail }] : [],
        extendedProperties: {
          shared: {
            saas_worker_id: bookingData.workerId || '',
            saas_service_type: 'confirm_booking'
          }
        },

        reminders: {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: 30 }, { method: 'email', minutes: 1440 }]
        }
      }
    })

    // 4. Guardar en Supabase
    const emailNormalizado = bookingData.clientEmail?.trim().toLowerCase();

    // A. Buscamos si este cliente ya tiene CUALQUIER registro (usamos ilike y limit 1)
    const { data: turnosExistentes } = await supabase
      .from('turnos')
      .select('id')
      .eq('negocio_id', negocio.id)
      .ilike('cliente_email', emailNormalizado) // ilike ignora mayúsculas/minúsculas
      .limit(1) // IMPORTANTE: Si hay duplicados, agarramos solo uno para evitar errores


    
    const turnoExistente = turnosExistentes && turnosExistentes.length > 0 ? turnosExistentes[0] : null;
    const turnoData = {
        negocio_id: negocio.id,
        cliente_nombre: bookingData.clientName,
        cliente_telefono: bookingData.clientPhone,
        cliente_email: bookingData.clientEmail,
        servicio: bookingData.service,
        fecha_inicio: bookingData.start,
        fecha_fin: bookingData.end,
        google_event_id: event.data.id,
        estado: 'confirmado',
        // Podrías agregar una columna 'worker_id' en tu tabla turnos si quieres, pero no es estrictamente necesario si ya está en Google
    };



    const servicioConProfesional = `${bookingData.service} - ${bookingData.workerName || 'Cualquiera'}`;
    if (turnoExistente) {
  // B. EXISTE: Sobreescribimos ese registro con los datos nuevos


  const { error } = await supabase
    .from('turnos')
    .update({
      cliente_nombre: bookingData.clientName,
      cliente_telefono: bookingData.clientPhone,
      servicio: servicioConProfesional,
      fecha_inicio: bookingData.start,
      fecha_fin: bookingData.end,
      google_event_id: event.data.id,
      estado: 'confirmado',
      recordatorio_enviado: false // <--- ¡AGREGA ESTA LÍNEA!
    })
    .eq('id', turnoExistente.id)
  
  if (error) throw error

} else {
  // C. NO EXISTE: Creamos el primer registro
  const { error } = await supabase.from('turnos').insert({
    negocio_id: negocio.id,
    cliente_nombre: bookingData.clientName,
    cliente_telefono: bookingData.clientPhone,
    cliente_email: bookingData.clientEmail,
    servicio: servicioConProfesional,
    fecha_inicio: bookingData.start,
    fecha_fin: bookingData.end,
    google_event_id: event.data.id,
    estado: 'confirmado',
    recordatorio_enviado: false // <--- Buena práctica: asegurarlo también aquí, aunque el default de la DB sea false.
  })

  if (error) throw error
}
    //aca va lo del gmail
    // 5. Revalidate
    revalidatePath('/dashboard') // O la ruta que corresponda
    return { success: true, eventLink: event.data.htmlLink }

  } catch (error: any) {
    console.error('Error creating appointment:', error)
    return { success: false, error: error.message }
  }
}

// --- CANCEL ---
export async function cancelAppointment(appointmentId: string) {
  try {
    // 1. Obtener datos del turno y refresh token del negocio asociado
    const { data: turno, error: turnoError } = await supabase
      .from('turnos')
      .select('*, negocios(google_refresh_token)')
      .eq('id', appointmentId)
      .single()

    if (turnoError || !turno) throw new Error('Turno no encontrado')

    // @ts-ignore: Supabase join returns array or object depending on query, assuming object here due to FK
    const refreshToken = turno.negocios?.google_refresh_token
    
    if (!refreshToken) throw new Error('No se pudo conectar con Google Calendar del negocio')

    // 2. Auth con Google
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
        auth.setCredentials({ refresh_token: refreshToken })
        const calendar = google.calendar({ version: 'v3', auth })

    // 3. Eliminar de Google Calendar (si tiene ID de evento)
    if (turno.google_event_id) {
          try {
            await calendar.events.delete({ calendarId: 'primary', eventId: turno.google_event_id })
          } catch (gError) { console.warn('Evento ya borrado en Google', gError) }
        }

    // 4. Actualizar estado en Supabase
    const { error: deleteError } = await supabase
      .from('turnos')
      .update({ estado: 'cancelado' }) 
      .eq('id', appointmentId)

    if (deleteError) throw deleteError

    // 5. Revalidar UI
    revalidatePath('/dashboard') 
    
    return { success: true }

  } catch (error: any) {
    console.error('Error canceling appointment:', error)
    return { success: false, error: error.message }
  }
}