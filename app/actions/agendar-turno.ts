"use server";

import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";

// Configuración de Supabase Admin (para leer tokens seguros)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Usa la Service Role Key aquí por seguridad
);

export async function agendarTurno(slugNegocio: string, datosCliente: any, fechaHoraIso: string) {
  try {
    // 1. Buscar el negocio y sus tokens
    const { data: negocio } = await supabase
      .from("negocios")
      .select("*")
      .eq("slug", slugNegocio)
      .single();

    if (!negocio || !negocio.google_refresh_token) {
      return { success: false, error: "El negocio no tiene Google Calendar conectado." };
    }

    // 2. Configurar cliente de Google
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    auth.setCredentials({
      refresh_token: negocio.google_refresh_token,
      access_token: negocio.google_access_token // Opcional, Google lo refresca si expitó
    });

    const calendar = google.calendar({ version: "v3", auth });

    // 3. Crear el evento en Google Calendar
    // Duración por defecto: 1 hora (puedes parametrizarlo)
    const inicio = new Date(fechaHoraIso);
    const fin = new Date(inicio.getTime() + 60 * 60 * 1000); // +1 hora

    const eventoGoogle = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: `Turno: ${datosCliente.nombre}`,
        description: `Servicio solicitado desde la web.\nCliente: ${datosCliente.nombre}\nTel: ${datosCliente.telefono}`,
        start: { dateTime: inicio.toISOString() },
        end: { dateTime: fin.toISOString() },
      },
    });

    // 4. Guardar en Supabase (Espejo local)
    const { error: dbError } = await supabase.from("turnos").insert({
      negocio_id: negocio.id,
      cliente_nombre: datosCliente.nombre,
      cliente_email: datosCliente.email || "No especificado",
      fecha_inicio: inicio.toISOString(),
      fecha_fin: fin.toISOString(),
      google_event_id: eventoGoogle.data.id,
      estado: "confirmado"
    });

    if (dbError) console.error("Error guardando en DB:", dbError);

    return { success: true, eventId: eventoGoogle.data.id };

  } catch (error: any) {
    console.error("Error al agendar:", error);
    return { success: false, error: error.message };
  }
}