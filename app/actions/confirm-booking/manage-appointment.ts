'use server'

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { revalidatePath } from 'next/cache'
import { compileEmailTemplate } from '@/lib/email-helper'

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
export async function approveAppointment(appointmentId: string, finalPrice?: number) {
  try {
    // 1. Obtener datos
    const { data: turno, error: tErr } = await supabase
      .from('turnos')
      .select('*, negocios(*)')
      .eq('id', appointmentId)
      .single()

    if (tErr || !turno) throw new Error('Turno no encontrado')
    const negocio = turno.negocios
    
    // Validación básica
    if (!negocio?.google_refresh_token) throw new Error('Negocio no conectado a Google Calendar')

    // Configuración
    const configWeb = negocio.config_web || {};
    const teamConfig = configWeb.equipo || {};
    const bookingConfig = configWeb.booking || { requestDeposit: false, depositPercentage: 50 };
    const availabilityMode = teamConfig.availabilityMode || 'global';

    // 2. Auth Google (Solo instanciamos, usaremos según el caso)
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
    auth.setCredentials({ refresh_token: negocio.google_refresh_token })
    const calendar = google.calendar({ version: 'v3', auth })
    const gmail = google.gmail({ version: 'v1', auth });

    // 3. Determinar flujo
    const necesitaSenia = bookingConfig.requestDeposit && bookingConfig.depositPercentage > 0;
    
    let nuevoEstado = 'confirmado';
    let googleEventId = null;

    if (necesitaSenia) {
        // --- CASO A: PIDE SEÑA ---
        // Pasamos a 'esperando_senia'. 
        // NO creamos evento en Google Calendar (riesgo de overbooking externo aceptado).
        nuevoEstado = 'esperando_senia';

    } else {
        // --- CASO B: CONFIRMACIÓN DIRECTA ---
        // Aquí SÍ chequeamos conflictos y creamos el evento ya mismo.
        
        // B1. Validar Conflictos
        const conflictCheck = await calendar.events.list({
            calendarId: 'primary',
            timeMin: turno.fecha_inicio, 
            timeMax: turno.fecha_fin,
            singleEvents: true,
            timeZone: 'America/Argentina/Buenos_Aires'
        })

        const conflictingEvents = conflictCheck.data.items || []
        for (const existingEvent of conflictingEvents) {
            if (existingEvent.transparency === 'transparent' || existingEvent.status === 'cancelled') continue
            const shared = (existingEvent.extendedProperties?.shared as any) || {}
            const eventWorkerId = shared['saas_worker_id'] ? String(shared['saas_worker_id']).trim() : null
            let hayConflicto = (availabilityMode === 'global') || (!eventWorkerId) 
            if (hayConflicto) throw new Error('El horario ya no está disponible en Google Calendar.')
        }

        // B2. Crear Evento
        const event = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
                summary: `Turno: ${turno.cliente_nombre}`,
                description: `Servicio: ${turno.servicio}\nTel: ${turno.cliente_telefono}\n${turno.mensaje || ''}\nEstado: CONFIRMADO\nPrecio Final: $${finalPrice || '-'}`,
                start: { dateTime: turno.fecha_inicio, timeZone: 'America/Argentina/Buenos_Aires' },
                end: { dateTime: turno.fecha_fin, timeZone: 'America/Argentina/Buenos_Aires' },
                attendees: turno.cliente_email ? [{ email: turno.cliente_email }] : [],
                extendedProperties: { shared: { saas_service_type: 'confirm_booking' } },
                reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }, { method: 'email', minutes: 1440 }] }
            }
        })
        googleEventId = event.data.id;
    }

    // 4. Enviar Email (Lógica de texto según estado)
    if (turno.cliente_email) { // Quitamos la validación estricta de finalPrice
    const serviceString = turno.servicio || "";
    const parts = serviceString.split(" - ");
    const workerName = parts.length > 1 ? parts[parts.length - 1] : null;
    
    let paymentLink = "";
    if (workerName && teamConfig.items) {
        const worker = teamConfig.items.find((w: any) => w.nombre === workerName);
        if (worker && worker.paymentLink) paymentLink = worker.paymentLink;
    }

    // Calculamos montos (si finalPrice es undefined usamos 0 para no romper el cálculo)
    const precioNumerico = finalPrice || 0;
    const depositAmount = necesitaSenia ? (precioNumerico * bookingConfig.depositPercentage) / 100 : 0;
    
    const fechaLegible = new Date(turno.fecha_inicio).toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });

    const templateType = necesitaSenia ? 'deposit' : 'confirmation';
    
    const emailData = compileEmailTemplate(
        templateType,
        configWeb,
        {
            cliente: turno.cliente_nombre,
            servicio: turno.servicio,
            fecha: fechaLegible,
            profesional: workerName || '',
            precio_total: `$${precioNumerico}`,
            monto_senia: `$${depositAmount}`,
            link_pago: paymentLink
        }
    );

    if (emailData) {
        const utf8Subject = `=?utf-8?B?${Buffer.from(emailData.subject).toString('base64')}?=`;
        const messageParts = [
            `To: ${turno.cliente_email}`,
            'Content-Type: text/html; charset=utf-8',
            'MIME-Version: 1.0',
            `Subject: ${utf8Subject}`,
            '',
            emailData.html,
        ];
        const rawMessage = Buffer.from(messageParts.join('\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        
        try { 
            await gmail.users.messages.send({ userId: 'me', requestBody: { raw: rawMessage } }); 
        } catch(e) { 
            console.error("Error enviando Gmail:", e); 
        }
    }
}

    // 5. Actualizar DB
    const { error } = await supabase
      .from('turnos')
      .update({ estado: nuevoEstado, google_event_id: googleEventId })
      .eq('id', appointmentId)

    if (error) throw error

    revalidatePath('/dashboard')
    return { success: true }

  } catch (error: any) {
    console.error('Error approving:', error)
    return { success: false, error: error.message }
  }
}

