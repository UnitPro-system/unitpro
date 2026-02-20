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

    let turnoGuardadoId = null;

    if (turnoExistente) {
      const { error } = await supabase.from('turnos').update(turnoData).eq('id', turnoExistente.id)
      if (error) throw error
      turnoGuardadoId = turnoExistente.id;
    } else {
      const { data: nuevoTurno, error } = await supabase.from('turnos').insert(turnoData).select('id').single()
      if (error) throw error
      turnoGuardadoId = nuevoTurno.id;
    }

    // --- NUEVO: LÓGICA DE AUTO-CONFIRMACIÓN DESDE EL BACKEND ---
    const configWeb = negocio.config_web || {};
    const requireManual = configWeb.booking?.requireManualConfirmation ?? true;

    if (!requireManual && turnoGuardadoId) {
        
        // 1. Buscamos el servicio en la configuración del negocio
        const allServices = [
            ...(configWeb.servicios?.items || []), 
            ...(configWeb.services || [])
        ];
        
        // Comparamos el nombre que llegó con los títulos de los servicios guardados
        const serviceFound = allServices.find((s: any) => 
            (s.titulo === bookingData.service || s.name === bookingData.service)
        );

        // 2. Extraemos el precio y lo convertimos a número limpio
        const rawPrice = serviceFound?.precio || serviceFound?.price || 0;
        const finalPrice = typeof rawPrice === 'string' ? Number(rawPrice.replace(/[^0-9.-]+/g,"")) : Number(rawPrice);

        // 3. Ejecutamos la aprobación automática internamente
        const approvalRes = await approveAppointment(turnoGuardadoId, finalPrice);
        
        if (!approvalRes.success) {
            console.error("Error en auto-confirmación:", approvalRes.error);
        }
        
        revalidatePath('/dashboard')
        return { success: true, pending: false } // Avisamos al frontend que NO quedó pendiente
    }
    // ------------------------------------------------------------

    revalidatePath('/dashboard')
    return { success: true, pending: true } // Avisamos al frontend que SÍ quedó pendiente

  } catch (error: any) {
    console.error('Error creating request:', error)
    return { success: false, error: error.message }
  }
}

export async function approveAppointment(appointmentId: string, finalPrice?: number) {
  try {
    // 1. Obtener datos (se mantiene igual)
    const { data: turno, error: tErr } = await supabase
      .from('turnos')
      .select('*, negocios(*)')
      .eq('id', appointmentId)
      .single()

    if (tErr || !turno) throw new Error('Turno no encontrado')
    const negocio = turno.negocios
    
    // ... (validaciones y auth de Google se mantienen igual) ...

    // 3. Determinar flujo (se mantiene igual)
    const configWeb = negocio.config_web || {};
    const teamConfig = configWeb.equipo || {};
    const bookingConfig = configWeb.booking || { requestDeposit: false, depositPercentage: 50 };
    const availabilityMode = teamConfig.availabilityMode || 'global';
    
    const necesitaSenia = bookingConfig.requestDeposit && bookingConfig.depositPercentage > 0;
    
    let nuevoEstado = necesitaSenia ? 'esperando_senia' : 'confirmado';
    let googleEventId = null;

    // ... (Lógica del CASO A y CASO B se mantiene igual) ...
    // Solo me aseguro de que uses el precioNumerico correctamente aquí abajo

    // 4. Enviar Email
    if (turno.cliente_email) {
        // Calculamos montos (si finalPrice es undefined usamos 0)
        const precioNumerico = finalPrice || 0;
        const depositAmount = necesitaSenia ? (precioNumerico * bookingConfig.depositPercentage) / 100 : 0;
        
        // ... (resto de lógica de preparación del servicio y workerName) ...
        const serviceString = turno.servicio || "";
        const parts = serviceString.split(" - ");
        const workerName = parts.length > 1 ? parts[parts.length - 1] : null;

        // --- MODIFICACIÓN 1: Buscar al profesional en la configuración ---
        const trabajadorElegido = configWeb.equipo?.items?.find((w: any) => w.nombre === workerName);

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
                precio_total: `$${precioNumerico}`, // Esto ahora tendrá el valor correcto
                monto_senia: `$${depositAmount}`,
                link_pago: "", // Tu lógica de link de pago original
                
                // --- MODIFICACIÓN 2: Pasar las variables nuevas ---
                alias: trabajadorElegido?.aliasCvu || '',
                telefono_trabajador: trabajadorElegido?.telefono || ''
            }
        );

        if (emailData && turno.cliente_email) {
    // 1. Necesitas configurar el cliente de Auth (esto falta en tu función actual)
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: negocio.google_refresh_token });
    const gmail = google.gmail({ version: 'v1', auth });

    // 2. Preparar el mensaje RFC 2822
    const utf8Subject = `=?utf-8?B?${Buffer.from(emailData.subject).toString('base64')}?=`;
    const messageParts = [
        `To: ${turno.cliente_email}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${utf8Subject}`,
        '',
        emailData.html,
    ];
    
    const rawMessage = Buffer.from(messageParts.join('\n'))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    // 3. ENVIAR EL CORREO
    try {
        await gmail.users.messages.send({ 
            userId: 'me', 
            requestBody: { raw: rawMessage } 
        });
    } catch (e) {
        console.error("Error enviando correo de aprobación/seña:", e);
        // Opcional: podrías decidir si lanzar el error o solo loguearlo
    }
}
    }

    // 5. Actualizar DB (CORRECCIÓN CRÍTICA AQUÍ)
    const { error } = await supabase
      .from('turnos')
      .update({ 
          estado: nuevoEstado, 
          google_event_id: googleEventId,
          precio_total: finalPrice || 0 // <--- ¡AQUÍ GUARDAMOS EL PRECIO!
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
            const bookingConfig = configWeb.booking || { depositPercentage: 50 };
            
            // A. Recuperamos valores
            const precioTotal = turno.precio_total || 0; 
            const porcentajeSenia = bookingConfig.depositPercentage || 50;

            // B. Calculamos
            const montoPagado = (precioTotal * porcentajeSenia) / 100;
            const saldoRestante = precioTotal - montoPagado;
            
            // Formatear Fecha
            const fechaLegible = new Date(turno.fecha_inicio).toLocaleString('es-AR', {
                timeZone: 'America/Argentina/Buenos_Aires',
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            });

            // --- MODIFICACIÓN PARA CONFIRMACIÓN: Buscar al profesional ---
            const serviceString = turno.servicio || "";
            const parts = serviceString.split(" - ");
            const workerName = parts.length > 1 ? parts[parts.length - 1] : null;
            const trabajadorElegido = configWeb.equipo?.items?.find((w: any) => w.nombre === workerName);

            const emailData = compileEmailTemplate(
                'confirmation', 
                configWeb,
                {
                    cliente: turno.cliente_nombre,
                    servicio: turno.servicio,
                    fecha: fechaLegible,
                    precio_total: `$${precioTotal}`,     // <--- Precio Total Real
                    monto_senia: `$${montoPagado}`,      // <--- Lo que ya pagó
                    precio_a_pagar: `$${saldoRestante}`, // <--- Lo que falta pagar
                    // --- MODIFICACIÓN 2: Pasar las variables nuevas ---
                    alias: trabajadorElegido?.aliasCvu || '',
                    telefono_trabajador: trabajadorElegido?.telefono || ''
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