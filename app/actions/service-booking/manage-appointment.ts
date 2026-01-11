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

    // 3. Crear Evento (Tu lógica original estaba bien, la mantenemos)
    // NOTA: Asumimos que bookingData.start ya viene en formato ISO correcto desde el frontend
    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `Turno: ${bookingData.clientName}`,
        description: `Servicio: ${bookingData.service}\nCliente: ${bookingData.clientName}\nTel: ${bookingData.clientPhone}`,
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
      servicio: bookingData.service,
      fecha_inicio: bookingData.start,
      fecha_fin: bookingData.end,
      google_event_id: event.data.id,
      estado: 'confirmado'
    })

    if (error) throw error
    if (bookingData.clientEmail) {
      // 1. Buscamos si el cliente ya existe en este negocio específico
      const { data: clienteExistente } = await supabase
        .from('turnos')
        .select('id')
        .eq('negocio_id', negocio.id)
        .eq('cliente_email', bookingData.clientEmail)
        .single() // Devuelve objeto si existe, null si no

      const datosCliente = {
        negocio_id: negocio.id,
        cliente_nombre: bookingData.clientName,    // Actualizamos nombre por si hubo corrección
        cliente_email: bookingData.clientEmail,
        fecha_inicio: bookingData.start  // Guardamos la fecha de ESTE turno
        fecha_fin: bookingData.end
      }

      if (clienteExistente) {
        // A. EXISTE: Actualizamos sus datos y fecha de última visita
        await supabase
          .from('turnos')
          .update({
            cliente_nombre: datosCliente.cliente_nombre,
            fecha_inicio: datosCliente.fecha_inicio
            fecha_fin: datosCliente.fecha_fin
          })
          .eq('id', clienteExistente.id)
      } else {
        // B. NO EXISTE: Creamos el perfil nuevo
        await supabase
          .from('turnos')
          .insert(datosCliente)
      }
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