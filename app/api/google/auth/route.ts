import { NextResponse } from "next/server";
import { google } from "googleapis";

// Esta función se ejecuta cuando el frontend llama a /api/google/auth
export async function GET(request: Request) {
  // 1. Leemos el "slug" de la URL para saber qué negocio está intentando conectarse
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) return NextResponse.json({ error: "Falta el slug" }, { status: 400 });

  // 2. Configuramos el cliente de Google con tus claves secretas
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    // Esta URL debe ser IDÉNTICA a la que pusiste en Google Cloud Console
    process.env.NEXT_PUBLIC_APP_URL + "/api/google/callback" 
  );

  // 3. Generamos la URL segura de Google
  const url = oauth2Client.generateAuthUrl({
    // "offline" es CRÍTICO: le dice a Google "dame una llave que funcione aunque el usuario cierre la ventana"
    access_type: "offline", 
    // Qué permisos pedimos
    scope: [
      "https://www.googleapis.com/auth/calendar", 
      "https://www.googleapis.com/auth/userinfo.email"
    ],
    // "state" es un truco de seguridad: pasamos el slug aquí para recibirlo de vuelta cuando Google nos responda
    state: slug, 
    // Forzamos a que siempre pregunte permiso (útil para desarrollo)
    prompt: "consent"
  });

  // 4. Enviamos al usuario a esa URL de Google
  return NextResponse.redirect(url);
}