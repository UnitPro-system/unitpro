// lib/email-helper.ts
import { WebConfig } from "@/types/web-config";

export function compileEmailTemplate(
  templateName: 'confirmation' | 'reminder' | 'deposit',
  config: WebConfig | null,
  data: {
    cliente: string;
    servicio: string;
    fecha?: string;
    profesional?: string;
    // Variables para pagos/señas
    precio_total?: string;
    monto_senia?: string;
    link_pago?: string;
    precio_a_pagar?: string;
    alias?: string; 
    telefono_trabajador?: string;
  }
) {
  // 1. Defaults (Tus textos originales convertidos a plantillas)
  const defaults = {
    confirmation: {
      subject: "✅ Turno Confirmado: {{servicio}}",
      body: "<p>Hola <strong>{{cliente}}</strong>,</p><p>Tu turno para <strong>{{servicio}}</strong> ha sido CONFIRMADO correctamente.</p><p>¡Te esperamos!</p>"
    },
    reminder: {
      subject: "⏰ Recordatorio: Turno mañana",
      body: "<p>Hola <strong>{{cliente}}</strong>,</p><p>Te recordamos que tienes un turno mañana: {{fecha}} para {{servicio}}.</p>"
    },
    deposit: {
      subject: "📢 Falta Seña - Solicitud pre-aprobada",
      // El HTML por defecto imita tu diseño de tarjeta naranja
      body: `
        <p>Hola <strong>{{cliente}}</strong>,</p>
        <p>Tu solicitud para <strong>{{servicio}}</strong> ha sido pre-aprobada.</p>
        <p>⚠️ <strong>El horario NO está reservado aún.</strong> Se confirmará al recibir la seña.</p>
        <div style="background-color: #fff7ed; padding: 15px; border-radius: 8px; border: 1px solid #fdba74; margin: 20px 0;">
             <p style="margin: 0;">Total del Servicio: <strong>{{precio_total}}</strong></p>
             <p style="margin: 5px 0 0 0; color: #c2410c; font-size: 16px;">
                 <strong>Monto a Señar: {{monto_senia}}</strong>
             </p>
        </div>
        {{boton_pago}}
      `
    }
  };

  // 2. Seleccionar Configuración
  const custom = config?.notifications?.[templateName];
  // Si el usuario lo desactivó explícitamente, retornamos null
  if (custom && custom.enabled === false) return null;

  let subject = custom?.subject || defaults[templateName].subject;
  let body = custom?.body || defaults[templateName].body;
  const banner = custom?.bannerUrl;

  // 3. Lógica del Botón de Pago (Variable especial)
  let botonPagoHtml = "";
  if (data.link_pago) {
      botonPagoHtml = `<div style="margin-top:20px;"><a href="${data.link_pago}" style="background-color: #ea580c; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display:inline-block;">Pagar Seña</a></div>`;
  } else {
      botonPagoHtml = `<p><em>Por favor, responde este correo para coordinar el pago.</em></p>`;
  }

  // 4. Reemplazar Variables
  const replaceVars = (text: string) => {
    return text
      .replace(/{{cliente}}/g, data.cliente)
      .replace(/{{servicio}}/g, data.servicio)
      .replace(/{{fecha}}/g, data.fecha || '')
      .replace(/{{profesional}}/g, data.profesional || '')
      .replace(/{{precio_total}}/g, data.precio_total || '')
      .replace(/{{monto_senia}}/g, data.monto_senia || '')
      .replace(/{{link_pago}}/g, data.link_pago || '#')
      .replace(/{{precio_a_pagar}}/g, data.precio_a_pagar || '')
      .replace(/{{alias}}/g, data.alias || '')
      .replace(/{{telefono_trabajador}}/g, data.telefono_trabajador || '');
  };


  subject = replaceVars(subject);
  body = replaceVars(body);

  // 5. HTML Final
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      ${banner ? `<img src="${banner}" style="width: 100%; border-radius: 8px 8px 0 0; margin-bottom: 20px;" alt="Banner" />` : ''}
      <div style="color: #333; line-height: 1.6;">
        ${body}
      </div>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <small style="color: #888;">Mensaje automático de ${config?.logoUrl ? 'nuestro sistema' : 'la plataforma'}.</small>
    </div>
  `;

  return { subject, html };
}