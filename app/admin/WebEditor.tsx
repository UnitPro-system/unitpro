"use client";
import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { Save, X, LayoutTemplate, Eye, EyeOff, Loader2, RefreshCw, Monitor, Smartphone, ExternalLink } from "lucide-react";
// Importamos el componente de subida de imágenes
import { ImageUpload } from "@/components/ui/ImageUpload";

// Configuración por defecto para evitar errores si está vacío
const DEFAULT_CONFIG = {
  template: "modern",
  colors: { primary: "#000000" },
  hero: { 
    titulo: "Tu Título Principal", 
    subtitulo: "Escribe aquí una descripción atractiva.", 
    ctaTexto: "Contactar", 
    mostrar: true 
  },
  beneficios: { 
    mostrar: true, 
    titulo: "Nuestros Servicios", 
    items: [
      { titulo: "Servicio 1", desc: "Descripción breve." },
      { titulo: "Servicio 2", desc: "Descripción breve." },
      { titulo: "Servicio 3", desc: "Descripción breve." }
    ]
  },
  testimonios: { mostrar: false, titulo: "Opiniones", items: [] },
  footer: { mostrar: true, textoCopyright: "Derechos reservados" }
};

export default function WebEditor({ negocio, onClose, onSave }: any) {
  const supabase = createClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Estado local de la configuración
  const [config, setConfig] = useState({
    ...DEFAULT_CONFIG,
    ...(negocio.config_web || {})
  });
  
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); 
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  // --- ⚡ COMUNICACIÓN EN TIEMPO REAL ---
  const sendUpdate = (newConfig: any) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "UPDATE_CONFIG", payload: newConfig },
        "*" 
      );
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    const { data, error } = await supabase
      .from("negocios")
      .update({ config_web: config })
      .eq("id", negocio.id)
      .select();

    if (error) {
      alert("Error técnico al guardar: " + error.message);
      setSaving(false);
      return;
    }

    if (!data || data.length === 0) {
      alert("⚠️ NO SE GUARDÓ: Error de permisos RLS.");
      setSaving(false);
      return;
    }

    setSaving(false);
    // setRefreshKey(prev => prev + 1); // Ya no necesitamos forzar recarga porque se ve en tiempo real
    if (onSave) onSave();
  };

  // Función unificada para actualizar campos
  const updateField = (section: string, field: string, value: any) => {
    setConfig((prev: any) => {
      let newConfig;
      
      // Caso especial: Campos en la raíz del JSON (como logoUrl)
      if (section === 'root') {
        newConfig = { ...prev, [field]: value };
      } else {
        // Caso normal: Campos anidados (ej: hero.titulo)
        newConfig = {
            ...prev,
            [section]: { ...prev[section], [field]: value }
        };
      }
      
      sendUpdate(newConfig); // Enviar al iframe
      return newConfig;
    });
  };

  const updateArrayItem = (section: string, index: number, field: string, value: string) => {
    setConfig((prev: any) => {
        const currentItems = prev[section]?.items || [];
        const newItems = [...currentItems];
        if (!newItems[index]) newItems[index] = {}; 
        newItems[index] = { ...newItems[index], [field]: value };
        
        const newConfig = {
            ...prev,
            [section]: { ...prev[section], items: newItems }
        };
        sendUpdate(newConfig);
        return newConfig;
    });
  };

  const previewUrl = `/${negocio.slug}`; 

  return (
    <div className="fixed inset-0 z-[100] flex bg-zinc-100 font-sans h-screen w-screen overflow-hidden">
      
      {/* --- COLUMNA IZQUIERDA: PREVIEW --- */}
      <div className="flex-1 flex flex-col h-full relative border-r border-zinc-300">
        {/* Toolbar */}
        <div className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-6 shadow-sm z-10">
            <div className="flex items-center gap-3">
                <span className="bg-zinc-100 text-zinc-500 px-3 py-1 rounded text-xs font-mono border border-zinc-200">
                    /{negocio.slug}
                </span>
                <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full border border-emerald-100 animate-pulse">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Live
                </div>
            </div>

            <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200">
                <button onClick={() => setViewMode("desktop")} className={`p-2 rounded-md transition-all ${viewMode === "desktop" ? "bg-white shadow text-indigo-600" : "text-zinc-400 hover:text-zinc-600"}`}><Monitor size={18} /></button>
                <button onClick={() => setViewMode("mobile")} className={`p-2 rounded-md transition-all ${viewMode === "mobile" ? "bg-white shadow text-indigo-600" : "text-zinc-400 hover:text-zinc-600"}`}><Smartphone size={18} /></button>
            </div>

            <a href={`/${negocio.slug}`} target="_blank" className="text-zinc-400 hover:text-indigo-600 transition-colors p-2"><ExternalLink size={18}/></a>
        </div>

        {/* Iframe Container */}
        <div className="flex-1 bg-zinc-200/50 flex items-center justify-center p-8 overflow-hidden relative">
            <div className={`transition-all duration-500 bg-white shadow-2xl border border-zinc-300 overflow-hidden ${viewMode === "mobile" ? "w-[375px] h-[667px] rounded-[2.5rem] border-[8px] border-zinc-800 shadow-xl" : "w-full h-full rounded-lg shadow-lg"}`}>
                <iframe 
                    ref={iframeRef}
                    key={refreshKey}
                    src={previewUrl} 
                    className="w-full h-full bg-white"
                    style={{ border: 'none' }}
                    title="Preview Cliente"
                    onLoad={() => sendUpdate(config)} 
                />
            </div>
        </div>
      </div>

      {/* --- COLUMNA DERECHA: EDITOR --- */}
      <div className="w-[400px] bg-white shadow-2xl flex flex-col h-full z-20 border-l border-zinc-200">
        
        <div className="p-5 border-b border-zinc-200 flex justify-between items-center bg-white sticky top-0 z-10">
            <div>
                <h2 className="font-bold text-lg text-zinc-900 flex items-center gap-2"><LayoutTemplate size={20} className="text-indigo-600"/> Editor Visual</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-red-500 transition-colors"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-zinc-50/30">
            
            {/* 0. NUEVA SECCIÓN: IDENTIDAD (LOGO) */}
            <div className="space-y-4 bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2 pb-3 border-b border-zinc-100">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span> Identidad
                </h3>
                {/* UPLOADER DE LOGO */}
                <ImageUpload 
                    label="Logo del Negocio"
                    value={config.logoUrl}
                    onChange={(url) => updateField('root', 'logoUrl', url)}
                />
            </div>

            {/* 1. SECCIÓN HERO */}
            <div className="space-y-4 bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                    <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Portada
                    </h3>
                    <button onClick={() => updateField('hero', 'mostrar', !config.hero?.mostrar)} className={`p-1.5 rounded-lg transition-colors ${config.hero?.mostrar ? 'bg-indigo-50 text-indigo-600' : 'bg-zinc-100 text-zinc-400'}`}>
                        {config.hero?.mostrar ? <Eye size={16}/> : <EyeOff size={16}/>}
                    </button>
                </div>
                
                {config.hero?.mostrar && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div>
                            <label className="text-[11px] font-bold text-zinc-400 uppercase mb-1 block">Título</label>
                            <input type="text" value={config.hero.titulo || ""} onChange={(e) => updateField('hero', 'titulo', e.target.value)} className="w-full p-3 border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"/>
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-zinc-400 uppercase mb-1 block">Subtítulo</label>
                            <textarea rows={3} value={config.hero.subtitulo || ""} onChange={(e) => updateField('hero', 'subtitulo', e.target.value)} className="w-full p-3 border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"/>
                        </div>
                        
                        {/* UPLOADER DE IMAGEN HERO */}
                        <div className="pt-2 border-t border-zinc-100">
                            <ImageUpload 
                                label="Fondo de Portada"
                                value={config.hero.imagenUrl}
                                onChange={(url) => updateField('hero', 'imagenUrl', url)}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* 2. SECCIÓN BENEFICIOS */}
            <div className="space-y-4 bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                    <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Beneficios
                    </h3>
                    <button onClick={() => updateField('beneficios', 'mostrar', !config.beneficios?.mostrar)} className={`p-1.5 rounded-lg transition-colors ${config.beneficios?.mostrar ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-400'}`}>
                        {config.beneficios?.mostrar ? <Eye size={16}/> : <EyeOff size={16}/>}
                    </button>
                </div>

                {config.beneficios?.mostrar && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div>
                            <label className="text-[11px] font-bold text-zinc-400 uppercase mb-1 block">Título Sección</label>
                            <input type="text" value={config.beneficios.titulo || ""} onChange={(e) => updateField('beneficios', 'titulo', e.target.value)} className="w-full p-3 border border-zinc-200 rounded-lg text-sm text-zinc-900 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"/>
                        </div>
                        <div className="space-y-3">
                            {config.beneficios.items?.map((item: any, i: number) => (
                                <div key={i} className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 group hover:border-emerald-200 transition-colors">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="w-5 h-5 rounded-full bg-zinc-200 text-zinc-500 flex items-center justify-center text-xs font-bold">{i+1}</span>
                                        <span className="text-xs font-medium text-zinc-400">Card #{i+1}</span>
                                    </div>
                                    <input placeholder="Título" value={item.titulo || ""} onChange={(e) => updateArrayItem('beneficios', i, 'titulo', e.target.value)} className="w-full p-2 border border-zinc-200 rounded mb-2 text-sm text-zinc-900 focus:border-emerald-400 outline-none focus:ring-0 bg-white"/>
                                    <input placeholder="Descripción..." value={item.desc || ""} onChange={(e) => updateArrayItem('beneficios', i, 'desc', e.target.value)} className="w-full p-2 border border-zinc-200 rounded text-sm text-zinc-600 focus:border-emerald-400 outline-none focus:ring-0 bg-white"/>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-200 bg-white flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button onClick={onClose} className="px-6 py-3 text-zinc-500 font-bold hover:bg-zinc-100 rounded-xl transition-colors text-sm">Cerrar</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex justify-center items-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:translate-y-0">
                {saving ? <Loader2 className="animate-spin" size={18}/> : <><Save size={18}/> Guardar</>}
            </button>
        </div>
      </div>
    </div>
  );
}