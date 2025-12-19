import { createClient } from "@/lib/supabase";
import { cookies } from "next/headers";
import DashboardAgencia from "./DashboardAgencia";
import DashboardCliente from "./DashboardCliente";

// CORRECCIÓN NEXT.JS 15: Definimos params como una Promesa
export default async function DashboardPage(props: { params: Promise<{ slug: string }> }) {
  
  // 1. ESPERAMOS LOS PARÁMETROS (Esto arregla el error del slug vacío)
  const params = await props.params; 
  const slug = params.slug;

  // 2. Esperamos las cookies para conectar a Supabase
  const cookieStore = await cookies();
  const supabase = createClient();

  console.log("--- ROUTER SERVER ---");
  console.log("Buscando acceso a:", slug);

  // 3. ¿Es una AGENCIA?
  // Buscamos solo por slug. Si existe, cargamos el dashboard.
  // (La seguridad de "Email vs Email" se ejecuta dentro del componente DashboardAgencia)
  const { data: agencia } = await supabase
    .from("agencies")
    .select("id")
    .eq("slug", slug)
    .single();

  if (agencia) {
    return <DashboardAgencia />;
  }

  // 4. ¿Es un NEGOCIO (Cliente)?
  const { data: negocio } = await supabase
    .from("negocios")
    .select("id")
    .eq("slug", slug)
    .single();

  if (negocio) {
    return <DashboardCliente />;
  }

  // 5. Si no existe nada con ese nombre -> 404
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans">
        <h1 className="text-6xl font-bold mb-4 text-indigo-500">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Cuenta no encontrada</h2>
        <div className="bg-slate-800 p-6 rounded-lg max-w-lg text-left font-mono text-sm space-y-2 border border-slate-700">
            <p className="text-slate-400">Diagnóstico:</p>
            {/* Aquí ahora verás el nombre correcto gracias al await */}
            <p>Slug buscado: <span className="text-yellow-400">"{slug}"</span></p> 
            <p>Estado: No existe ninguna Agencia ni Negocio con este enlace.</p>
        </div>
        <a href="/" className="mt-8 px-6 py-3 bg-indigo-600 rounded-full hover:bg-indigo-500 transition font-bold">Volver al Inicio</a>
    </div>
  );
}