"use client";
import type { BlockSectionProps } from "@/types/blocks";

export default function AboutSection({ negocio, config: blockConfig }: BlockSectionProps) {
  const raw = negocio?.config_web || {};
  
  // Leemos del config root (donde guarda el editor) o del blockConfig
  const about = raw.about || blockConfig || {};

  if (about.mostrar === false) return null;

  const titulo = about.titulo || "Sobre Nosotros";
  const texto = about.texto || "";
  const imagenUrl = about.imagenUrl || "";
  const textColor = raw.colors?.text || "#18181b";
  const appearance = raw.appearance || {};
  const cardRadius = { none: "rounded-none", medium: "rounded-2xl", full: "rounded-[2.5rem]" }[appearance.radius as string] ?? "rounded-2xl";

  // Si no hay texto ni imagen, no mostramos el bloque vacío
  if (!texto && !imagenUrl) return null;

  return (
    <section id="about" className="py-24 px-6 max-w-7xl mx-auto">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className={imagenUrl ? 'order-1 md:order-none' : 'col-span-2 text-center max-w-3xl mx-auto'}>
          <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: textColor }}>
            {titulo}
          </h2>
          <div className="text-lg leading-relaxed whitespace-pre-line opacity-80" style={{ color: textColor }}>
            {texto}
          </div>
        </div>
        
        {imagenUrl && (
          <div className={`overflow-hidden shadow-xl h-[400px] md:order-none order-first ${cardRadius}`}>
            <img src={imagenUrl} alt={titulo} className="w-full h-full object-cover"/>
          </div>
        )}
      </div>
    </section>
  );
}