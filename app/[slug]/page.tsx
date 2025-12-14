import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server"; // Asegúrate de que esta importación sea la correcta para tu server component
import DashboardCliente from "./DashboardCliente";
import DashboardAgencia from "./DashboardAgencia";
import Link from "next/link";
import { LogOut } from "lucide-react";

// Componente visual para cuando un usuario entra al dashboard equivocado
function AccessDenied() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <LogOut size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Acceso Restringido</h1>
        <p className="text-slate-500 mb-8">
            Has iniciado sesión, pero no tienes permisos para ver este panel. Es posible que estés intentando acceder a la cuenta de otro negocio o agencia.
        </p>
        {/* Este formulario asegura un cierre de sesión limpio usando las rutas de Next.js/Supabase si las tienes configuradas, o simplemente redirige */}
        <Link 
            href="/login" 
            className="block w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl"
        >
            Cambiar de Cuenta
        </Link>
      </div>
    </div>
  );
}

export default async function DashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient();
  const { slug } = await params;
  
  // 1. Verificar usuario real (getUser es seguro en servidor)
  const { data: { user } } = await supabase.auth.getUser();

  // Si no hay usuario logueado, mandamos al login
  if (!user) {
    redirect("/login");
  }

  // 2. CASO A: ¿El slug pertenece a un NEGOCIO (Cliente)?
  const { data: negocio } = await supabase
    .from("negocios")
    .select("user_id, slug") // Solo traemos lo necesario
    .eq("slug", slug)
    .single();

  if (negocio) {
    // Verificación de seguridad: ¿El usuario logueado es el dueño?
    if (negocio.user_id !== user.id) {
        return <AccessDenied />;
    }
    return <DashboardCliente />;
  }

  // 3. CASO B: ¿El slug pertenece a una AGENCIA (Admin)?
  const { data: agencia } = await supabase
    .from("agencies")
    .select("user_id, slug")
    .eq("slug", slug)
    .single();

  if (agencia) {
     // Verificación de seguridad: ¿El usuario logueado es el dueño?
     if (agencia.user_id !== user.id) {
        return <AccessDenied />;
    }
    return <DashboardAgencia />;
  }

  // 4. Si el slug no existe en ninguna tabla -> Error 404
  return notFound();
}