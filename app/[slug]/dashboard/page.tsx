import { createClient } from "@/lib/supabase";
import { cookies } from "next/headers";
import DashboardAgencia from "./DashboardAgencia";
import DashboardCliente from "./DashboardCliente";

// CORRECCIÓN NEXT.JS 15: params es una Promesa
export default async function DashboardPage(props: { params: Promise<{ slug: string }> }) {
  
  // 1. AWAIT CRÍTICO: Soluciona el error de lectura del slug
  const params = await props.params; 
  const slug = params.slug;

  const cookieStore = await cookies();
  const supabase = createClient();

  console.log("--- ROUTER ---");
  console.log("Accediendo a:", slug);

  // 2. ¿Es una AGENCIA?
  const { data: agencia } = await supabase
    .from("agencies")
    .select("id")
    .eq("slug", slug)
    .single();

  if (agencia) {
    return <DashboardAgencia />;
  }

  // 3. ¿Es un NEGOCIO?
  const { data: negocio } = await supabase
    .from("negocios")
    .select("id")
    .eq("slug", slug)
    .single();

  if (negocio) {
    return <DashboardCliente />;
  }

  // 4. SI NO EXISTE -> 404
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans">
        <h1 className="text-6xl font-bold mb-4 text-indigo-500">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Cuenta no encontrada</h2>
        <div className="bg-slate-800 p-6 rounded-lg max-w-lg text-left font-mono text-sm space-y-2 border border-slate-700">
            <p className="text-slate-400">Diagnóstico:</p>
            {/* Aquí ahora verás el nombre correcto gracias al await */}
            <p>Slug buscado: <span className="text-yellow-400">"{slug}"</span></p> 
            <p>Resultado: No existe en la base de datos.</p>
        </div>
        <a href="/" className="mt-8 px-6 py-3 bg-indigo-600 rounded-full hover:bg-indigo-500 transition font-bold">Volver al Inicio</a>
    </div>
  );
}