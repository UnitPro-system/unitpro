'use server'

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function checkAvailability(slug: string, dateStr: string, workerIdArg?: string) {
  try {
    // 1. Obtener credenciales y configuración
    const { data: negocio } = await supabase
      .from('negocios')
      .select('id, google_refresh_token, config, config_web')
      .eq('slug', slug)
      .single()

    if (!negocio?.google_refresh_token) {
      return { success: false, error: 'Negocio no conectado a Google Calendar' }
    }

    const config = negocio.config || {}
    const timeZone = config.timezone || 'America/Argentina/Buenos_Aires'
    
    // Modo: 'global' (Sala Única) o 'per_worker' (Simultáneo)
    const teamConfig = negocio.config_web?.equipo || {};
    const availabilityMode = teamConfig.availabilityMode || 'global'; 

    // 2. Auth Google
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
    auth.setCredentials({ refresh_token: negocio.google_refresh_token })
    const calendar = google.calendar({ version: 'v3', auth })

    // 3. OBTENER EVENTOS (Estrategia de Ventana Amplia)
    // Pedimos desde ayer hasta mañana para evitar errores de borde por Timezone (UTC vs Local)
    const startWindow = new Date(dateStr); 
    startWindow.setDate(startWindow.getDate() - 1); // -1 día
    const endWindow = new Date(dateStr);
    endWindow.setDate(endWindow.getDate() + 2); // +2 días (margen seguro)

    const eventsResponse = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startWindow.toISOString(),
        timeMax: endWindow.toISOString(),
        singleEvents: true, // Expande recurrentes
        timeZone: timeZone  // Pide a Google que devuelva los tiempos en la zona del negocio
    });

    const events = eventsResponse.data.items || [];
    
    // Helper: Verifica si un evento cae en el día objetivo (en la zona horaria correcta)
    const isEventOnTargetDay = (event: any) => {
        const start = event.start?.dateTime || event.start?.date;
        if (!start) return false;

        // Formateamos la fecha del evento a "YYYY-MM-DD" usando la TimeZone del negocio
        const eventDateString = new Intl.DateTimeFormat('en-CA', { // en-CA usa formato ISO YYYY-MM-DD
            timeZone: timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date(start));

        return eventDateString === dateStr;
    };

    // 4. FILTRADO LÓGICO
    const busyIntervals = events
        .filter(event => {
            // A. Ignorar transparentes y cancelados
            if (event.transparency === 'transparent') return false;
            if (event.status === 'cancelled') return false;

            // B. Verificar FECHA EXACTA
            if (!isEventOnTargetDay(event)) return false;

            // --- LÓGICA DE NEGOCIO ---

            // 1. Extraemos el ID de forma segura usando corchetes ['...'] para evitar error de TS
            //    y usamos trim() para limpiar espacios fantasma.
            const extendedProps = event.extendedProperties?.shared;
            const rawEventId = extendedProps ? extendedProps['saas_worker_id'] : null;
            const eventWorkerId = rawEventId ? String(rawEventId).trim() : null;
            
            const targetWorkerId = workerIdArg ? String(workerIdArg).trim() : null;

            // CASO 1: SALA ÚNICA (Global)
            if (availabilityMode === 'global') {
                return true; // Cualquier evento bloquea todo
            }

            // CASO 2: SIMULTÁNEO (Por profesional)
            else {
                // a) Bloqueo GENERAL (Feriados, bloqueos manuales sin ID)
                if (!eventWorkerId) return true;

                // b) Bloqueo ESPECÍFICO (Si busco a Juan y el evento es de Juan)
                if (targetWorkerId && eventWorkerId === targetWorkerId) {
                    return true;
                }

                // c) Si es evento de otro profesional -> No me molesta
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