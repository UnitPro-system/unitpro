import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import DashboardCliente from "./DashboardCliente";
import DashboardAgencia from "./DashboardAgencia"; // Asegúrate de que este archivo exista

export default async function DashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient();
  const { slug } = await params;
  
  // 1. Verificar sesión (Seguridad básica)
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect("/login");
  }

  // 2. ¿Es un NEGOCIO?
  const { data: negocio } = await supabase
    .from("negocios")
    .select("*")
    .eq("slug", slug)
    .single();

  if (negocio) {
    // Verificación de seguridad extra: ¿El usuario logueado es el dueño?
    if (negocio.user_id !== session.user.id) {
        // Opcional: Redirigir o mostrar error si intenta ver un dashboard ajeno
        return <div className="p-10 text-center">No tienes permiso para ver este panel.</div>;
    }
    return <DashboardCliente />;
  }

  // 3. ¿Es una AGENCIA?
  const { data: agencia } = await supabase
    .from("agencies")
    .select("*")
    .eq("slug", slug)
    .single();

  if (agencia) {
     if (agencia.user_id !== session.user.id) {
        return <div className="p-10 text-center">No tienes permiso para ver este panel.</div>;
    }
    return <DashboardAgencia />;
  }

  // 4. Si no es nada -> 404
  return notFound();
}