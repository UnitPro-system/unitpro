'use server'

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function checkAvailability(slug: string, dateStr: string) {
  try {
    // 1. Obtener credenciales y configuración del negocio
    const { data: negocio } = await supabase
      .from('negocios')
      .select('id, google_refresh_token, config')
      .eq('slug', slug)
      .single()

    if (!negocio?.google_refresh_token) {
      return { success: false, error: 'Negocio no conectado a Google Calendar' }
    }

    // Configuración por defecto si no existe en la DB
    const config = negocio.config || {}
    const timeZone = config.timezone || 'America/Argentina/Buenos_Aires'
    
    // 2. Definir inicio y fin del día (Usando tu lógica de Offset si es necesaria, 
    // pero con freebusy es mejor mandar ISO UTC y dejar que Google maneje la zona)
    // Para simplificar, asumimos que dateStr viene como "2026-01-03"
    const timeMin = new Date(`${dateStr}T00:00:00`).toISOString()
    const timeMax = new Date(`${dateStr}T23:59:59`).toISOString()

    // 3. Auth Google
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    auth.setCredentials({ refresh_token: negocio.google_refresh_token })
    const calendar = google.calendar({ version: 'v3', auth })

    // 4. API Call: FreeBusy (La forma correcta de ver disponibilidad)
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        timeZone, 
        items: [{ id: 'primary' }] // Miramos el calendario principal del dueño
      }
    })

    const busyIntervals = response.data.calendars?.['primary']?.busy || []

    return { success: true, busy: busyIntervals, timeZone }

  } catch (error: any) {
    console.error('Error checking availability:', error)
    return { success: false, error: error.message }
  }
}