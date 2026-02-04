'use server'

import { createClient } from '@/lib/supabase-server'

/**
 * Cambia la contraseña de un usuario validando primero su contraseña actual.
 * Este flujo es para usuarios con sesión activa dentro del dashboard.
 */
export async function updatePasswordWithOld(oldPassword: string, newPassword: string) {
  const supabase = await createClient();

  // 1. Obtener el usuario actual para recuperar su email
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user?.email) {
    return { success: false, error: "No se encontró una sesión activa o el usuario no está autenticado." };
  }

  // 2. Re-autenticación (Seguridad crítica):
  // Intentamos iniciar sesión con la clave vieja. Si falla, el cambio se aborta.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: oldPassword,
  });

  if (signInError) {
    return { success: false, error: "La contraseña actual es incorrecta." };
  }

  // 3. Actualización:
  // Una vez validada la identidad, aplicamos la nueva contraseña.
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (updateError) {
    return { success: false, error: "Error al actualizar: " + updateError.message };
  }

  return { success: true };
}