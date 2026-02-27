export async function sendWhatsAppNotification(
    to: string, 
    templateType: string, 
    variables: any
) {
    // 1. Formatear el número (Limpiar espacios, guiones, y asegurar que empiece con código de país)
    const cleanNumber = to.replace(/\D/g, ''); 
    
    // Aquí es donde iría la petición a la API de Meta que probaste en el "Hola Mundo".
    // Por ahora, ponemos un console.log para verificar que la lógica funciona 
    // antes de conectarlo con Meta definitivamente.
    
    console.log(`[WHATSAPP SIMULADO] Enviando a ${cleanNumber}...`);
    console.log(`[WHATSAPP SIMULADO] Tipo: ${templateType}`);
    console.log(`[WHATSAPP SIMULADO] Datos:`, variables);

    // Retornamos true simulando éxito
    return { success: true };
}