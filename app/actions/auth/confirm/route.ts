import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  
  // 1. Capturamos el código que envía Supabase
  const code = searchParams.get('code')
  // "next" es a donde irás después de loguearte (ej: /recover-password/reset)
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()

    // 2. Intercambiamos el código temporal por una sesión de usuario real
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // ÉXITO: Redirigimos al usuario a la página 'next' con la sesión ya activa
      const forwardedUrl = new URL(next, origin)
      return NextResponse.redirect(forwardedUrl)
    }
  }

  // 3. ERROR: Si no hay código o falló el intercambio
  // Usamos searchParams.set para evitar el error 404 por mala sintaxis de URL
  const errorUrl = new URL('/login', origin)
  errorUrl.searchParams.set('error', 'Enlace inválido o expirado')
  
  return NextResponse.redirect(errorUrl)
}