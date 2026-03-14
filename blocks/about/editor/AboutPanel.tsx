"use client";
import { ImageUpload } from "@/components/ui/ImageUpload";
import type { BlockEditorProps } from "@/types/blocks";
import { FileText } from "lucide-react";

export default function AboutPanel({ config, updateConfigRoot }: BlockEditorProps) {
  const about = config.about || { mostrar: true, titulo: "Sobre Nosotros", texto: "", imagenUrl: "" };

  const updateAbout = (field: string, value: any) => {
    updateConfigRoot("about", { ...about, [field]: value });
  };

  return (
    <div className="space-y-6">
      <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
          <FileText size={16} className="text-blue-500" />
          <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">
            Quiénes Somos
          </h3>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-600">Mostrar sección</span>
          <button onClick={() => updateAbout("mostrar", !about.mostrar)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${about.mostrar !== false ? "bg-[#577a2c]" : "bg-zinc-300"}`}>
            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${about.mostrar !== false ? "translate-x-5" : "translate-x-1"}`} />
          </button>
        </div>

        {about.mostrar !== false && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">Título</label>
              <input type="text" value={about.titulo} onChange={e => updateAbout("titulo", e.target.value)}
                className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">Historia / Descripción</label>
              <textarea rows={6} value={about.texto} onChange={e => updateAbout("texto", e.target.value)}
                className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none resize-none leading-relaxed" />
            </div>
            <ImageUpload label="Imagen Representativa" value={about.imagenUrl} onChange={url => updateAbout("imagenUrl", url)} />
          </div>
        )}
      </section>
    </div>
  );
}