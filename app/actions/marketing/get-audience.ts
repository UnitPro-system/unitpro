'use server'

import { createClient } from '@supabase/supabase-js'

// Inicializamos el cliente con la Service Role Key para poder leer sin restricciones de RLS
// (Asumiendo que la validación de permisos del usuario se hace antes de llamar a esta acción o mediante middleware)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getCampaignAudience(negocioId: string, fechaLimite: string) {
  try {
    // 1. Consultar la tabla 'turnos' que actúa como registro único de clientes
    const { data: clientes, error } = await supabase
      .from('turnos')
      .select('cliente_nombre, cliente_email, fecha_inicio, id') // Seleccionamos solo lo necesario
      .eq('negocio_id', negocioId) // ¡Importante! Aislar por negocio
      .lt('fecha_inicio', fechaLimite) // Filtro: última visita ANTES de la fecha límite
      .order('fecha_inicio', { ascending: false }) // Priorizar los más recientes dentro del filtro
      .limit(2000) // Límite de seguridad para envío masivo

    if (error) {
      throw new Error(error.message)
    }

    // 2. Retornar los datos formateados
    return { 
      success: true, 
      data: clientes 
    }

  } catch (error: any) {
    console.error('Error fetching campaign audience:', error)
    return { 
      success: false, 
      error: error.message 
    }
  }
}