import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const slug = searchParams.get("state");
  const error = searchParams.get("error");

  // 1. DUMP INICIAL DE VARIABLES (Para ver si Vercel las lee)
  const debugEnv = {
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    slugRecibido: slug,
    codeRecibido: code ? "SÍ (Oculto)" : "NO",
    errorGoogle: error
  };

  if (error) {
     return NextResponse.json({ status: "Error de Google", details: error }, { status: 400 });
  }

  if (!code || !slug) {
     return NextResponse.json({ status: "Faltan datos", debug: debugEnv }, { status: 400 });
  }

  const DOMINIO_REAL = "https://unitpro-system.vercel.app";
  const redirectUri = `${DOMINIO_REAL}/api/google/callback`;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  try {
    // PASO A: Intentar canjear tokens con Google
    console.log("Intentando obtener tokens...");
    const { tokens } = await oauth2Client.getToken(code);
    console.log("Tokens obtenidos correctamente");

    // PASO B: Intentar conectar con Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // PASO C: Intentar escribir en la base de datos
    // Nota: Usamos select() al final para forzar que nos devuelva el dato o el error
    const { data, error: dbError } = await supabase
      .from("negocios")
      .update({
        google_calendar_connected: true,
        google_refresh_token: tokens.refresh_token || "no_refresh_token_sent",
        google_access_token: tokens.access_token,
      })
      .eq("slug", slug)
      .select();

    if (dbError) {
        throw new Error(`Error de Supabase: ${dbError.message} (Código: ${dbError.code})`);
    }

    if (!data || data.length === 0) {
        throw new Error("Supabase no devolvió error, pero NO actualizó ninguna fila. ¿El SLUG es correcto? ¿Bloqueo RLS?");
    }

    // SI TODO SALE BIEN:
    return NextResponse.json({ 
        status: "¡ÉXITO TOTAL!", 
        message: "Todo funcionó. Ahora puedes volver al código original.",
        dataUpdate: data 
    });

  } catch (err: any) {
    // AQUÍ ESTÁ LA CAUSA VERDADERA
    return NextResponse.json({ 
        status: "ERROR CRÍTICO DETECTADO", 
        causa: err.message,
        stack: err.stack, // Opcional
        variables_entorno: debugEnv, // Para confirmar que Vercel tiene las claves
        redirect_uri_usada: redirectUri
    }, { status: 500 });
  }
}