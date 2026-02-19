import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js'; // O tu cliente de supabase configurado
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Importante para evitar caché

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXT_PUBLIC_BASE_URL // O tu URL hardcodeada: https://unitpro-system.vercel.app/api/google/callback
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessId, leadName, leadEmail, startTime, endTime } = body;

    // 1. Iniciar Supabase (asegúrate de usar tu cliente admin si es necesario para leer tokens)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Usamos service role para acceder a datos sensibles seguro
    );

    // 2. Obtener el refresh_token del negocio
    const { data: negocio, error } = await supabase
      .from('negocios')
      .select('google_refresh_token')
      .eq('id', businessId) // O como identifiques al negocio
      .single();

    if (error || !negocio?.google_refresh_token) {
      return NextResponse.json({ error: 'Negocio no conectado a Google Calendar' }, { status: 400 });
    }

    // 3. Configurar credenciales en Google
    oauth2Client.setCredentials({
      refresh_token: negocio.google_refresh_token
    });

    // La librería googleapis maneja automáticamente la obtención del access_token usando el refresh_token
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // 4. Crear el evento
    const event = {
      summary: `Cita con ${leadName}`,
      description: `Agendado desde UnitPro System. Lead Email: ${leadEmail}`,
      start: {
        dateTime: new Date(startTime).toISOString(), // Asegúrate de que llegue en formato ISO
        timeZone: 'America/Argentina/Buenos_Aires', // O la zona horaria del negocio (IMPORTANTE)
      },
      end: {
        dateTime: new Date(endTime).toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      attendees: [
        { email: leadEmail }, // Invita al lead al evento
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 10 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary', // Usa el calendario principal del usuario conectado
      requestBody: event,
      sendUpdates: 'none'
    });

    return NextResponse.json({ success: true, eventLink: response.data.htmlLink });

  } catch (error: any) {
    console.error('Error creando evento:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}