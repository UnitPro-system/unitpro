export async function sendWhatsAppNotification(
    to: string, 
    templateType: string, 
    variables: any,
    instanceName: string // <-- El nombre de la sesión (ej: negocio_1)
) {
    if (!instanceName) {
        console.warn("[WHATSAPP] No hay instancia configurada para este negocio.");
        return { success: false, error: "Instancia no configurada" };
    }

    const cleanNumber = to.replace(/\D/g, ''); 
    let mensaje = "";

    // Armamos el texto según el tipo de mensaje que nos pidan mandar
    switch (templateType) {
        case 'deposit':
            mensaje = `¡Hola *${variables.cliente}*! 👋\n\nRecibimos tu solicitud para *${variables.servicio}* el día ${variables.fecha}.\n\nPara confirmar el turno, te pedimos una seña de *${variables.monto_senia}*.\n\n🏦 *Datos para transferencia:*\nAlias: ${variables.alias}\n\nPor favor, envíanos el comprobante por este medio. ¡Muchas gracias!`;
            break;
        case 'confirmation':
            mensaje = `¡Hola *${variables.cliente}*! ✅\n\nTe confirmamos que tu turno para *${variables.servicio}* el día ${variables.fecha} ha sido agendado con éxito.\n\n¡Te esperamos!`;
            break;
        case 'reminder':
            mensaje = `¡Hola *${variables.cliente}*! ⏰\n\nTe recordamos que tienes un turno para *${variables.servicio}* mañana a las ${variables.fecha}.\n\nPor favor, si no puedes asistir avísanos con anticipación. ¡Nos vemos!`;
            break;
        default:
            mensaje = `Hola ${variables.cliente}, tienes una notificación de tu turno para ${variables.servicio}.`;
    }

    try {
        const apiUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
        const apiKey = process.env.EVOLUTION_API_KEY;

        // Llamamos a la API de Evolution en tu Railway
        const response = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey as string
            },
            body: JSON.stringify({
                number: cleanNumber,
                text: mensaje,
                delay: 1500 // Añade un efecto de "escribiendo..." de 1.5 segundos (hace que no te baneen por spam)
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Error al enviar mensaje");
        }

        console.log(`✅ [WHATSAPP ENVIADO] a ${cleanNumber} (${templateType})`);
        return { success: true };

    } catch (error: any) {
        console.error("❌ [ERROR WHATSAPP]:", error);
        return { success: false, error: error.message };
    }
}