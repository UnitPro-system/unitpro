'use server'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function deleteNegocio(negocioId: number) {
  try {
    await supabase.from('tenant_blocks').delete().eq('negocio_id', negocioId);
    await supabase.from('resenas').delete().eq('negocio_id', negocioId);
    await supabase.from('turnos').delete().eq('negocio_id', negocioId);
    const { error } = await supabase.from('negocios').delete().eq('id', negocioId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}