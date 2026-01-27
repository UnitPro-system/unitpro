"use server";

import { google } from 'googleapis';
import { createClient } from "@/lib/supabase-server";

type Recipient = {
  email: string;
  nombre: string;
};

export async function sendCampaignBatch(
  negocioId: string,
  recipients: Recipient[],
  subject: string,
  messageTemplate: string
) {
  const supabase = await createClient();

  try {
    // 1. Obtener credenciales del negocio (UNA SOLA VEZ por lote)
    const { data: negocio, error } = await supabase
      .from('negocios')
      .select('google_access_token, google_refresh_token')
      .eq('id', negocioId)
      .single();

    if (error || !negocio?.google_refresh_token) {
      return { success: false, error: "Google no conectado o credenciales inválidas" };
    }

    // 2. Configurar cliente de Google
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: negocio.google_access_token,
      refresh_token: negocio.google_refresh_token,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // 3. Iterar y enviar correos
    let sentCount = 0;
    const errors = [];

    for (const recipient of recipients) {
      try {
        // Personalizar mensaje (Reemplazar {{nombre}})
        const personalizedMessage = messageTemplate.replace(/{{nombre}}/gi, recipient.nombre || "Cliente");

        // Codificar Asunto (UTF-8) para evitar caracteres raros
        const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;

        // Construir email crudo (RFC 2822)
        const messageParts = [
          `To: ${recipient.email}`,
          'Content-Type: text/html; charset=utf-8',
          'MIME-Version: 1.0',
          `Subject: ${utf8Subject}`,
          '',
          personalizedMessage, // Aquí podrías envolverlo en un HTML base si quisieras
        ];

        const rawMessage = Buffer.from(messageParts.join('\n'))
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw: rawMessage },
        });

        sentCount++;
      } catch (err: any) {
        console.error(`Error enviando a ${recipient.email}:`, err.message);
        errors.push({ email: recipient.email, error: err.message });
      }
    }

    return { success: true, sentCount, errors };

  } catch (error: any) {
    console.error("Error general en batch:", error);
    return { success: false, error: error.message };
  }
}