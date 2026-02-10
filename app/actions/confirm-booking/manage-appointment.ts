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
    if (!negocio) throw new Error('Negocio no encontrado')

    // 2. Preparar los datos (Mantenemos tu lógica de servicio + profesional)
    const servicioConProfesional = `${bookingData.service} - ${bookingData.workerName || 'Cualquiera'}`;
    const emailNormalizado = bookingData.clientEmail?.trim().toLowerCase();

    const turnoData = {
        negocio_id: negocio.id,
        cliente_nombre: bookingData.clientName,
        cliente_telefono: bookingData.clientPhone,
        cliente_email: bookingData.clientEmail,
        servicio: servicioConProfesional,
        fecha_inicio: bookingData.start,
        fecha_fin: bookingData.end,
        mensaje: bookingData.message,
        fotos: bookingData.images,
        estado: 'pendiente', // <--- CAMBIO: Ahora nace como pendiente
        google_event_id: null, // <--- No tiene evento aún
        recordatorio_enviado: false
    };

    // 3. Guardar en Supabase (Tu lógica A, B y C intacta)
    const { data: turnosExistentes } = await supabase
      .from('turnos')
      .select('id')
      .eq('negocio_id', negocio.id)
      .ilike('cliente_email', emailNormalizado)
      .limit(1)
    
    const turnoExistente = turnosExistentes && turnosExistentes.length > 0 ? turnosExistentes[0] : null;

    if (turnoExistente) {
      const { error } = await supabase.from('turnos').update(turnoData).eq('id', turnoExistente.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('turnos').insert(turnoData)
      if (error) throw error
    }

    revalidatePath('/dashboard')
    return { success: true, pending: true } // Avisamos que quedó pendiente

  } catch (error: any) {
    console.error('Error creating request:', error)
    return { success: false, error: error.message }
  }
}
export async function approveAppointment(appointmentId: string) {
  try {
    // 1. Obtener datos del turno y configuración del negocio
    const { data: turno, error: tErr } = await supabase
      .from('turnos')
      .select('*, negocios(*)')
      .eq('id', appointmentId)
      .single()

    if (tErr || !turno) throw new Error('Turno no encontrado')
    const negocio = turno.negocios
    const teamConfig = negocio.config_web?.equipo || {}
    const availabilityMode = teamConfig.availabilityMode || 'global'

    if (!negocio?.google_refresh_token) throw new Error('Negocio no conectado')

    // 2. Auth y Validación de Conflictos (TU LÓGICA ORIGINAL)
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
    auth.setCredentials({ refresh_token: negocio.google_refresh_token })
    const calendar = google.calendar({ version: 'v3', auth })

    const conflictCheck = await calendar.events.list({
        calendarId: 'primary',
        timeMin: turno.fecha_inicio, 
        timeMax: turno.fecha_fin,
        singleEvents: true,
        timeZone: 'America/Argentina/Buenos_Aires'
    })

    const conflictingEvents = conflictCheck.data.items || []
    // Aquí usamos la lógica de shared properties que ya habías programado
    for (const existingEvent of conflictingEvents) {
        if (existingEvent.transparency === 'transparent' || existingEvent.status === 'cancelled') continue
        
        const shared = (existingEvent.extendedProperties?.shared as any) || {}
        const eventWorkerId = shared['saas_worker_id'] ? String(shared['saas_worker_id']).trim() : null
        
        // Re-extraemos el workerId de los metadatos o del string del servicio si lo necesitas
        // Por ahora mantenemos tu lógica de 'global' vs 'simultaneo'
        let hayConflicto = (availabilityMode === 'global') || (!eventWorkerId) 
        
        if (hayConflicto) throw new Error('El horario ya no está disponible en Google Calendar.')
    }

    // 3. Crear Evento (TU LÓGICA ORIGINAL)
    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `Turno: ${turno.cliente_nombre}`,
        description: `Servicio: ${turno.servicio}\nTel: ${turno.cliente_telefono}\n${turno.mensaje || ''}`,
        start: { dateTime: turno.fecha_inicio, timeZone: 'America/Argentina/Buenos_Aires' },
        end: { dateTime: turno.fecha_fin, timeZone: 'America/Argentina/Buenos_Aires' },
        attendees: turno.cliente_email ? [{ email: turno.cliente_email }] : [],
        extendedProperties: {
          shared: {
            // Nota: Aquí podrías recuperar el workerId si lo guardaste en el turno
            saas_service_type: 'confirm_booking'
          }
        },
        reminders: {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: 30 }, { method: 'email', minutes: 1440 }]
        }
      }
    })

    // 4. Actualizar estado a Confirmado
    const { error } = await supabase
      .from('turnos')
      .update({ 
        estado: 'confirmado', 
        google_event_id: event.data.id 
      })
      .eq('id', appointmentId)

    if (error) throw error

    revalidatePath('/dashboard')
    return { success: true }

  } catch (error: any) {
    console.error('Error approving:', error)
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

export async function createManualAppointment(slug: string, bookingData: any) {
  try {
    // 1. Obtener negocio y auth
    const { data: negocio } = await supabase.from('negocios').select('*').eq('slug', slug).single()
    if (!negocio?.google_refresh_token) throw new Error('Negocio no conectado')

    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
    auth.setCredentials({ refresh_token: negocio.google_refresh_token })
    const calendar = google.calendar({ version: 'v3', auth })

    // 2. Crear evento en Google Calendar primero para tener el ID
    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `Turno Manual: ${bookingData.clientName}`,
        description: `Servicio: ${bookingData.service}\nTel: ${bookingData.clientPhone}\nAgendado manualmente desde el dashboard.`,
        start: { dateTime: bookingData.start, timeZone: 'America/Argentina/Buenos_Aires' },
        end: { dateTime: bookingData.end, timeZone: 'America/Argentina/Buenos_Aires' },
        extendedProperties: {
          shared: {
            saas_worker_id: bookingData.workerId,
            saas_service_type: 'confirm_booking_manual'
          }
        }
      }
    })

    // 3. Guardar en Supabase directamente como 'confirmado'
    const { error } = await supabase.from('turnos').insert({
      negocio_id: negocio.id,
      cliente_nombre: bookingData.clientName,
      cliente_telefono: bookingData.clientPhone,
      cliente_email: bookingData.clientEmail,
      servicio: `${bookingData.service} - ${bookingData.workerName}`,
      fecha_inicio: bookingData.start,
      fecha_fin: bookingData.end,
      estado: 'confirmado',
      google_event_id: event.data.id
    })

    if (error) throw error

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    console.error('Error manual booking:', error)
    return { success: false, error: error.message }
  }
}