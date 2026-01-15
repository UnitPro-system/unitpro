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
    if (!negocio?.google_refresh_token) throw new Error('Negocio no conectado')

    // 2. Auth
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
    auth.setCredentials({ refresh_token: negocio.google_refresh_token })
    const calendar = google.calendar({ version: 'v3', auth })
    const targetCalendarId = bookingData.calendarId || 'primary';
    const description = `Servicio: ${bookingData.service}\n` +
                        `Profesional: ${bookingData.workerName || 'Cualquiera'}\n` + // <--- NUEVO
                        `Cliente: ${bookingData.clientName}\nTel: ${bookingData.clientPhone}`;

    // 3. Crear Evento (Tu lógica original estaba bien, la mantenemos)
    // NOTA: Asumimos que bookingData.start ya viene en formato ISO correcto desde el frontend
    const event = await calendar.events.insert({
      calendarId: targetCalendarId,
      requestBody: {
        summary: `Turno: ${bookingData.clientName}`,
        description: description,
        start: { dateTime: bookingData.start, timeZone: 'America/Argentina/Buenos_Aires' },
        end: { dateTime: bookingData.end, timeZone: 'America/Argentina/Buenos_Aires' },
        attendees: bookingData.clientEmail ? [{ email: bookingData.clientEmail }] : [],
        reminders: {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: 30 }, { method: 'email', minutes: 1440 }]
        }
      }
    })

    // 4. Guardar en Supabase
    const { error } = await supabase.from('turnos').insert({
      negocio_id: negocio.id,
      cliente_nombre: bookingData.clientName,
      cliente_email: bookingData.clientEmail,
      servicio: `${bookingData.service} (con ${bookingData.workerName || 'Staff'})`,
      fecha_inicio: bookingData.start,
      fecha_fin: bookingData.end,
      google_event_id: event.data.id,
      estado: 'confirmado'
    })
    const emailNormalizado = bookingData.clientEmail?.trim().toLowerCase();

    // A. Buscamos si este cliente ya tiene CUALQUIER registro (usamos ilike y limit 1)
    const { data: turnosExistentes } = await supabase
      .from('turnos')
      .select('id')
      .eq('negocio_id', negocio.id)
      .ilike('cliente_email', emailNormalizado) // ilike ignora mayúsculas/minúsculas
      .limit(1) // IMPORTANTE: Si hay duplicados, agarramos solo uno para evitar errores

    const turnoExistente = turnosExistentes && turnosExistentes.length > 0 ? turnosExistentes[0] : null;

    if (turnoExistente) {
      // B. EXISTE: Sobreescribimos ese registro con los datos nuevos
      const { error } = await supabase
        .from('turnos')
        .update({
          cliente_nombre: bookingData.clientName,
          servicio: bookingData.service,
          fecha_inicio: bookingData.start,
          fecha_fin: bookingData.end,
          google_event_id: event.data.id,
          estado: 'confirmado'
        })
        .eq('id', turnoExistente.id)
      
      if (error) throw error

    } else {
      // C. NO EXISTE: Creamos el primer registro
      const { error } = await supabase.from('turnos').insert({
        negocio_id: negocio.id,
        cliente_nombre: bookingData.clientName,
        cliente_email: bookingData.clientEmail, // Guardamos el original
        servicio: bookingData.service,
        fecha_inicio: bookingData.start,
        fecha_fin: bookingData.end,
        google_event_id: event.data.id,
        estado: 'confirmado'
      })

      if (error) throw error
    }

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
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    auth.setCredentials({ refresh_token: refreshToken })
    const calendar = google.calendar({ version: 'v3', auth })

    // 3. Eliminar de Google Calendar (si tiene ID de evento)
    if (turno.google_event_id) {
      try {
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: turno.google_event_id
        })
      } catch (gError) {
        console.warn('El evento ya no existía en Google o falló el borrado:', gError)
        // Continuamos para cancelar en la DB local de todos modos
      }
    }

    // 4. Actualizar estado en Supabase
    const { error: updateError } = await supabase
      .from('turnos')
      .update({ estado: 'cancelado' })
      .eq('id', appointmentId)

    if (updateError) throw updateError

    // 5. Revalidar UI
    revalidatePath('/dashboard') 
    
    return { success: true }

  } catch (error: any) {
    console.error('Error canceling appointment:', error)
    return { success: false, error: error.message }
  }
}