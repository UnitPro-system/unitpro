'use server'

import { createClient } from '@/lib/supabase-server'

/**
 * Envía un correo de recuperación al usuario usando el flujo nativo de Supabase.
 */
export async function sendResetPasswordEmail(email: string) {
  const supabase = await createClient();
  const emailNormalizado = email.trim().toLowerCase();

  // Redirigimos directamente a la página de reset. 
  // Supabase agregará #access_token=... a esta URL
  const { error } = await supabase.auth.resetPasswordForEmail(emailNormalizado, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/recover-password/reset`,
  });

  if (error) {
    console.error('Error al enviar reset email:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Esta función se usará en la página de destino para establecer la nueva clave.
 */
export async function setNewPassword(password: string) {
  const supabase = await createClient();

  // Actualizamos la contraseña del usuario autenticado (la sesión se establece en el frontend)
  const { error } = await supabase.auth.updateUser({
    password: password
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}