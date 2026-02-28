import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { negocioId } = await request.json();
        const instanceName = `negocio_${negocioId}`;
        
        const apiUrl = process.env.EVOLUTION_API_URL;
        const apiKey = process.env.EVOLUTION_API_KEY as string;

        if (!apiUrl || !apiKey) {
            throw new Error("Faltan configurar EVOLUTION_API_URL o EVOLUTION_API_KEY en Vercel.");
        }

        // 1. LIMPIEZA: Intentamos borrar la sesión si quedó trabada de un intento anterior
        try {
            await fetch(`${apiUrl}/instance/delete/${instanceName}`, {
                method: 'DELETE',
                headers: { 'apikey': apiKey }
            });
        } catch (e) {
            // Si falla al borrar no importa, seguimos adelante.
        }

        // 2. CREAR LA SESIÓN FRESCA
        const response = await fetch(`${apiUrl}/instance/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey
            },
            body: JSON.stringify({
                instanceName: instanceName,
                qrcode: true, 
                integration: "WHATSAPP-BAILEYS" 
            })
        });

        // Leemos la respuesta como texto para atrapar cualquier error
        const rawText = await response.text();
        let data;
        
        try {
            data = JSON.parse(rawText);
        } catch(e) {
            throw new Error(`Railway devolvió algo raro: ${rawText.substring(0, 60)}`);
        }

        if (!response.ok) {
            // ¡MAGIA! Devolvemos el error EXACTO de Railway al frontend
            throw new Error(data.message ? JSON.stringify(data.message) : JSON.stringify(data));
        }

        return NextResponse.json({ 
            success: true, 
            qrCodeBase64: data.qrcode?.base64 || data.qrcode,
            instanceName: data.instance?.instanceName || instanceName
        });

    } catch (error: any) {
        console.error("Error backend:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}