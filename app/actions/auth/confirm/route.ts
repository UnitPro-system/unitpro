import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // 1. Si existe un código, usamos el flujo PKCE para intercambiarlo por una sesión
  if (code) {
    const supabase = await createClient()

    // Este paso es crucial: intercambia el código de un solo uso por una sesión activa
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Si el intercambio es exitoso, redirigimos a la página de destino (ej: /recover-password/reset)
      const redirectTo = new URL(next, origin)
      return NextResponse.redirect(redirectTo)
    }
  }

  // 2. Si no hay código o hubo un error en el intercambio, enviamos al usuario a una página de error
  // Es importante no intentar procesar el link dos veces porque el código expira tras el primer intento
  const errorRedirect = new URL('/login?error=Invalid or expired token', origin)
  return NextResponse.redirect(errorRedirect)
}