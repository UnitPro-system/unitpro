import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) return NextResponse.json({ error: "Falta el slug" }, { status: 400 });

  const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:3000/api/google/callback" // <--- Ponlo así tal cual, entre comillas
);

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar", 
      "https://www.googleapis.com/auth/userinfo.email"
    ],
    state: slug, // Guardamos el slug para saber a dónde volver
    prompt: "consent"
  });

  return NextResponse.redirect(url);
}

