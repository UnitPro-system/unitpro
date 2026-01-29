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
    // independientemente de la diferencia horaria.
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
            if (event.transparency === 'transparent') return false;
            if (event.status === 'cancelled') return false;

            // A. Verificar FECHA EXACTA usando Intl (Nativo y preciso con Timezones)
            // Esto convierte la fecha del evento a la hora local del negocio y compara si es el día pedido.
            const start = event.start?.dateTime || event.start?.date;
            if (!start) return false;
            
            // "en-CA" nos da formato YYYY-MM-DD
            const eventDateString = new Intl.DateTimeFormat('en-CA', { 
                timeZone: timeZone,
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).format(new Date(start));

            if (eventDateString !== dateStr) return false;

            // B. Lógica de IDs
            const shared = (event.extendedProperties?.shared as any) || {};
            const rawId = shared['saas_worker_id'];
            const eventWorkerId = rawId ? String(rawId).trim() : null;
            const targetWorkerId = workerIdArg ? String(workerIdArg).trim() : null;

            if (availabilityMode === 'global') {
                return true;
            } else {
                // Modo Simultáneo:
                // 1. Si no tiene dueño (es un bloqueo manual o feriado) -> Ocupado para todos
                if (!eventWorkerId) return true; 
                
                // 2. Si coinciden IDs (es turno de este profesional) -> Ocupado
                if (targetWorkerId && eventWorkerId === targetWorkerId) return true; 
                
                // 3. Si es de otro profesional -> Libre (para mi)
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