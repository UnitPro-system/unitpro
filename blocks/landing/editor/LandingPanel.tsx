"use client";
// blocks/landing/editor/LandingPanel.tsx
// Paneles: Identidad + Apariencia + Portada (Hero)
// Siempre visibles — landing está siempre activo.

import { ImageUpload } from "@/components/ui/ImageUpload";
import type { BlockEditorProps } from "@/types/blocks";
import { GOOGLE_FONTS } from "@/lib/fonts";
import { useState } from "react";
import { PlusCircle, FileText, Image, Trash2, X } from "lucide-react";

const PRIMARY = "#577a2c";

// ─── Helpers UI ───────────────────────────────────────────────────────────────
function SectionHeader({ title, color = "zinc" }: { title: string; color?: string }) {
  const dot: Record<string, string> = {
    zinc: "bg-zinc-400", indigo: "bg-indigo-500", emerald: "bg-emerald-500",
    purple: "bg-purple-500", orange: "bg-orange-500",
  };
  return (
    <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 mb-4">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dot[color] ?? dot.zinc}`} />
      <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">{title}</h3>
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">{children}</label>;
}
function Input({ value, onChange, placeholder, type = "text" }: any) {
  return (
    <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none" />
  );
}
function Textarea({ value, onChange, rows = 3, placeholder }: any) {
  return (
    <textarea rows={rows} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none resize-none" />
  );
}
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? "bg-[#577a2c]" : "bg-zinc-300"}`}>
      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${value ? "translate-x-5" : "translate-x-1"}`} />
    </button>
  );
}
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between p-2 border border-zinc-200 rounded-lg bg-zinc-50">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-zinc-400 font-mono uppercase">{value}</span>
        <input type="color" value={value || "#000000"} onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" />
      </div>
    </div>
  );
}

