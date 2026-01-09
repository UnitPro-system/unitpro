"use client";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Save, X, LayoutTemplate, Eye, EyeOff, Loader2, Monitor, Smartphone, ExternalLink, Palette, MousePointerClick, Layout, Layers, MapPin, Clock, PlusCircle, Trash2, Image, FileText, ArrowUp, ArrowDown } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";

const DEFAULT_CONFIG = {
  template: "modern",
  appearance: { font: 'sans', radius: 'medium' },
  colors: { 
      primary: "#4f46e5",  
      secondary: "#f3f4f6", 
      text: "#1f2937" },
  hero: { 
    titulo: "Tu Título Principal", 
    subtitulo: "Escribe aquí una descripción atractiva.", 
    ctaTexto: "Contactar", 
    mostrar: true,
    layout: "split", 
    parallax: false,
    overlayOpacity: 50
  },
  servicios: { 
    mostrar: true, 
    titulo: "Nuestros Servicios", 
    items: [
      { titulo: "Servicio 1", desc: "Descripción breve." },
      { titulo: "Servicio 2", desc: "Descripción breve." },
      { titulo: "Servicio 3", desc: "Descripción breve." }
    ]
  },
  ubicacion: { mostrar: true },
  testimonios: { mostrar: false, titulo: "Opiniones", items: [] },
  footer: { mostrar: true, textoCopyright: "Derechos reservados" }
};

