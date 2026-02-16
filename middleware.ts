import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = request.nextUrl;

  let hostname = request.headers
    .get("host")!
    .replace(".localhost:3000", `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`);

  // Casos especiales para localhost en desarrollo
  if (hostname.includes("localhost:3000")) {
     hostname = hostname.replace("localhost:3000", process.env.NEXT_PUBLIC_ROOT_DOMAIN!);
  }

  const searchParams = request.nextUrl.searchParams.toString();
  // Obtenemos el path (ej: "/sobre-nosotros")
  const path = `${url.pathname}${
    searchParams.length > 0 ? `?${searchParams}` : ""
  }`;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()

  if (url.pathname.startsWith("/_next") || url.pathname.startsWith("/api") || url.pathname.startsWith("/static")) {
      return response;
  }

  // A) Si el hostname es TU dominio principal (ej: unitpro.com)
  // Permitimos la navegación normal (Landing page, Login, Dashboard del dueño del SaaS)
  if (hostname === process.env.NEXT_PUBLIC_ROOT_DOMAIN) {
    return response;
  }

  return NextResponse.rewrite(
    new URL(`/${hostname}${path}`, request.url)
  );
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth/confirm (supabase auth endpoints)
     */
    "/((?!_next/static|_next/image|favicon.ico|auth/confirm|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};