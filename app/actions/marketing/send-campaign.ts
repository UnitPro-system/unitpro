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
    // ... (La parte de obtener negocio y auth se mantiene igual hasta antes del bucle)
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

    const encodedFromName = encodeHeader(negocio.nombre);

    // RESULTADOS
    let sentCount = 0;
    const errors: any[] = [];

    // --- BUCLE MEJORADO CON DIAGNÓSTICO DE ERRORES ---
    for (const client of recipients) {
      try {
        const cleanName = client.cliente_nombre || 'Cliente';
        const personalBody = bodyTemplate.replace(/{{nombre}}/gi, cleanName);
        
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
        
        // Delay preventivo
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (err: any) {
        // --- AQUÍ ESTÁ LA LÓGICA DE DETECCIÓN DE ERROR ---
        let errorCategory = 'DESCONOCIDO';
        let detailedMessage = err.message || 'Sin mensaje de error';

        // 1. Verificar Errores de API de Google (Estructura común)
        if (err.response && err.response.data && err.response.data.error) {
            const googleError = err.response.data.error;
            detailedMessage = `Code: ${googleError.code} - ${googleError.message}`;
            
            // Clasificación rápida
            if (googleError.code === 401 || detailedMessage.includes('invalid_grant')) {
                errorCategory = 'AUTH_TOKEN_EXPIRED'; // El refresh token ya no sirve
            } else if (googleError.code === 403 || detailedMessage.includes('quota')) {
                errorCategory = 'QUOTA_EXCEEDED'; // Límite diario de Gmail
            } else if (googleError.code === 429) {
                errorCategory = 'RATE_LIMIT'; // Demasiado rápido
            } else if (googleError.errors && Array.isArray(googleError.errors)) {
                // A veces Google da detalles extra en un array
                detailedMessage += ` | Details: ${JSON.stringify(googleError.errors)}`;
            }
        } 
        // 2. Errores de red o conexión
        else if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
            errorCategory = 'NETWORK_ERROR';
        }

        const fullErrorReport = `[${errorCategory}] ${detailedMessage}`;
        
        console.error(`❌ Error enviando a ${client.cliente_email}:`, fullErrorReport);
        
        // Agregamos este reporte detallado al array de errores para que lo veas en el frontend/consola
        errors.push({ 
            email: client.cliente_email, 
            error: fullErrorReport 
        });
      }
    }

    // 4. Retornar información
    return { 
      success: true, 
      sent: sentCount, 
      total: recipients.length,
      errors: errors.length > 0 ? errors : undefined 
    };

  } catch (error: any) {
    console.error('Error crítico en sendCampaignBatch:', error);
    // Aquí también aplicamos un poco de limpieza si el error es global
    const globalMsg = error.response?.data?.error?.message || error.message;
    return { success: false, error: globalMsg };
  }
}

function encodeHeader(nombre: any) {
    throw new Error('Function not implemented.');
}
