import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

// IMPORTANTE: Al ser un cron, no hay cookies de usuario.
// Usamos la Service Role Key para tener acceso a "todos" los datos sin RLS.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  // 1. Seguridad: Verificar que la llamada viene de cron-job.org (o tu prueba)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 2. Buscar turnos que cumplan TODAS las condiciones:
    // - Entre ahora y 24hs
    // - Estado confirmado
    // - Recordatorio NO enviado
    // - Hacemos join con 'negocios' para tener el token de Google del dueño
    const { data: turnos, error } = await supabaseAdmin
      .from('turnos')
      .select(`
        *,
        negocios!inner (
          google_refresh_token,
          google_access_token
        )
      `)
      .eq('estado', 'confirmado')
      .eq('recordatorio_enviado', false)
      .gt('fecha_inicio', now.toISOString())
      .lt('fecha_inicio', twentyFourHoursLater.toISOString());

    if (error) throw error;
    if (!turnos || turnos.length === 0) {
      return NextResponse.json({ message: 'No hay recordatorios pendientes' });
    }

    const resultados = [];

    // 3. Iterar y enviar correos
    for (const turno of turnos) {
      try {
        const refreshToken = turno.negocios.google_refresh_token;
        if (!refreshToken) {
            console.warn(`Negocio del turno ${turno.id} no tiene refresh token`);
            continue;
        }

        // A. Configurar cliente de Google con las credenciales DEL NEGOCIO
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        );

        oauth2Client.setCredentials({
          refresh_token: refreshToken
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // B. Preparar el correo
        // Formatear la fecha para que sea legible para el cliente
        const fechaLegible = new Date(turno.fecha_inicio).toLocaleString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        const subject = `Recordatorio de tu turno: ${turno.servicio}`;
        const message = `
          <h1>Hola ${turno.cliente_nombre},</h1>
          <p>Te recordamos que tienes un turno mañana.</p>
          <ul>
            <li><strong>Servicio:</strong> ${turno.servicio}</li>
            <li><strong>Fecha y Hora:</strong> ${fechaLegible}</li>
          </ul>
          <p>Por favor, avísanos si necesitas reprogramar.</p>
        `;

        // C. Codificar mensaje (RFC 2822) - Reutilizamos tu lógica de send-email
        const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
        const messageParts = [
          `To: ${turno.cliente_email}`,
          'Content-Type: text/html; charset=utf-8',
          'MIME-Version: 1.0',
          `Subject: ${utf8Subject}`,
          '',
          message,
        ];
        const rawMessage = Buffer.from(messageParts.join('\n'))
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        // D. Enviar realmente usando la API de Gmail
        await gmail.users.messages.send({
          userId: 'me', // 'me' se refiere al dueño del refresh_token (el negocio)
          requestBody: { raw: rawMessage },
        });

        // E. Marcar en Supabase como enviado para no spammear
        // Usamos supabaseAdmin para ignorar RLS
        await supabaseAdmin
          .from('turnos')
          .update({ recordatorio_enviado: true })
          .eq('id', turno.id);

        resultados.push({ id: turno.id, status: 'sent' });

      } catch (innerError: any) {
        console.error(`Error enviando recordatorio turno ${turno.id}:`, innerError);
        resultados.push({ id: turno.id, status: 'error', error: innerError.message });
      }
    }

    return NextResponse.json({ processed: resultados.length, details: resultados });

  } catch (error: any) {
    console.error('Error general en cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}