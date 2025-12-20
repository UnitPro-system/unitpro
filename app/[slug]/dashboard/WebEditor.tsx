"use client";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Save, X, LayoutTemplate, Eye, EyeOff, Loader2, Monitor, Smartphone, ExternalLink, Palette, MousePointerClick } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";

const DEFAULT_CONFIG = {
  template: "modern",
  appearance: { font: 'sans', radius: 'medium' },
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
  
  // 1. REFERENCIAS: Para saber dónde hacer scroll
  const sectionsRefs: any = {
    appearance: useRef<HTMLDivElement>(null),
    identity: useRef<HTMLDivElement>(null),
    hero: useRef<HTMLDivElement>(null),
    beneficios: useRef<HTMLDivElement>(null),
    footer: useRef<HTMLDivElement>(null),
  };

  const [config, setConfig] = useState({ ...DEFAULT_CONFIG, ...(negocio.config_web || {}) });
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // 2. ESCUCHAR CLICS DESDE EL IFRAME (MAGIA CLICK-TO-EDIT)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "FOCUS_SECTION") {
            const sectionName = event.data.section;
            const targetRef = sectionsRefs[sectionName];
            
            if (targetRef && targetRef.current) {
                // A. Scroll suave hacia la sección
                targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // B. Resaltar visualmente
                setActiveSection(sectionName);
                setTimeout(() => setActiveSection(null), 2000); 
            }
        }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const sendUpdate = (newConfig: any) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: "UPDATE_CONFIG", payload: newConfig }, "*");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("negocios").update({ config_web: config }).eq("id", negocio.id);
    if (error) alert("Error: " + error.message);
    setSaving(false);
    if (onSave) onSave();
  };

  const updateField = (section: string, field: string, value: any) => {
    setConfig((prev: any) => {
      let newConfig;
      if (section === 'root') newConfig = { ...prev, [field]: value };
      else newConfig = { ...prev, [section]: { ...prev[section], [field]: value } };
      sendUpdate(newConfig);
      return newConfig;
    });
  };

  const updateArrayItem = (section: string, index: number, field: string, value: string) => {
    setConfig((prev: any) => {
        const currentItems = prev[section]?.items || [];
        const newItems = [...currentItems];
        if (!newItems[index]) newItems[index] = {}; 
        newItems[index] = { ...newItems[index], [field]: value };
        const newConfig = { ...prev, [section]: { ...prev[section], items: newItems } };
        sendUpdate(newConfig);
        return newConfig;
    });
  };

  // 3. ACTIVAR MODO EDITOR EN LA LANDING
  const previewUrl = `/${negocio.slug}?editor=true`; 

  // Helper para resaltar la sección activa
  const getSectionClass = (name: string) => 
    `space-y-4 bg-white p-5 rounded-xl border transition-all duration-500 ${
        activeSection === name 
        ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] ring-1 ring-indigo-500' 
        : 'border-zinc-200 shadow-sm'
    }`;

  return (
    <div className="fixed inset-0 z-[100] flex bg-zinc-100 font-sans h-screen w-screen overflow-hidden">
      
      {/* --- PREVIEW --- */}
      <div className="flex-1 flex flex-col h-full relative border-r border-zinc-300">
        <div className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-6 shadow-sm z-10">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full border border-indigo-100 font-bold">
                    <MousePointerClick size={14}/> Click-to-Edit Activo
                </div>
            </div>
            <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200">
                <button onClick={() => setViewMode("desktop")} className={`p-2 rounded-md ${viewMode === "desktop" ? "bg-white shadow text-indigo-600" : "text-zinc-400"}`}><Monitor size={18} /></button>
                <button onClick={() => setViewMode("mobile")} className={`p-2 rounded-md ${viewMode === "mobile" ? "bg-white shadow text-indigo-600" : "text-zinc-400"}`}><Smartphone size={18} /></button>
            </div>
        </div>

        <div className="flex-1 bg-zinc-200/50 flex items-center justify-center p-8 overflow-hidden relative">
            <div className={`transition-all duration-500 bg-white shadow-2xl border border-zinc-300 overflow-hidden ${viewMode === "mobile" ? "w-[375px] h-[667px] rounded-[2.5rem] border-[8px] border-zinc-800 shadow-xl" : "w-full h-full rounded-lg shadow-lg"}`}>
                <iframe ref={iframeRef} src={previewUrl} className="w-full h-full bg-white" style={{ border: 'none' }} title="Preview" onLoad={() => sendUpdate(config)} />
            </div>
        </div>
      </div>

      {/* --- EDITOR SIDEBAR --- */}
      <div className="w-[400px] bg-white shadow-2xl flex flex-col h-full z-20 border-l border-zinc-200">
        <div className="p-5 border-b border-zinc-200 flex justify-between items-center bg-white sticky top-0 z-10">
            <h2 className="font-bold text-lg text-zinc-900 flex items-center gap-2"><LayoutTemplate size={20} className="text-indigo-600"/> Editor</h2>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-zinc-50/30">
            
            {/* SECCIÓN APARIENCIA (Con Ref) */}
            <div ref={sectionsRefs.appearance} className={getSectionClass('appearance')}>
                <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2 pb-3 border-b border-zinc-100">
                    <Palette size={16} className="text-purple-500" /> Apariencia
                </h3>
                <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase mb-1 block">Tipografía</label>
                    <select value={config.appearance?.font || 'sans'} onChange={(e) => updateField('appearance', 'font', e.target.value)} className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white">
                        <option value="sans">Moderna (Sans)</option>
                        <option value="serif">Elegante (Serif)</option>
                        <option value="mono">Técnica (Mono)</option>
                    </select>
                </div>
                <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase mb-1 block">Bordes</label>
                    <div className="flex gap-2">
                        {['none', 'medium', 'full'].map((mode) => (
                            <button key={mode} onClick={() => updateField('appearance', 'radius', mode)} className={`flex-1 py-2 text-xs border rounded-lg ${config.appearance?.radius === mode ? 'bg-purple-50 border-purple-500 text-purple-700 font-bold' : 'bg-white'}`}>{mode}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* SECCIÓN IDENTIDAD (Con Ref) */}
            <div ref={sectionsRefs.identity} className={getSectionClass('identity')}>
                <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2 pb-3 border-b border-zinc-100">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span> Identidad
                </h3>
                <ImageUpload label="Logo" value={config.logoUrl} onChange={(url) => updateField('root', 'logoUrl', url)} />
            </div>

            {/* SECCIÓN HERO (Con Ref) */}
            <div ref={sectionsRefs.hero} className={getSectionClass('hero')}>
                <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                    <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Portada
                    </h3>
                    <button onClick={() => updateField('hero', 'mostrar', !config.hero?.mostrar)} className="text-zinc-400 hover:text-indigo-600"><Eye size={16}/></button>
                </div>
                {config.hero?.mostrar && (
                    <div className="space-y-4">
                        <input type="text" value={config.hero.titulo} onChange={(e) => updateField('hero', 'titulo', e.target.value)} className="w-full p-2 border rounded text-sm"/>
                        <textarea rows={3} value={config.hero.subtitulo} onChange={(e) => updateField('hero', 'subtitulo', e.target.value)} className="w-full p-2 border rounded text-sm"/>
                        <ImageUpload label="Fondo" value={config.hero.imagenUrl} onChange={(url) => updateField('hero', 'imagenUrl', url)} />
                    </div>
                )}
            </div>

            {/* SECCIÓN BENEFICIOS (Con Ref) */}
            <div ref={sectionsRefs.beneficios} className={getSectionClass('beneficios')}>
                <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                    <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Beneficios
                    </h3>
                    <button onClick={() => updateField('beneficios', 'mostrar', !config.beneficios?.mostrar)} className="text-zinc-400 hover:text-emerald-600"><Eye size={16}/></button>
                </div>
                {config.beneficios?.mostrar && (
                    <div className="space-y-4">
                        <input type="text" value={config.beneficios.titulo} onChange={(e) => updateField('beneficios', 'titulo', e.target.value)} className="w-full p-2 border rounded text-sm font-bold"/>
                        {config.beneficios.items?.map((item: any, i: number) => (
                            <div key={i} className="p-2 border rounded bg-zinc-50">
                                <input value={item.titulo} onChange={(e) => updateArrayItem('beneficios', i, 'titulo', e.target.value)} className="w-full p-1 mb-1 border rounded text-xs"/>
                                <input value={item.desc} onChange={(e) => updateArrayItem('beneficios', i, 'desc', e.target.value)} className="w-full p-1 border rounded text-xs text-zinc-500"/>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        <div className="p-5 border-t bg-white flex gap-3">
            <button onClick={onClose} className="px-6 py-3 text-zinc-500 font-bold hover:bg-zinc-100 rounded-xl text-sm">Cerrar</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl flex justify-center gap-2">
                {saving ? <Loader2 className="animate-spin"/> : <><Save size={18}/> Guardar</>}
            </button>
        </div>
      </div>
    </div>
  );
}