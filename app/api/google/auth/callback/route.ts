import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"; // O @supabase/ssr si usas la versión nueva
import { cookies } from "next/headers";

export async function GET(request: Request) {
  // 1. Google nos devuelve un 'code' (la llave temporal) y el 'state' (el slug que enviamos antes)
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const slug = searchParams.get("state");

  if (!code || !slug) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 2. Inicializamos Supabase en el servidor
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  
  // 3. Preparamos el cliente de Google otra vez
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_APP_URL + "/api/google/callback"
  );

  try {
    // 4. EL INTERCAMBIO: Le damos el código temporal a Google y nos da los Tokens reales
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // 5. Aprovechamos para pedir el email del usuario (para mostrarlo en el dashboard)
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    // 6. GUARDAR EN DB: Actualizamos la tabla 'negocios' con el refresh_token
    // IMPORTANTE: El 'refresh_token' es la llave maestra que no caduca.
    const { error } = await supabase
      .from("negocios")
      .update({
        google_refresh_token: tokens.refresh_token, 
        google_email: userInfo.data.email,
        google_calendar_connected: true
      })
      .eq("slug", slug);

    if (error) throw error;

    // 7. ÉXITO: Devolvemos al usuario a su dashboard con un parámetro '?google_connected=true'
    // para que el Frontend sepa que debe abrir la pestaña de configuración.
    return NextResponse.redirect(new URL(`/${slug}?google_connected=true`, request.url));

  } catch (error) {
    console.error("Error conectando Google:", error);
    return NextResponse.redirect(new URL(`/${slug}?error=google_auth_failed`, request.url));
  }
}