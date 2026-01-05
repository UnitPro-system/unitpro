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
    // ... (Copia aquí tu lógica de cancelarTurno de agendar-turno.ts tal cual) ...
    // Solo asegúrate de actualizar los imports y paths si es necesario.
}