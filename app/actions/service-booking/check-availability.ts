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

            // B. Verificar FECHA EXACTA (Tu lógica actual de isEventOnTargetDay está bien, mantenla si la tienes fuera)
            if (!isEventOnTargetDay(event)) return false;

            // --- CAMBIO CLAVE AQUÍ ---
            
            // 1. Normalizamos los IDs para evitar errores de espacios o tipos
            // Usamos 'as any' para evitar que TypeScript se queje de la propiedad dinámica
            const shared = (event.extendedProperties?.shared as any) || {};
            const rawId = shared['saas_worker_id'];
            
            const eventWorkerId = rawId ? String(rawId).trim() : null;
            const targetWorkerId = workerIdArg ? String(workerIdArg).trim() : null;

            // 2. Lógica de Bloqueo
            if (availabilityMode === 'global') {
                return true; // Sala Única: Todo bloquea
            } else {
                // Simultáneo:
                // - Si el evento no tiene ID (es un bloqueo manual o feriado) -> BLOQUEADO
                if (!eventWorkerId) return true;

                // - Si busco un profesional y el evento es de él -> BLOQUEADO
                if (targetWorkerId && eventWorkerId === targetWorkerId) return true;

                // - En cualquier otro caso (es de otro profesional) -> DISPONIBLE
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