export default function ServiceBookingEditor({ negocio, onClose, onSave }: any) {
  const supabase = createClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // REFERENCIAS PARA SCROLL
  const sectionsRefs: any = {
    contact: useRef<HTMLDivElement>(null),
    appearance: useRef<HTMLDivElement>(null),
    identity: useRef<HTMLDivElement>(null),
    hero: useRef<HTMLDivElement>(null),
    servicios: useRef<HTMLDivElement>(null),
    footer: useRef<HTMLDivElement>(null),
  };

  // ESTADO DE LA CONFIGURACIÓN VISUAL (JSONB)
  const [config, setConfig] = useState({ ...DEFAULT_CONFIG, ...(negocio.config_web || {}) });
  
  // ESTADO DE DATOS DEL NEGOCIO (COLUMNAS DB)
  const [dbFields, setDbFields] = useState({
    direccion: negocio.direccion || "",
    horarios: negocio.horarios || "",
    google_maps_link: negocio.google_maps_link || "" // <--- CAMPO NUEVO EN EL ESTADO
  });

  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // ESCUCHAR CLICS DESDE EL IFRAME
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "FOCUS_SECTION") {
            const sectionName = event.data.section;
            const targetRef = sectionsRefs[sectionName];
            if (targetRef && targetRef.current) {
                targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setActiveSection(sectionName);
                setTimeout(() => setActiveSection(null), 2000); 
            }
        }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // ENVÍO DE CAMBIOS AL IFRAME
  const sendConfigUpdate = (newConfig: any) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: "UPDATE_CONFIG", payload: newConfig }, "*");
    }
  };

  const sendDbUpdate = (newDbFields: any) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: "UPDATE_DB", payload: newDbFields }, "*");
    }
  };

  // GUARDADO EN SUPABASE (ACTUALIZA JSON Y COLUMNAS)
  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("negocios").update({ 
        config_web: config,
        direccion: dbFields.direccion,
        horarios: dbFields.horarios,
        google_maps_link: dbFields.google_maps_link // <--- GUARDAMOS EL LINK EN DB
    }).eq("id", negocio.id);

    if (error) alert("Error: " + error.message);
    setSaving(false);
    if (onSave) onSave();
  };

  // ACTUALIZADORES DE ESTADO
  const updateConfigField = (section: string, field: string, value: any) => {
    setConfig((prev: any) => {
      let newConfig;
      if (section === 'root') newConfig = { ...prev, [field]: value };
      else newConfig = { ...prev, [section]: { ...prev[section], [field]: value } };
      sendConfigUpdate(newConfig);
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
        sendConfigUpdate(newConfig);
        return newConfig;
    });
  };

  const updateDbField = (field: string, value: string) => {
      const newDb = { ...dbFields, [field]: value };
      setDbFields(newDb);
      sendDbUpdate(newDb);
  };

  const previewUrl = `/${negocio.slug}?editor=true`; 
  const getSectionClass = (name: string) => `space-y-4 bg-white p-5 rounded-xl border transition-all duration-500 ${activeSection === name ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] ring-1 ring-indigo-500' : 'border-zinc-200 shadow-sm'}`;
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  // Agregar una nueva sección
  const addSection = (type: 'about' | 'gallery') => {
    const newId = Math.random().toString(36).substr(2, 9);
    let newSection: any = { id: newId, type };

    if (type === 'about') {
        newSection = { ...newSection, titulo: "Sobre Nosotros", texto: "Escribe aquí tu historia...", imagenUrl: "" };
    } else if (type === 'gallery') {
        newSection = { ...newSection, titulo: "Nuestros Trabajos", imagenes: [] };
    }

    setConfig((prev: any) => {
        const currentSections = prev.customSections || [];
        const newConfig = { ...prev, customSections: [...currentSections, newSection] };
        sendConfigUpdate(newConfig);
        return newConfig;
    });
    setIsAddMenuOpen(false);
    
    // Scroll automático hacia la nueva sección
    setTimeout(() => {
        const el = document.getElementById(`section-editor-${newId}`);
        if(el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Eliminar sección
  const removeSection = (id: string) => {
    if(!window.confirm("¿Borrar esta sección?")) return;
    setConfig((prev: any) => {
        const newSections = prev.customSections.filter((s: any) => s.id !== id);
        const newConfig = { ...prev, customSections: newSections };
        sendConfigUpdate(newConfig);
        return newConfig;
    });
  };

  // Actualizar datos de una sección dinámica
  const updateCustomSection = (id: string, field: string, value: any) => {
    setConfig((prev: any) => {
        const newSections = prev.customSections.map((s: any) => s.id === id ? { ...s, [field]: value } : s);
        const newConfig = { ...prev, customSections: newSections };
        sendConfigUpdate(newConfig);
        return newConfig;
    });
  };
  return (
    <div className="fixed inset-0 z-[100] flex bg-zinc-100 font-sans h-screen w-screen overflow-hidden">
      
      {/* --- PREVIEW AREA --- */}
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
                <iframe 
                    ref={iframeRef} 
                    src={previewUrl} 
                    className="w-full h-full bg-white" 
                    style={{ border: 'none' }} 
                    title="Preview" 
                    onLoad={() => { sendConfigUpdate(config); sendDbUpdate(dbFields); }} 
                />
            </div>
        </div>
      </div>

      {/* --- SIDEBAR --- */}
      <div className="w-[400px] bg-white shadow-2xl flex flex-col h-full z-20 border-l border-zinc-200">
        <div className="p-5 border-b border-zinc-200 flex justify-between items-center bg-white sticky top-0 z-10">
            <h2 className="font-bold text-lg text-zinc-900 flex items-center gap-2"><LayoutTemplate size={20} className="text-indigo-600"/> Editor</h2>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-zinc-50/30">
            {/*  GESTOR DE SECCIONES --- */}
            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Layers size={14} className="text-zinc-400"/> Secciones Activas
                </h3>
                <div className="space-y-2">
                    {/* Toggle Hero */}
                    <div className="flex items-center justify-between p-2 hover:bg-zinc-50 rounded-lg transition-colors">
                        <span className="text-sm font-medium text-zinc-600">Portada (Hero)</span>
                        <button 
                            onClick={() => updateConfigField('hero', 'mostrar', !config.hero?.mostrar)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.hero?.mostrar ? 'bg-indigo-600' : 'bg-zinc-200'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.hero?.mostrar ? 'translate-x-6' : 'translate-x-1'}`}/>
                        </button>
                    </div>

                    {/* Toggle Servicios */}
                    <div className="flex items-center justify-between p-2 hover:bg-zinc-50 rounded-lg transition-colors">
                        <span className="text-sm font-medium text-zinc-600">Servicios</span>
                        <button 
                            onClick={() => updateConfigField('servicios', 'mostrar', !config.servicios?.mostrar)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.servicios?.mostrar ? 'bg-indigo-600' : 'bg-zinc-200'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.servicios?.mostrar ? 'translate-x-6' : 'translate-x-1'}`}/>
                        </button>
                    </div>

                    {/* Toggle Ubicación (NUEVO) */}
                    <div className="flex items-center justify-between p-2 hover:bg-zinc-50 rounded-lg transition-colors">
                        <span className="text-sm font-medium text-zinc-600">Ubicación y Mapa</span>
                        <button 
                            onClick={() => updateConfigField('ubicacion', 'mostrar', !config.ubicacion?.mostrar)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.ubicacion?.mostrar ? 'bg-indigo-600' : 'bg-zinc-200'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.ubicacion?.mostrar ? 'translate-x-6' : 'translate-x-1'}`}/>
                        </button>
                    </div>

                    {/* Toggle Footer */}
                    <div className="flex items-center justify-between p-2 hover:bg-zinc-50 rounded-lg transition-colors">
                        <span className="text-sm font-medium text-zinc-600">Pie de Página</span>
                        <button 
                            onClick={() => updateConfigField('footer', 'mostrar', !config.footer?.mostrar)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.footer?.mostrar ? 'bg-indigo-600' : 'bg-zinc-200'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.footer?.mostrar ? 'translate-x-6' : 'translate-x-1'}`}/>
                        </button>
                    </div>
                    {/* ... (Toggles anteriores: Hero, Servicios, etc) ... */}
                    
                    {/* BOTÓN AGREGAR SECCIÓN */}
                    <div className="pt-4 border-t border-zinc-100 relative">
                        <button 
                            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                            className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-500 font-bold text-sm hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                        >
                            <PlusCircle size={18}/> Agregar Sección
                        </button>

                        {/* Menú Desplegable */}
                        {isAddMenuOpen && (
                            <div className="absolute top-full left-0 w-full mt-2 bg-white border border-zinc-200 shadow-xl rounded-xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-2">
                                <button onClick={() => addSection('about')} className="w-full text-left px-4 py-3 hover:bg-zinc-50 flex items-center gap-3 text-sm font-medium text-zinc-700">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FileText size={16}/></div>
                                    Quiénes Somos (Texto + Foto)
                                </button>
                                <button onClick={() => addSection('gallery')} className="w-full text-left px-4 py-3 hover:bg-zinc-50 flex items-center gap-3 text-sm font-medium text-zinc-700 border-t border-zinc-100">
                                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Image size={16}/></div>
                                    Galería de Trabajos
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* 1. SECCIÓN CONTACTO */}
            <div ref={sectionsRefs.contact} className={getSectionClass('contact')}>
                <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2 pb-3 border-b border-zinc-100">
                    <MapPin size={16} className="text-blue-500" /> Información de Contacto
                </h3>
                <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase mb-1 block">Dirección</label>
                    <input 
                        type="text" 
                        value={dbFields.direccion} 
                        onChange={(e) => updateDbField('direccion', e.target.value)} 
                        className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Ej: Av. Principal 123"
                    />
                </div>
                {/* INPUT NUEVO PARA GOOGLE MAPS */}
                <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase mb-1 block">Link Google Maps</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={dbFields.google_maps_link} 
                            onChange={(e) => updateDbField('google_maps_link', e.target.value)} 
                            className="w-full p-2 pl-8 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="https://goo.gl/maps/..."
                        />
                        <ExternalLink size={14} className="absolute left-2.5 top-2.5 text-zinc-400"/>
                    </div>
                </div>
                <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase mb-1 block">Horarios</label>
                    <input 
                        type="text" 
                        value={dbFields.horarios} 
                        onChange={(e) => updateDbField('horarios', e.target.value)} 
                        className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Ej: Lun-Vie 9:00 - 18:00"
                    />
                </div>
            </div>

            {/* 2. SECCIÓN APARIENCIA */}
            <div ref={sectionsRefs.appearance} className={getSectionClass('appearance')}>
                <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2 pb-3 border-b border-zinc-100">
                    <Palette size={16} className="text-purple-500" /> Apariencia
                </h3>

                {/* --- NUEVO: GESTOR DE COLORES --- */}
                <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase mb-2 block">Paleta de Colores</label>
                    <div className="grid grid-cols-1 gap-3">
                        
                        {/* Color Principal */}
                        <div className="flex items-center justify-between p-2 border border-zinc-200 rounded-lg bg-zinc-50">
                            <span className="text-xs font-medium text-zinc-600">Principal</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-400 font-mono uppercase">{config.colors?.primary}</span>
                                <input 
                                    type="color" 
                                    value={config.colors?.primary || "#000000"} 
                                    onChange={(e) => updateConfigField('colors', 'primary', e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                                />
                            </div>
                        </div>

                        {/* Color Secundario */}
                        <div className="flex items-center justify-between p-2 border border-zinc-200 rounded-lg bg-zinc-50">
                            <span className="text-xs font-medium text-zinc-600">Fondo / Secundario</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-400 font-mono uppercase">{config.colors?.secondary}</span>
                                <input 
                                    type="color" 
                                    value={config.colors?.secondary || "#ffffff"} 
                                    onChange={(e) => updateConfigField('colors', 'secondary', e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                                />
                            </div>
                        </div>

                        {/* Color de Texto */}
                        <div className="flex items-center justify-between p-2 border border-zinc-200 rounded-lg bg-zinc-50">
                            <span className="text-xs font-medium text-zinc-600">Texto</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-400 font-mono uppercase">{config.colors?.text}</span>
                                <input 
                                    type="color" 
                                    value={config.colors?.text || "#000000"} 
                                    onChange={(e) => updateConfigField('colors', 'text', e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Selectores anteriores (Tipografía y Bordes) */}
                <div className="pt-2 border-t border-zinc-100 mt-2">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase mb-1 block">Tipografía</label>
                    <select value={config.appearance?.font || 'sans'} onChange={(e) => updateConfigField('appearance', 'font', e.target.value)} className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white">
                        <option value="sans">Moderna (Sans)</option>
                        <option value="serif">Elegante (Serif)</option>
                        <option value="mono">Técnica (Mono)</option>
                    </select>
                </div>
                
                <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase mb-1 block">Bordes</label>
                    <div className="flex gap-2">
                        {['none', 'medium', 'full'].map((mode) => (
                            <button key={mode} onClick={() => updateConfigField('appearance', 'radius', mode)} className={`flex-1 py-2 text-xs border rounded-lg ${config.appearance?.radius === mode ? 'bg-purple-50 border-purple-500 text-purple-700 font-bold' : 'bg-white'}`}>{mode}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. IDENTIDAD */}
            <div ref={sectionsRefs.identity} className={getSectionClass('identity')}>
                <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2 pb-3 border-b border-zinc-100"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Identidad</h3>
                <ImageUpload label="Logo" value={config.logoUrl} onChange={(url) => updateConfigField('root', 'logoUrl', url)} />
            </div>

            {/* 4. HERO */}
            <div ref={sectionsRefs.hero} className={getSectionClass('hero')}>
                <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                    <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Portada</h3>
                    <button onClick={() => updateConfigField('hero', 'mostrar', !config.hero?.mostrar)} className="text-zinc-400 hover:text-indigo-600"><Eye size={16}/></button>
                </div>
                {config.hero?.mostrar && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase mb-2 block flex items-center gap-1"><Layout size={12}/> Diseño</label>
                            <div className="flex gap-2">
                                <button onClick={() => updateConfigField('hero', 'layout', 'split')} className={`flex-1 py-2 text-xs border rounded-lg ${config.hero?.layout !== 'full' ? 'bg-white border-indigo-500 text-indigo-700 font-bold' : ''}`}>Dividido</button>
                                <button onClick={() => updateConfigField('hero', 'layout', 'full')} className={`flex-1 py-2 text-xs border rounded-lg ${config.hero?.layout === 'full' ? 'bg-white border-indigo-500 text-indigo-700 font-bold' : ''}`}>Cinemático</button>
                            </div>
                        </div>
                        {config.hero?.layout === 'full' && (
                            <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-zinc-600 flex items-center gap-2"><Layers size={14}/> Efecto Parallax</label>
                                    <button onClick={() => updateConfigField('hero', 'parallax', !config.hero?.parallax)} className={`w-10 h-6 rounded-full p-1 transition-colors ${config.hero?.parallax ? 'bg-indigo-600' : 'bg-zinc-300'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${config.hero?.parallax ? 'translate-x-4' : ''}`}></div>
                                    </button>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">Oscuridad ({config.hero?.overlayOpacity || 50}%)</label>
                                    <input type="range" min="0" max="90" value={config.hero?.overlayOpacity || 50} onChange={(e) => updateConfigField('hero', 'overlayOpacity', e.target.value)} className="w-full accent-indigo-600"/>
                                </div>
                            </div>
                        )}
                        <input type="text" value={config.hero.titulo} onChange={(e) => updateConfigField('hero', 'titulo', e.target.value)} className="w-full p-2 border rounded text-sm"/>
                        <textarea rows={3} value={config.hero.subtitulo} onChange={(e) => updateConfigField('hero', 'subtitulo', e.target.value)} className="w-full p-2 border rounded text-sm"/>
                        <ImageUpload label="Imagen de Fondo" value={config.hero.imagenUrl} onChange={(url) => updateConfigField('hero', 'imagenUrl', url)} />
                    </div>
                )}
            </div>

            {/* 5. servicios */}
            <div ref={sectionsRefs.servicios} className={getSectionClass('servicios')}>
                <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                    <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> servicios</h3>
                    <button onClick={() => updateConfigField('servicios', 'mostrar', !config.servicios?.mostrar)} className="text-zinc-400 hover:text-emerald-600"><Eye size={16}/></button>
                </div>
                {config.servicios?.mostrar && (
                    <div className="space-y-4">
                        <input type="text" value={config.servicios.titulo} onChange={(e) => updateConfigField('servicios', 'titulo', e.target.value)} className="w-full p-2 border rounded text-sm font-bold"/>
                        {config.servicios.items?.map((item: any, i: number) => (
                            <div key={i} className="p-2 border rounded bg-zinc-50">
                                <input value={item.titulo} onChange={(e) => updateArrayItem('servicios', i, 'titulo', e.target.value)} className="w-full p-1 mb-1 border rounded text-xs"/>
                                <input value={item.desc} onChange={(e) => updateArrayItem('servicios', i, 'desc', e.target.value)} className="w-full p-1 border rounded text-xs text-zinc-500"/>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {/* --- EDITORES DE SECCIONES DINÁMICAS --- */}
            {config.customSections?.map((section: any, index: number) => (
                <div key={section.id} id={`section-editor-${section.id}`} className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4 relative group">
                    
                    {/* Cabecera de la Sección */}
                    <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                        <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2">
                            {section.type === 'about' ? <FileText size={16} className="text-blue-500"/> : <Image size={16} className="text-purple-500"/>}
                            {section.type === 'about' ? 'Quiénes Somos' : 'Galería'}
                        </h3>
                        <button onClick={() => removeSection(section.id)} className="text-zinc-400 hover:text-red-500 transition-colors p-1"><Trash2 size={16}/></button>
                    </div>

                    {/* Editor: Quiénes Somos */}
                    {section.type === 'about' && (
                        <div className="space-y-3">
                            <div>
                                <label className="text-[11px] font-bold text-zinc-400 uppercase mb-1 block">Título</label>
                                <input 
                                    value={section.titulo} 
                                    onChange={(e) => updateCustomSection(section.id, 'titulo', e.target.value)}
                                    className="w-full p-2 border border-zinc-200 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-zinc-400 uppercase mb-1 block">Descripción</label>
                                <textarea 
                                    rows={4}
                                    value={section.texto} 
                                    onChange={(e) => updateCustomSection(section.id, 'texto', e.target.value)}
                                    className="w-full p-2 border border-zinc-200 rounded-lg text-sm"
                                />
                            </div>
                            <ImageUpload 
                                label="Imagen (Opcional)" 
                                value={section.imagenUrl} 
                                onChange={(url) => updateCustomSection(section.id, 'imagenUrl', url)} 
                            />
                        </div>
                    )}

                    {/* Editor: Galería */}
                    {section.type === 'gallery' && (
                        <div className="space-y-3">
                            <input 
                                value={section.titulo} 
                                onChange={(e) => updateCustomSection(section.id, 'titulo', e.target.value)}
                                className="w-full p-2 border border-zinc-200 rounded-lg text-sm font-bold mb-2"
                                placeholder="Título de la galería"
                            />
                            
                            {/* Lista de Imágenes */}
                            <div className="space-y-2">
                                {section.imagenes?.map((img: any, i: number) => (
                                    <div key={i} className="flex gap-2 items-center bg-zinc-50 p-2 rounded-lg border border-zinc-200">
                                        <img src={img.url} className="w-10 h-10 rounded object-cover bg-zinc-200" />
                                        <input 
                                            value={img.descripcion || ''} 
                                            onChange={(e) => {
                                                const newImages = [...section.imagenes];
                                                newImages[i].descripcion = e.target.value;
                                                updateCustomSection(section.id, 'imagenes', newImages);
                                            }}
                                            className="flex-1 p-1 bg-transparent text-xs border-b border-transparent focus:border-zinc-300 outline-none"
                                            placeholder="Descripción..."
                                        />
                                        <button 
                                            onClick={() => {
                                                const newImages = section.imagenes.filter((_:any, idx:number) => idx !== i);
                                                updateCustomSection(section.id, 'imagenes', newImages);
                                            }}
                                            className="text-zinc-400 hover:text-red-500"
                                        >
                                            <X size={14}/>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Botón subir nueva imagen a la galería */}
                            <div className="pt-2">
                                <ImageUpload 
                                    label="Agregar Imagen" 
                                    value="" // Siempre vacío para que detecte cambios nuevos
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