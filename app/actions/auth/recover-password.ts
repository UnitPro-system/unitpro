'use server'

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

// Usamos el cliente ADMIN para poder modificar usuarios sin estar logueados
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// --- 1. ENVIAR CÓDIGO ---
export async function sendRecoveryCode(email: string) {
  try {
    const emailNormalizado = email.trim().toLowerCase();

    // A. Verificar si el usuario existe (usando la función RPC que creamos)
    const { data: userId, error: userError } = await supabaseAdmin
      .rpc('get_user_id_by_email', { user_email: emailNormalizado });

    if (userError || !userId) {
      // Por seguridad, no decimos "no existe", simulamos éxito para despistar hackers
      return { success: true }; 
    }

    // B. Generar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // C. Guardar en BD (Upsert: si ya pidió uno, lo sobrescribe)
    const { error: dbError } = await supabaseAdmin
      .from('password_resets')
      .upsert(
        { email: emailNormalizado, code: code, created_at: new Date().toISOString() },
        { onConflict: 'email' }
      );

    if (dbError) throw new Error('Error guardando código');

    // D. Enviar Email con GMAIL (Tu lógica existente)
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    // IMPORTANTE: Aquí necesitamos un Refresh Token válido para ENVIAR el correo.
    // Opción 1: Usar el token del propio negocio "UnitPro" si lo tienes guardado en DB.
    // Opción 2: Poner el Refresh Token de TU cuenta de Gmail en .env (RECOMENDADO para correos de sistema)
    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_SYSTEM_REFRESH_TOKEN // <--- AGREGAR ESTO EN TU .ENV
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const subject = "Recupera tu contraseña - UnitPro";
    const messageBody = `
      <h1>Código de Recuperación</h1>
      <p>Has solicitado restablecer tu contraseña.</p>
      <p>Tu código es: <strong style="font-size: 24px;">${code}</strong></p>
      <p>Si no fuiste tú, ignora este mensaje.</p>
    `;

    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
      `To: ${emailNormalizado}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
      '',
      messageBody,
    ];
    const rawMessage = Buffer.from(messageParts.join('\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: rawMessage },
    });

    return { success: true };

  } catch (error: any) {
    console.error('Error recovery:', error);
    return { success: false, error: error.message };
  }
}

// --- 2. VERIFICAR Y CAMBIAR PASS ---
export async function resetPassword(email: string, code: string, newPassword: string) {
  try {
    const emailNormalizado = email.trim().toLowerCase();

    // A. Verificar Código
    const { data: resetRecord } = await supabaseAdmin
      .from('password_resets')
      .select('*')
      .eq('email', emailNormalizado)
      .single();

    if (!resetRecord || resetRecord.code !== code) {
      return { success: false, error: 'Código inválido o expirado' };
    }

    // Opcional: Verificar expiración (ej: 15 mins)
    const created = new Date(resetRecord.created_at).getTime();
    const now = new Date().getTime();
    if (now - created > 15 * 60 * 1000) {
       return { success: false, error: 'El código ha expirado' };
    }

    // B. Obtener ID de usuario
    const { data: userId } = await supabaseAdmin
      .rpc('get_user_id_by_email', { user_email: emailNormalizado });

    if (!userId) return { success: false, error: 'Usuario no encontrado' };

    // C. Cambiar Contraseña (Admin)
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) throw updateError;

    // D. Borrar el código usado
    await supabaseAdmin.from('password_resets').delete().eq('email', emailNormalizado);

    return { success: true };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}