// ─── Panel principal ──────────────────────────────────────────────────────────
export default function LandingPanel({ config, updateConfig, updateConfigRoot }: BlockEditorProps) {
  const hero       = config.hero       || {};
  const colors     = config.colors     || {};
  const appearance = config.appearance || {};

  const customSections = config.customSections || [];
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  const addSection = (type: 'about' | 'gallery') => {
    const newId = Math.random().toString(36).substring(2, 11);
    let newSection: any = { id: newId, type };

    if (type === 'about') {
      newSection = { ...newSection, titulo: "Sobre Nosotros", texto: "Escribe aquí tu historia...", imagenUrl: "" };
    } else if (type === 'gallery') {
      newSection = { ...newSection, titulo: "Nuestros Trabajos", imagenes: [] };
    }

    const currentOrder = config.sectionOrder || [];
    updateConfigRoot("customSections", [...customSections, newSection]);
    updateConfigRoot("sectionOrder", [...currentOrder, newId]);
    setIsAddMenuOpen(false);
  };

  const removeSection = (id: string) => {
    if (!window.confirm("¿Borrar esta sección?")) return;
    const newSections = customSections.filter((s: any) => s.id !== id);
    const newOrder = (config.sectionOrder || []).filter((item: string) => item !== id);
    updateConfigRoot("customSections", newSections);
    updateConfigRoot("sectionOrder", newOrder);
  };

  const updateCustomSection = (id: string, field: string, value: any) => {
    const newSections = customSections.map((s: any) => s.id === id ? { ...s, [field]: value } : s);
    updateConfigRoot("customSections", newSections);
  };

  return (
    <div className="space-y-8">

      {/* ── Identidad ──────────────────────────────────────────────────── */}
      <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
        <SectionHeader title="Identidad" color="orange" />
        <ImageUpload
          label="Logo"
          value={config.logoUrl}
          onChange={url => updateConfigRoot("logoUrl", url)}
        />
      </section>

      {/* ── Apariencia ─────────────────────────────────────────────────── */}
      <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
        <SectionHeader title="Apariencia" color="purple" />

        <div className="space-y-2">
          <Label>Paleta de colores</Label>
          <ColorRow label="Principal" value={colors.primary || "#000000"}
            onChange={v => updateConfig("colors", "primary", v)} />
          <ColorRow label="Fondo / Secundario" value={colors.secondary || "#f3f4f6"}
            onChange={v => updateConfig("colors", "secondary", v)} />
          <ColorRow label="Texto" value={colors.text || "#1f2937"}
            onChange={v => updateConfig("colors", "text", v)} />
        </div>

        <div>
          <Label>Tipografía</Label>
          <select 
            value={appearance.font || "Inter"} 
            onChange={e => updateConfig("appearance", "font", e.target.value)}
            className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white outline-none"
          >
            {GOOGLE_FONTS.map((group) => (
              <optgroup key={group.category} label={group.category} className="font-bold text-zinc-400 italic bg-zinc-50">
                {group.fonts.map((fontName) => (
                  <option 
                    key={fontName} 
                    value={fontName} 
                    style={{ fontFamily: `"${fontName}", sans-serif` }}
                    className="text-zinc-800 font-normal not-italic bg-white"
                  >
                    {fontName}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <Label>Bordes</Label>
          <div className="flex gap-2">
            {[["none","Recto"],["medium","Redondeado"],["full","Circular"]].map(([val, label]) => (
              <button key={val} onClick={() => updateConfig("appearance", "radius", val)}
                className={`flex-1 py-2 text-xs border rounded-lg transition-all font-medium ${appearance.radius === val ? "border-[#577a2c] bg-[#577a2c]/5 text-[#577a2c] font-bold" : "bg-white text-zinc-500"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Portada (Hero) ─────────────────────────────────────────────── */}
      <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">Portada</h3>
          </div>
          <Toggle value={!!hero.mostrar} onChange={v => updateConfig("hero", "mostrar", v)} />
        </div>

        {hero.mostrar !== false && (
          <div className="space-y-4 animate-in fade-in">
            {/* Layout */}
            <div>
              <Label>Diseño</Label>
              <div className="flex gap-2">
                {[["split","Dividido"],["full","Cinemático"]].map(([val, label]) => (
                  <button key={val} onClick={() => updateConfig("hero", "layout", val)}
                    className={`flex-1 py-2 text-xs border rounded-lg transition-all font-medium ${(hero.layout || "split") === val ? "border-[#577a2c] bg-[#577a2c]/5 text-[#577a2c] font-bold" : "bg-white text-zinc-500"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {hero.layout === "full" && (
              <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Efecto Parallax</Label>
                  <Toggle value={!!hero.parallax} onChange={v => updateConfig("hero", "parallax", v)} />
                </div>
                <div>
                  <Label>Oscuridad de overlay ({hero.overlayOpacity ?? 50}%)</Label>
                  <input type="range" min="0" max="90" value={hero.overlayOpacity ?? 50}
                    onChange={e => updateConfig("hero", "overlayOpacity", Number(e.target.value))}
                    className="w-full accent-[#577a2c]" />
                </div>
              </div>
            )}

            <div>
              <Label>Título principal</Label>
              <Input value={hero.titulo} onChange={(v: string) => updateConfig("hero", "titulo", v)}
                placeholder="Tu nombre o negocio" />
            </div>
            <div>
              <Label>Descripción breve</Label>
              <Textarea value={hero.subtitulo} onChange={(v: string) => updateConfig("hero", "subtitulo", v)}
                placeholder="Una frase que describa lo que hacés" />
            </div>
            <div>
              <Label>Texto del botón CTA</Label>
              <Input value={hero.ctaTexto} onChange={(v: string) => updateConfig("hero", "ctaTexto", v)}
                placeholder="Reservar Turno" />
            </div>
            <ImageUpload
              label="Imagen de fondo"
              value={hero.imagenUrl}
              onChange={url => updateConfig("hero", "imagenUrl", url)}
            />
          </div>
        )}
      </section>
      <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
        <SectionHeader title="Secciones Extra" color="emerald" />
        
        {customSections.map((section: any) => (
          <div key={section.id} className="p-4 border border-zinc-200 rounded-lg bg-zinc-50 relative group mb-4">
            <button 
              onClick={() => removeSection(section.id)} 
              className="absolute top-2 right-2 p-1 text-zinc-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>

            {/* Render: Quiénes Somos */}
            {section.type === 'about' && (
              <div className="space-y-3 pr-6">
                <div className="flex items-center gap-2 mb-2 text-blue-600">
                  <FileText size={16} /> <span className="text-xs font-bold uppercase">Quiénes Somos</span>
                </div>
                <div>
                  <Label>Título</Label>
                  <Input 
                    value={section.titulo} 
                    onChange={(v: string) => updateCustomSection(section.id, 'titulo', v)} 
                  />
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Textarea 
                    rows={4}
                    value={section.texto} 
                    onChange={(v: string) => updateCustomSection(section.id, 'texto', v)} 
                  />
                </div>
                <ImageUpload 
                  label="Imagen (Opcional)" 
                  value={section.imagenUrl} 
                  onChange={(url) => updateCustomSection(section.id, 'imagenUrl', url)} 
                />
              </div>
            )}

            {/* Render: Galería */}
            {section.type === 'gallery' && (
              <div className="space-y-3 pr-6">
                <div className="flex items-center gap-2 mb-2 text-purple-600">
                  <Image size={16} /> <span className="text-xs font-bold uppercase">Galería</span>
                </div>
                <Input 
                  value={section.titulo} 
                  onChange={(v: string) => updateCustomSection(section.id, 'titulo', v)} 
                  placeholder="Título de la galería"
                />
                
                <div className="space-y-2 mt-2">
                  {section.imagenes?.map((img: any, i: number) => (
                    <div key={i} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-zinc-200">
                      <img src={img.url} className="w-10 h-10 rounded object-cover bg-zinc-200" alt="" />
                      <input 
                        value={img.descripcion || ''} 
                        onChange={(e) => {
                          const newImages = [...section.imagenes];
                          newImages[i].descripcion = e.target.value;
                          updateCustomSection(section.id, 'imagenes', newImages);
                        }}
                        className="flex-1 p-1 bg-transparent text-xs outline-none border-b border-transparent focus:border-zinc-300"
                        placeholder="Descripción opcional..."
                      />
                      <button 
                        onClick={() => {
                          const newImages = section.imagenes.filter((_:any, idx:number) => idx !== i);
                          updateCustomSection(section.id, 'imagenes', newImages);
                        }}
                        className="text-zinc-400 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <ImageUpload 
                    label="Agregar Imagen a Galería" 
                    value="" 
                    onChange={(url) => {
                      const newImages = [...(section.imagenes || []), { url, descripcion: "" }];
                      updateCustomSection(section.id, 'imagenes', newImages);
                    }} 
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Botón Añadir Sección Extra */}
        <div className="relative pt-2">
          <button 
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-500 font-bold text-sm hover:border-[#577a2c] hover:text-[#577a2c] hover:bg-[#577a2c]/5 transition-all flex items-center justify-center gap-2"
          >
            <PlusCircle size={18}/> Añadir Sección Extra
          </button>

          {isAddMenuOpen && (
            <div className="absolute bottom-full left-0 w-full mb-2 bg-white border border-zinc-200 shadow-xl rounded-xl overflow-hidden z-20 animate-in fade-in slide-in-from-bottom-2">
              <button onClick={() => addSection('about')} className="w-full text-left px-4 py-3 hover:bg-zinc-50 flex items-center gap-3 text-sm font-medium text-zinc-700">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FileText size={16}/></div>
                Quiénes Somos (Texto + Foto)
              </button>
              <button onClick={() => addSection('gallery')} className="w-full text-left px-4 py-3 hover:bg-zinc-50 flex items-center gap-3 text-sm font-medium text-zinc-700 border-t border-zinc-100">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Image size={16}/></div>
                Galería de Imágenes
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}