import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { unstable_cache } from "next/cache";
import LandingCliente from "./LandingCliente";

// CONFIGURACIÓN DE CACHÉ
// Revalida la caché cada 3600 segundos (1 hora).
// Si un cliente actualiza su web, tardará máximo 1 hora en verse,
// O puedes forzar la revalidación con revalidateTag (más avanzado).
const GET_CACHED_NEGOCIO = async (slug: string) => {
  const getNegocio = unstable_cache(
    async () => {
      const supabase = await createClient();
      const { data } = await supabase
        .from("negocios")
        .select("*")
        .eq("slug", slug)
        .single();
      return data;
    },
    [`negocio-${slug}`], // Key única para la caché
    { revalidate: 3600, tags: [`negocio-${slug}`] }
  );

  return getNegocio();
};

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const negocio = await GET_CACHED_NEGOCIO(params.slug);
  return {
    title: negocio?.nombre || "Negocio no encontrado",
    description: negocio?.mensaje_bienvenida || "Bienvenido a nuestra web",
  };
}

export default async function Page({ params }: { params: { slug: string } }) {
  // 1. Fetch de datos en el SERVIDOR (rápido y cacheado)
  const negocio = await GET_CACHED_NEGOCIO(params.slug);

  if (!negocio) {
    return notFound();
  }

  // 2. Pasamos los datos listos al componente cliente
  // Ya no necesita hacer fetch, solo renderizar.
  return <LandingCliente initialData={negocio} />;
}