'use server'

import { createClient } from '@/lib/supabase-server'

/**
 * Envía un correo de recuperación al usuario usando el flujo nativo de Supabase.
 * El link en el correo redirigirá al usuario a una ruta que definiremos luego.
 */
export async function sendResetPasswordEmail(email: string) {
  const supabase = await createClient();
  const emailNormalizado = email.trim().toLowerCase();

  const { error } = await supabase.auth.resetPasswordForEmail(emailNormalizado, {
    // Esta es la URL a la que el usuario será enviado al hacer click en el mail
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/recover-password/reset`,
  });

  if (error) {
    console.error('Error al enviar reset email:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Esta función se usará en la página de destino para establecer la nueva clave.
 * Supabase detecta automáticamente el token en la sesión al llegar desde el email.
 */
export async function setNewPassword(password: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: password
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}