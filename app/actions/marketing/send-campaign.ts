'use server'

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

// Definimos la interfaz del destinatario (debe coincidir con lo que manda el Frontend)
interface Recipient {
  id: string;
  cliente_nombre: string;
  cliente_email: string;
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
    // 1. Obtener credenciales del negocio (Token de Google)
    const { data: negocio, error } = await supabase
      .from('negocios')
      .select('google_refresh_token, nombre')
      .eq('id', negocioId)
      .single();

    if (error || !negocio?.google_refresh_token) {
      throw new Error('No se pudo obtener la autorización del negocio. Verificá la conexión con Google.');
    }

    // 2. Configurar el Cliente OAuth2 de Google
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ refresh_token: negocio.google_refresh_token });
    
    const gmail = google.gmail({ version: 'v1', auth });

    // 3. Obtener el email del remitente (El email real del negocio)
    // Esto es necesario para el campo "From" y evitar que caiga en Spam
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const senderEmail = profile.data.emailAddress;

    if (!senderEmail) throw new Error('No se pudo obtener el email del perfil de Google.');

    // 4. Procesar el Lote (Batch) en paralelo
    // Usamos Promise.allSettled para que si falla uno, no se detenga el resto del lote.
    const results = await Promise.allSettled(recipients.map(async (client) => {
        // A. Personalización del mensaje (Reemplazo de variables)
        // Si el cliente no tiene nombre, usamos un genérico o vacío para que no quede "Hola null"
        const cleanName = client.cliente_nombre || 'Cliente';
        const personalBody = bodyTemplate.replace(/{{nombre}}/gi, cleanName);
        
        // B. Construcción del Email (MIME Format)
        // Es crucial codificar bien el Subject y el Body para acentos y caracteres especiales (UTF-8)
        const emailContent = 
`From: ${negocio.nombre} <${senderEmail}>
To: ${client.cliente_email}
Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=
Content-Type: text/plain; charset=utf-8
MIME-Version: 1.0
List-Unsubscribe: <mailto:${senderEmail}?subject=unsubscribe>

${personalBody}

--------------------------------------------------
Enviado por ${negocio.nombre}
`;

        // C. Codificación Base64Url (Requerido por Gmail API)
        const encodedMessage = Buffer.from(emailContent)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // D. Envío
        await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: encodedMessage }
        });

        return client.id; // Retornamos ID en caso de éxito
    }));

    // 5. Calcular Resultados
    const sentCount = results.filter(r => r.status === 'fulfilled').length;
    const errors = results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason);

    if (errors.length > 0) {
      console.error('Errores en el lote de campaña:', errors);
    }

    return { 
      success: true, 
      sent: sentCount, 
      total: recipients.length 
    };

  } catch (error: any) {
    console.error('Error crítico en sendCampaignBatch:', error);
    return { success: false, error: error.message };
  }
}