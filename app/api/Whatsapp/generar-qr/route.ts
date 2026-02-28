import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { negocioId } = await request.json();
        
        // Cada peluquería tendrá su propia "sesión" llamada negocio_1, negocio_2, etc.
        const instanceName = `negocio_${negocioId}`;

        // Llamamos a tu servidor de Railway
        const response = await fetch(`${process.env.EVOLUTION_API_URL}/instance/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.EVOLUTION_API_KEY as string
            },
            body: JSON.stringify({
                instanceName: instanceName,
                qrcode: true, // Pedimos que devuelva el QR para escanear
                integration: "WHATSAPP-BAILEYS" // El motor interno que usa Evolution
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Error al crear la sesión en WhatsApp");
        }

        // Devolvemos la imagen del QR al frontend
        return NextResponse.json({ 
            success: true, 
            qrCodeBase64: data.qrcode.base64,
            instanceName: data.instance.instanceName
        });

    } catch (error: any) {
        console.error("Error generando QR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}