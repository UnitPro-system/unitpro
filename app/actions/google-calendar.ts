"use server";

import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

// CONFIGURACIÓN DE ZONA HORARIA (Argentina)
const TIMEZONE = "America/Argentina/Buenos_Aires";
const OFFSET = "-03:00"; // Ajuste manual para la fecha ISO

export async function getAvailability(slug: string, dateStr: string) {
  try {
    const { data: negocio } = await supabase.from("negocios").select("*").eq("slug", slug).single();
    if (!negocio?.google_calendar_connected) return { error: "Negocio no conectado a Google" };

    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: negocio.google_refresh_token, access_token: negocio.google_access_token });

    // Definir rango del día CON ZONA HORARIA CORRECTA
    // Forzamos el inicio y fin del día en hora Argentina
    const timeMin = `${dateStr}T00:00:00${OFFSET}`;
    const timeMax = `${dateStr}T23:59:59${OFFSET}`;

    const calendar = google.calendar({ version: "v3", auth });
    
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: timeMin,
      timeMax: timeMax,
      timeZone: TIMEZONE, // Importante para que Google entienda
      singleEvents: true,
      orderBy: "startTime",
    });

    const busySlots = response.data.items?.map(event => ({
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date
    })) || [];

    return { success: true, busySlots };

  } catch (error: any) {
    console.error("Error fetching availability:", error);
    return { success: false, error: error.message };
  }
}

export async function createAppointment(slug: string, bookingData: any) {
  try {
    const { service, date, time, clientName, clientPhone, clientEmail } = bookingData;
    
    const { data: negocio } = await supabase.from("negocios").select("*").eq("slug", slug).single();
    
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: negocio.google_refresh_token });
    const calendar = google.calendar({ version: "v3", auth });

    // 1. CONSTRUCCIÓN ROBUSTA DE LA FECHA (Con Offset Argentina)
    // Formato final esperado: "2023-12-21T09:00:00-03:00"
    const startDateTimeISO = `${date}T${time}:00${OFFSET}`;
    
    // Calculamos el fin sumando 1 hora (manualmente para no depender de objetos Date del servidor)
    const [hours, minutes] = time.split(':').map(Number);
    const endHour = hours + 1;
    // Formateamos para asegurar dos dígitos (ej: 9 -> 09)
    const endHourStr = endHour.toString().padStart(2, '0');
    const minutesStr = minutes.toString().padStart(2, '0');
    
    const endDateTimeISO = `${date}T${endHourStr}:${minutesStr}:00${OFFSET}`;

    const googleEvent = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: `Turno: ${clientName} (${service})`,
        description: `Servicio: ${service}\nCliente: ${clientName}\nTel: ${clientPhone}\nEmail: ${clientEmail}`,
        start: { 
            dateTime: startDateTimeISO,
            timeZone: TIMEZONE 
        },
        end: { 
            dateTime: endDateTimeISO,
            timeZone: TIMEZONE
        },
      }
    });

    // Guardar en Supabase (Usamos la respuesta de Google para asegurar consistencia)
    const { error: dbError } = await supabase.from("turnos").insert({
      negocio_id: negocio.id,
      cliente_nombre: clientName,
      cliente_email: clientEmail,
      servicio: service,
      fecha_inicio: startDateTimeISO, // Guardamos con el offset para que el Dashboard lo lea bien
      fecha_fin: endDateTimeISO,
      google_event_id: googleEvent.data.id,
      estado: "confirmado"
    });

    // Crear Lead
    await supabase.from("leads").insert({
        negocio_id: negocio.id,
        nombre_cliente: clientName,
        telefono_cliente: clientPhone,
        estado: "cliente"
    });

    if (dbError) throw dbError;
    return { 
        success: true, 
        eventLink: googleEvent.data.htmlLink // <--- ESTO ES NUEVO
    };

  } catch (error: any) {
    console.error("Error creating appointment:", error);
    return { success: false, error: error.message };
  }
}