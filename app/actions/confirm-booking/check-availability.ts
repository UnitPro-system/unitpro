'use server'

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function checkAvailability(slug: string, dateStr: string, workerIdArg?: string) {
  try {
    // 1. Configuración
    const { data: negocio } = await supabase
      .from('negocios')
      .select('id, google_refresh_token, config, config_web')
      .eq('slug', slug)
      .single()

    if (!negocio?.google_refresh_token) return { success: false, error: 'Sin conexión a Calendar' }

    const config = negocio.config || {}
    const timeZone = config.timezone || 'America/Argentina/Buenos_Aires'
    
    // 2. Definir ventana de tiempo (Nativo JS, sin librerías externas)
    // Buscamos desde "ayer" hasta "pasado mañana" para asegurar que cubrimos todo el día
    // y eventos que crucen la medianoche, independientemente de la diferencia horaria.
    const startWindow = new Date(dateStr); 
    startWindow.setDate(startWindow.getDate() - 1); 
    
    const endWindow = new Date(dateStr);
    endWindow.setDate(endWindow.getDate() + 2); 

    // 3. Auth Google
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
    auth.setCredentials({ refresh_token: negocio.google_refresh_token })
    const calendar = google.calendar({ version: 'v3', auth })

    // 4. Consulta (Ventana amplia)
    const eventsResponse = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startWindow.toISOString(),
        timeMax: endWindow.toISOString(),
        singleEvents: true,
        timeZone: timeZone 
    });

    const events = eventsResponse.data.items || [];
    const availabilityMode = negocio.config_web?.equipo?.availabilityMode || 'global';

    // 5. Filtrado
    const busyIntervals = events
        .filter(event => {
            // Ignoramos eventos transparentes (marcados como "disponible" en Calendar) o cancelados
            if (event.transparency === 'transparent') return false;
            if (event.status === 'cancelled') return false;

            // Validación básica de existencia de fechas
            const start = event.start?.dateTime || event.start?.date;
            if (!start) return false;

            // --- CORRECCIÓN IMPORTANTE ---
            // Eliminamos la comparación estricta de fecha (eventDateString !== dateStr).
            // Ahora devolvemos cualquier evento que caiga en la ventana de tiempo.
            // El frontend se encargará de calcular matemáticamente si el horario choca
            // con el slot específico que el cliente está mirando.
            
            // B. Lógica de IDs (Profesionales)
            const shared = (event.extendedProperties?.shared as any) || {};
            const rawId = shared['saas_worker_id'];
            const eventWorkerId = rawId ? String(rawId).trim() : null;
            const targetWorkerId = workerIdArg ? String(workerIdArg).trim() : null;

            if (availabilityMode === 'global') {
                // Modo Sala Única: Cualquier evento bloquea todo
                return true;
            } else {
                // Modo Simultáneo (Equipo):
                
                // 1. Si el evento NO tiene ID (es un bloqueo manual en Calendar, feriado, o almuerzo)
                // -> Se considera ocupado para TODOS los profesionales.
                if (!eventWorkerId) return true; 
                
                // 2. Si tiene ID y coincide con el profesional que el cliente eligió
                // -> Ocupado.
                if (targetWorkerId && eventWorkerId === targetWorkerId) return true; 
                
                // 3. Si tiene ID pero es de OTRO profesional
                // -> Libre (no me afecta a mí).
                return false; 
            }
        })
        .map(event => ({
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date
        }));

    return { success: true, busy: busyIntervals, timeZone, mode: availabilityMode }

  } catch (error: any) {
    console.error('Error checking availability:', error)
    return { success: false, error: error.message }
  }
}