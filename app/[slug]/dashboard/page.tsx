import { createClient } from "@/lib/supabase";
import { cookies } from "next/headers";
import DashboardAgencia from "./DashboardAgencia";
import DashboardCliente from "./DashboardCliente";

export default async function DashboardPage({ params }: { params: { slug: string } }) {
  const cookieStore = cookies();
  const supabase = createClient();

  console.log("--- DEBUG START ---");
  console.log("1. Buscando SLUG:", params.slug);

  // 1. Buscamos si es AGENCIA
  const { data: agencia, error: errorAgencia } = await supabase
    .from("agencies")
    .select("*") // Traemos todo para ver si carga
    .eq("slug", params.slug)
    .single();

  if (errorAgencia && errorAgencia.code !== 'PGRST116') {
      console.error("Error buscando Agencia:", errorAgencia);
  }

  if (agencia) {
    console.log("2. ¡ENCONTRADO! Es una Agencia:", agencia.name);
    return <DashboardAgencia />;
  }

  // 2. Buscamos si es NEGOCIO
  const { data: negocio, error: errorNegocio } = await supabase
    .from("negocios")
    .select("*") // Traemos todo
    .eq("slug", params.slug)
    .single();

  if (errorNegocio && errorNegocio.code !== 'PGRST116') {
      console.error("Error buscando Negocio:", errorNegocio);
  }

  if (negocio) {
    console.log("2. ¡ENCONTRADO! Es un Negocio:", negocio.nombre);
    return <DashboardCliente />;
  }

  console.log("3. Resultado: NO SE ENCONTRÓ NADA en ninguna tabla.");
  console.log("--- DEBUG END ---");

  // 3. 404
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans">
        <h1 className="text-6xl font-bold mb-4 text-indigo-500">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Cuenta no encontrada</h2>
        <div className="bg-slate-800 p-6 rounded-lg max-w-lg text-left font-mono text-sm space-y-2 border border-slate-700">
            <p className="text-slate-400">Diagnóstico:</p>
            <p>Slug buscado: <span className="text-yellow-400">"{params.slug}"</span></p>
            <p>Búsqueda en Agencias: <span className={agencia ? "text-green-400" : "text-red-400"}>{agencia ? "ENCONTRADO" : "NULL"}</span></p>
            <p>Búsqueda en Negocios: <span className={negocio ? "text-green-400" : "text-red-400"}>{negocio ? "ENCONTRADO" : "NULL"}</span></p>
            <hr className="border-slate-600 my-2"/>
            <p className="text-xs text-slate-500">
                Si estás seguro de que existe, verifica que hayas ejecutado el comando SQL 
                <code>DISABLE ROW LEVEL SECURITY</code> en Supabase.
            </p>
        </div>
        <a href="/" className="mt-8 px-6 py-3 bg-indigo-600 rounded-full hover:bg-indigo-500 transition font-bold">Volver al Inicio</a>
    </div>
  );
}