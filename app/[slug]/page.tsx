import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import LandingCliente from "./LandingCliente";
import LandingAgencia from "./LandingAgencia";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient();
  const { slug } = await params;
  
  // 1. INTENTO A: Buscar en tabla de NEGOCIOS (Clientes finales)
  // Si encontramos el slug aquí, mostramos la web del negocio
  const { data: negocio } = await supabase
    .from("negocios")
    .select("*")
    .eq("slug", slug)
    .single();

  if (negocio) {
    // Renderizamos la Landing Pública del cliente
    return <LandingCliente initialData={negocio} />;
  }

  // 2. INTENTO B: Buscar en tabla de AGENCIAS (Tu SaaS)
  // Si encontramos el slug aquí, mostramos la web de la agencia
  const { data: agencia } = await supabase
    .from("agencies")
    .select("*")
    .eq("slug", slug)
    .single();

  if (agencia) {
    // Renderizamos la Landing Pública de la agencia
    return <LandingAgencia initialData={agencia} />;
  }

  // 3. No existe en ningún lado -> Error 404
  return notFound();
}