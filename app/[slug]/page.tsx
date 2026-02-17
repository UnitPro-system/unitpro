import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import LandingCliente from "./LandingCliente";
import LandingAgencia from "./LandingAgencia";
import { Metadata, ResolvingMetadata } from "next";

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
async function getNegocioData(slug: string) {
  const supabase = await createClient();
  const domainOrSlug = decodeURIComponent(slug).toLowerCase();

  // 1. Buscar por dominio personalizado
  if (domainOrSlug.includes(".")) {
    const { data } = await supabase.from("negocios").select("*").eq("custom_domain", domainOrSlug).single();
    return data;
  }

  // 2. Buscar por slug
  const { data } = await supabase.from("negocios").select("*").eq("slug", domainOrSlug).single();
  return data;
}


export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const negocio = await getNegocioData(slug); // Asegúrate de que esta función traiga '*' o 'web_config'

  // Valores por defecto
  const previousImages = (await parent).openGraph?.images || [];
  
  if (!negocio) {
    return {
      title: "Negocio no encontrado",
    };
  }

  // --- CORRECCIÓN AQUÍ: Usar 'web_config' en lugar de 'config' ---
  const config = negocio.config_web || {}; 
  const meta = config.metadata || {};
  
  const siteName = meta.title || negocio.nombre || "Mi Negocio";
  const favicon = meta.faviconUrl || "/favicon.ico"; 

  return {
    title: siteName,
    description: meta.description || `Bienvenido a ${siteName}`,
    icons: {
      icon: favicon, 
      shortcut: favicon,
    },
    openGraph: {
      title: siteName,
      // Corrección aquí también para la imagen de redes sociales
      images: [config.hero?.imagenUrl || "", ...previousImages], 
    },
  };
}

