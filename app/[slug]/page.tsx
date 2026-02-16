import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import LandingCliente from "./LandingCliente";
import LandingAgencia from "./LandingAgencia";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient();
  const { slug } = await params;
  
  const domainOrSlug = decodeURIComponent(slug).toLowerCase();
  // 1. INTENTO A: Buscar en tabla de NEGOCIOS (Clientes finales)
  // Si encontramos el slug aquí, mostramos la web del negocio
  if (domainOrSlug.includes(".")) {
    // Buscamos específicamente en la columna 'custom_domain'
    const { data: negocioDominio } = await supabase
      .from("negocios")
      .select("*")
      .eq("custom_domain", domainOrSlug)
      .single();

    if (negocioDominio) {
      // ¡Éxito! Renderizamos la web del cliente bajo su propio dominio
      return <LandingCliente initialData={negocioDominio} />;
    }
    
    // Si parece un dominio pero no lo encontramos en la DB, es un 404 directo.
    return notFound();
  }

  // --------------------------------------------------------------------------------
  // 2. ESTRATEGIA SLUG INTERNO (Comportamiento Original)
  // --------------------------------------------------------------------------------

  // INTENTO A: Buscar en tabla de NEGOCIOS (Clientes finales por slug interno)
  const { data: negocioSlug } = await supabase
    .from("negocios")
    .select("*")
    .eq("slug", domainOrSlug)
    .single();

  if (negocioSlug) {
    return <LandingCliente initialData={negocioSlug} />;
  }

  // 2. INTENTO B: Buscar en tabla de AGENCIAS (Tu SaaS)
  // Si encontramos el slug aquí, mostramos la web de la agencia
  const { data: agencia } = await supabase
    .from("agencies")
    .select("*")
    .eq("slug", domainOrSlug)
    .single();

  if (agencia) {
    // Renderizamos la Landing Pública de la agencia
    return <LandingAgencia initialData={agencia} />;
  }

  // 3. No existe en ningún lado -> Error 404
  return notFound();
}