// --- AGREGAR: markDepositPaid ---
// Esta función es la que FINALMENTE crea el evento en Google cuando pagan.
export async function markDepositPaid(turnoId: string) {
    try {
        const { data: turno, error: tErr } = await supabase
            .from('turnos')
            .select('*, negocios(*)')
            .eq('id', turnoId)
            .single()

        if (tErr || !turno) throw new Error('Turno no encontrado');
        const negocio = turno.negocios;
        
        // Auth Google
        const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
        auth.setCredentials({ refresh_token: negocio.google_refresh_token })
        const calendar = google.calendar({ version: 'v3', auth })
        const gmail = google.gmail({ version: 'v1', auth });

        // 1. CHEQUEO DE DISPONIBILIDAD (CRÍTICO)
        // Como no bloqueamos antes, puede que alguien haya ocupado el lugar manualmente.
        const conflictCheck = await calendar.events.list({
            calendarId: 'primary',
            timeMin: turno.fecha_inicio, 
            timeMax: turno.fecha_fin,
            singleEvents: true,
            timeZone: 'America/Argentina/Buenos_Aires'
        })

        if (conflictCheck.data.items && conflictCheck.data.items.length > 0) {
            // Filtramos eventos transparentes o cancelados
            const conflicts = conflictCheck.data.items.filter(e => e.transparency !== 'transparent' && e.status !== 'cancelled');
            if (conflicts.length > 0) {
                 throw new Error('⚠️ ¡CUIDADO! El horario se ocupó en Google Calendar mientras esperábamos el pago.');
            }
        }

        // 2. Crear Evento en Google
        const event = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
                summary: `Turno: ${turno.cliente_nombre}`,
                description: `Servicio: ${turno.servicio}\nTel: ${turno.cliente_telefono}\nSEÑA ABONADA - CONFIRMADO`,
                start: { dateTime: turno.fecha_inicio, timeZone: 'America/Argentina/Buenos_Aires' },
                end: { dateTime: turno.fecha_fin, timeZone: 'America/Argentina/Buenos_Aires' },
                attendees: turno.cliente_email ? [{ email: turno.cliente_email }] : [],
                extendedProperties: { shared: { saas_service_type: 'confirm_booking' } },
                reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }, { method: 'email', minutes: 1440 }] }
            }
        })

        // 3. Email confirmación final
        if (turno.cliente_email) {
    const configWeb = negocio.config_web || {};
    
    // Formatear Fecha
    const fechaLegible = new Date(turno.fecha_inicio).toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });

    const emailData = compileEmailTemplate(
        'confirmation', // Usamos el template de confirmación porque ya pagó
        configWeb,
        {
            cliente: turno.cliente_nombre,
            servicio: turno.servicio,
            fecha: fechaLegible,
            precio_total: 'PAGADO (Seña)',
            // ... otros campos que necesites
        }
    );

    if (emailData) {
        const utf8Subject = `=?utf-8?B?${Buffer.from(emailData.subject).toString('base64')}?=`;
        const messageParts = [
            `To: ${turno.cliente_email}`,
            'Content-Type: text/html; charset=utf-8',
            'MIME-Version: 1.0',
            `Subject: ${utf8Subject}`,
            '',
            emailData.html,
        ];
        const rawMessage = Buffer.from(messageParts.join('\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        try { 
            await gmail.users.messages.send({ userId: 'me', requestBody: { raw: rawMessage } }); 
        } catch(e) { console.error("Error confirmación final:", e); }
    }
}

        // 4. Actualizar DB
        const { error } = await supabase
            .from('turnos')
            .update({ estado: 'confirmado', google_event_id: event.data.id })
            .eq('id', turnoId);

        if (error) throw error;
        revalidatePath('/dashboard');
        return { success: true };

    } catch (error: any) {
        console.error('Error marking paid:', error);
        return { success: false, error: error.message };
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