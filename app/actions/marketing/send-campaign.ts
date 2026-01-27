'use server'

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

interface Recipient {
  id: string;
  cliente_nombre: string;
  cliente_email: string;
}

// 1. Helper para codificar headers correctamente (evita errores por tildes/ñ)
function encodeHeader(text: string) {
  return `=?utf-8?B?${Buffer.from(text).toString('base64')}?=`;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function sendCampaignBatch(
  negocioId: string, 
  recipients: Recipient[], 
  subject: string, 
  bodyTemplate: string
) {
  try {
    const { data: negocio, error } = await supabase
      .from('negocios')
      .select('google_refresh_token, nombre')
      .eq('id', negocioId)
      .single();

    if (error || !negocio?.google_refresh_token) {
      throw new Error('No se pudo obtener la autorización del negocio.');
    }

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ refresh_token: negocio.google_refresh_token });
    
    const gmail = google.gmail({ version: 'v1', auth });

    const profile = await gmail.users.getProfile({ userId: 'me' });
    const senderEmail = profile.data.emailAddress;
    if (!senderEmail) throw new Error('No se pudo obtener el email del remitente.');

    // 2. Preparamos el nombre del remitente codificado
    const encodedFromName = encodeHeader(negocio.nombre);

    // RESULTADOS
    let sentCount = 0;
    const errors: any[] = [];

    // 3. ENVÍO SECUENCIAL (Para evitar error 429 de Google)
    // En lugar de Promise.allSettled, usamos un bucle for-of
    for (const client of recipients) {
      try {
        const cleanName = client.cliente_nombre || 'Cliente';
        const personalBody = bodyTemplate.replace(/{{nombre}}/gi, cleanName);
        
        // Construcción correcta del MIME
        const emailContent = 
`From: ${encodedFromName} <${senderEmail}>
To: ${client.cliente_email}
Subject: ${encodeHeader(subject)}
Content-Type: text/plain; charset=utf-8
MIME-Version: 1.0
List-Unsubscribe: <mailto:${senderEmail}?subject=unsubscribe>

${personalBody}

--------------------------------------------------
Enviado por ${negocio.nombre}
`;

        const encodedMessage = Buffer.from(emailContent)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: encodedMessage }
        });

        sentCount++;
        
        // PEQUEÑA PAUSA (Delay) de 100ms entre correos para no saturar
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (err: any) {
        // Guardamos el error específico para poder depurar si es necesario
        console.error(`Error enviando a ${client.cliente_email}:`, err.message);
        errors.push({ email: client.cliente_email, error: err.message });
      }
    }

    // 4. Retornar información de errores al frontend si los hay
    return { 
      success: true, 
      sent: sentCount, 
      total: recipients.length,
      errors: errors.length > 0 ? errors : undefined 
    };

  } catch (error: any) {
    console.error('Error crítico en sendCampaignBatch:', error);
    return { success: false, error: error.message };
  }
}