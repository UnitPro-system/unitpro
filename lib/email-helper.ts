import { WebConfig } from "@/types/web-config";

export function compileEmailTemplate(
  templateName: 'confirmation' | 'reminder',
  config: WebConfig | null,
  data: {
    cliente: string;
    servicio: string;
    fecha: string;
    profesional?: string;
  }
) {
  // 1. Defaults (Fallback si no configuraron nada)
  const defaults = {
    confirmation: {
      subject: "Confirmación de Turno: {{servicio}}",
      body: "<p>Hola {{cliente}},</p><p>Tu turno para <strong>{{servicio}}</strong> ha sido confirmado para el {{fecha}}.</p><p>¡Te esperamos!</p>"
    },
    reminder: {
      subject: "Recordatorio: Turno mañana para {{servicio}}",
      body: "<p>Hola {{cliente}},</p><p>Te recordamos que tienes un turno mañana: {{fecha}}.</p>"
    }
  };

  // 2. Obtener template (Custom o Default)
  const custom = config?.notifications?.[templateName];
  let subject = custom?.enabled && custom?.subject ? custom.subject : defaults[templateName].subject;
  let body = custom?.enabled && custom?.body ? custom.body : defaults[templateName].body;
  const banner = custom?.bannerUrl;

  // 3. Reemplazar variables
  const replaceVars = (text: string) => {
    return text
      .replace(/{{cliente}}/g, data.cliente)
      .replace(/{{servicio}}/g, data.servicio)
      .replace(/{{fecha}}/g, data.fecha)
      .replace(/{{profesional}}/g, data.profesional || 'el profesional');
  };

  subject = replaceVars(subject);
  body = replaceVars(body);

  // 4. Armar HTML Final (Con banner si existe)
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      ${banner ? `<img src="${banner}" style="width: 100%; border-radius: 8px 8px 0 0; margin-bottom: 20px;" alt="Banner" />` : ''}
      <div style="color: #333; line-height: 1.6;">
        ${body}
      </div>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <small style="color: #888;">Este es un mensaje automático.</small>
    </div>
  `;

  return { subject, html };
}