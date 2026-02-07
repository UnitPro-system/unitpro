// app/api/cron/cleanup-images/route.ts
import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  // Validación de seguridad para que solo cron-job.org (o tú) pueda ejecutarlo
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('No autorizado', { status: 401 });
  }

  const supabase = createClient();
  const ahora = new Date().toISOString();

  try {
    // 1. Buscar turnos pasados que tengan fotos
    const { data: turnosViejos, error: fetchError } = await supabase
      .from('turnos')
      .select('id, fotos')
      .lt('fecha_fin', ahora) 
      .not('fotos', 'is', null);

    if (fetchError) throw fetchError;

    if (!turnosViejos || turnosViejos.length === 0) {
      return NextResponse.json({ message: 'Sin imágenes para limpiar.' });
    }

    for (const turno of turnosViejos) {
      if (turno.fotos && turno.fotos.length > 0) {
        // 2. Extraer nombres de archivo de las URLs
        const filesToRemove = turno.fotos.map((url: string) => {
          const parts = url.split('appointment-attachments/');
          return parts[parts.length - 1];
        });

        // 3. Borrar del Storage de Supabase
        const { error: storageError } = await supabase.storage
          .from('appointment-attachments')
          .remove(filesToRemove);

        if (!storageError) {
          // 4. Limpiar la referencia en la DB
          await supabase
            .from('turnos')
            .update({ fotos: [] })
            .eq('id', turno.id);
        }
      }
    }

    return NextResponse.json({ success: true, processed: turnosViejos.length });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}