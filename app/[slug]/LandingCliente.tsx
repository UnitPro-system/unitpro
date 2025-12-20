"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useSearchParams } from "next/navigation"; 
import { Phone, CheckCircle, X, Star, MessageCircle, ArrowRight, ShieldCheck, Loader2, ChevronRight, Heart } from "lucide-react";

import { SafeHTML } from "@/components/ui/SafeHTML";
import { Testimonials } from "@/components/blocks/Testimonials";
import { Footer } from "@/components/blocks/Footer";
import type { WebConfig } from "@/types/web-config";

export default function LandingCliente({ initialData }: { initialData: any }) {
  const supabase = createClient();
  const searchParams = useSearchParams();
  
  // 1. DETECCIÓN DE MODO EDITOR
  const isEditorMode = searchParams.get('editor') === 'true';

  const [negocio, setNegocio] = useState<any>(initialData);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [nombreCliente, setNombreCliente] = useState("");
  const [feedbackComentario, setFeedbackComentario] = useState("");
  const [ratingSeleccionado, setRatingSeleccionado] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [mostrarGracias, setMostrarGracias] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "UPDATE_CONFIG" && event.data?.payload) {
        setNegocio((prev: any) => ({ ...prev, config_web: event.data.payload }));
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // 2. HELPER PARA CLICK-TO-EDIT
  const handleEditClick = (e: React.MouseEvent, sectionName: string) => {
    if (!isEditorMode) return; 
    e.preventDefault();
    e.stopPropagation();
    // Mensaje al padre (WebEditor)
    window.parent.postMessage({ type: "FOCUS_SECTION", section: sectionName }, "*");
  };

  // Clase para resaltar elementos editables
  const editableClass = isEditorMode 
    ? "cursor-pointer hover:ring-2 hover:ring-indigo-500 hover:ring-offset-2 transition-all duration-200 rounded-lg relative z-50" 
    : "";

  const rawConfig = negocio?.config_web || {};
  const appearance = rawConfig.appearance || { font: 'sans', radius: 'medium' };

  const fontClass = { 'sans': 'font-sans', 'serif': 'font-serif', 'mono': 'font-mono' }[appearance.font as string] || 'font-sans';
  const cardRadius = { 'none': 'rounded-none', 'medium': 'rounded-2xl', 'full': 'rounded-[2.5rem]' }[appearance.radius as string] || 'rounded-2xl';
  const buttonRadius = { 'none': 'rounded-none', 'medium': 'rounded-xl', 'full': 'rounded-full' }[appearance.radius as string] || 'rounded-xl';

  const defaultBeneficios = rawConfig.beneficios?.items?.length > 0 ? rawConfig.beneficios.items : [{ titulo: "Servicio Garantizado", desc: "Calidad asegurada." }, { titulo: "Atención Rápida", desc: "Respondemos rápido." }, { titulo: "Experiencia", desc: "Años de trayectoria." }];

  const config: WebConfig = {
    logoUrl: rawConfig.logoUrl || negocio.logo_url,
    template: rawConfig.template || "modern",
    colors: { primary: negocio?.color_principal || "#000000", ...rawConfig.colors },
    hero: { mostrar: true, titulo: negocio?.nombre, subtitulo: negocio?.mensaje_bienvenida, ctaTexto: "Solicitar Presupuesto", imagenUrl: rawConfig.hero?.imagenUrl, ...rawConfig.hero },
    beneficios: { mostrar: true, titulo: "Nuestros Servicios", items: defaultBeneficios, ...rawConfig.beneficios },
    testimonios: { mostrar: rawConfig.testimonios?.mostrar ?? false, titulo: rawConfig.testimonios?.titulo || "Opiniones", items: rawConfig.testimonios?.items || [] },
    footer: { mostrar: true, textoCopyright: rawConfig.footer?.textoCopyright || `© ${new Date().getFullYear()} ${negocio.nombre}.`, ...rawConfig.footer }
  };

  const brandColor = config.colors.primary;
  const heroImage = config.hero.imagenUrl || negocio.imagen_url || "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200";

  const handleRating = async (stars: number) => {
    if (isEditorMode) return; // En modo editor, desactivamos acciones
    setRatingSeleccionado(stars);
    if (stars >= 4) {
      const { error } = await supabase.from("resenas").insert([{ negocio_id: negocio.id, puntuacion: stars, comentario: "Positiva", nombre_cliente: "Anónimo" }]);
      if (error) console.error(error);
      if (negocio.google_maps_link?.trim()) setTimeout(() => window.open(negocio.google_maps_link, '_blank'), 300);
      else { setMostrarGracias(true); setTimeout(() => setMostrarGracias(false), 5000); }
    } else setIsFeedbackModalOpen(true);
  };

  const handleEnviarFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    await supabase.from("resenas").insert([{ negocio_id: negocio.id, puntuacion: ratingSeleccionado, comentario: feedbackComentario, nombre_cliente: nombreCliente || "Anónimo" }]);
    setEnviando(false); setIsFeedbackModalOpen(false); setFeedbackComentario(""); setMostrarGracias(true); setTimeout(() => setMostrarGracias(false), 5000);
  };

  const handleConsultar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    if (!nombreCliente.trim()) { alert("Nombre requerido"); setEnviando(false); return; }
    await supabase.from("leads").insert([{ negocio_id: negocio.id, nombre_cliente: nombreCliente, telefono_cliente: "No especificado", estado: "nuevo" }]);
    window.open(`https://wa.me/${negocio.whatsapp}?text=${encodeURIComponent(`Hola, soy ${nombreCliente}...`)}`, '_blank');
    setEnviando(false); setIsLeadModalOpen(false); setNombreCliente("");
  };

  return (
    <div className={`min-h-screen bg-white text-zinc-900 pb-0 overflow-x-hidden ${fontClass}`}>
      
      {/* NAVBAR / LOGO (Editable) */}
      <nav className="absolute top-0 left-0 w-full z-30 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
            {/* AGREGAMOS EL EVENTO ONCLICK Y LA CLASE EDITABLE */}
            <div onClick={(e) => handleEditClick(e, 'identity')} className={editableClass}>
                {config.logoUrl ? <img src={config.logoUrl} alt="Logo" className="h-12 object-contain" /> : <span className="text-xl font-bold tracking-tight">{config.hero.titulo}</span>}
            </div>
        </div>
      </nav>

      {/* HERO (Editable) */}
      {config.hero.mostrar && (
      <header className="relative w-full overflow-hidden pt-24 pb-24 lg:pt-32 lg:pb-32 px-6">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-10 blur-3xl pointer-events-none" style={{ backgroundColor: brandColor }}></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-zinc-100 blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-700 text-center lg:text-left">
                {/* Título Editable */}
                <div onClick={(e) => handleEditClick(e, 'hero')} className={editableClass}>
                    <SafeHTML as="h1" html={config.hero.titulo} className="text-5xl lg:text-7xl font-bold tracking-tight text-zinc-900 leading-[1.1]" />
                </div>
                
                {/* Subtítulo Editable */}
                <div onClick={(e) => handleEditClick(e, 'hero')} className={editableClass}>
                    <SafeHTML as="p" html={config.hero.subtitulo} className="text-xl text-zinc-500 leading-relaxed max-w-lg mx-auto lg:mx-0" />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-2">
                  <button 
                    onClick={(e) => isEditorMode ? handleEditClick(e, 'hero') : setIsLeadModalOpen(true)}
                    className={`w-full sm:w-auto group relative inline-flex items-center justify-center gap-3 px-8 py-4 text-white font-bold text-lg shadow-xl shadow-zinc-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden ${buttonRadius} ${editableClass}`}
                    style={{ backgroundColor: brandColor }}
                  >
                    <span className="relative flex items-center gap-2">{config.hero.ctaTexto} <ArrowRight size={20} /></span>
                  </button>
                </div>
            </div>
            
            {/* Imagen Hero (Editable) */}
            <div onClick={(e) => handleEditClick(e, 'hero')} className={`relative animate-in fade-in slide-in-from-right-4 duration-1000 delay-200 lg:h-[500px] hidden lg:block ${editableClass}`}>
                <div className={`absolute inset-0 bg-zinc-900/5 transform rotate-3 scale-95 translate-x-4 ${cardRadius}`}></div>
                <div className={`relative h-full w-full overflow-hidden shadow-2xl border border-zinc-100 group ${cardRadius}`}>
                    <img src={heroImage} alt={config.hero.titulo} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                </div>
            </div>
        </div>
      </header>
      )}

      {/* BENEFICIOS (Editable) */}
      {config.beneficios.mostrar && (
      <section className="py-24 px-6 max-w-7xl mx-auto" onClick={(e) => handleEditClick(e, 'beneficios')}>
        {config.beneficios.titulo && (
            <h2 className={`text-3xl font-bold text-center mb-16 text-zinc-900 ${editableClass}`}>{config.beneficios.titulo}</h2>
        )}
        <div className="grid md:grid-cols-3 gap-8">
            {config.beneficios.items.map((item, i) => (
                <div key={i} className={editableClass}>
                    <BenefitCard icon={<CheckCircle size={28} />} title={item.titulo} desc={item.desc} color={brandColor} radiusClass={cardRadius} />
                </div>
            ))}
        </div>
      </section>
      )}

      {/* FOOTER */}
      {config.footer && config.footer.mostrar && (
        <Footer data={config.footer} negocioNombre={negocio.nombre} />
      )}

      {/* MODAL LEAD */}
      {isLeadModalOpen && (
        <Modal onClose={() => setIsLeadModalOpen(false)} radiusClass={cardRadius}>
            <div className="text-center mb-8 relative">
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-20 h-20 bg-white rounded-full p-2 shadow-xl">
                    <div className="w-full h-full rounded-full flex items-center justify-center text-white" style={{ backgroundColor: brandColor }}>
                        <Phone size={32} />
                    </div>
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 mt-6 mb-2">¡Hablemos ahora!</h3>
                <p className="text-zinc-500 text-sm">Déjanos tu nombre para avisarle al técnico.</p>
            </div>
            <form onSubmit={handleConsultar} className="space-y-4">
              <input autoFocus type="text" required value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} placeholder="Tu Nombre Completo" 
                className={`w-full px-5 py-4 bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-zinc-900 outline-none transition-all font-medium text-zinc-900 ${buttonRadius}`}
              />
              <button type="submit" disabled={enviando} 
                className={`w-full text-white font-bold py-4 transition-all hover:brightness-110 shadow-lg flex items-center justify-center gap-2 ${buttonRadius}`} 
                style={{ backgroundColor: brandColor }}
              >
                {enviando ? <Loader2 className="animate-spin" /> : <>Contactar por WhatsApp <ChevronRight /></>}
              </button>
            </form>
        </Modal>
      )}
      
      {/* MODAL FEEDBACK */}
      {isFeedbackModalOpen && (
        <Modal onClose={() => setIsFeedbackModalOpen(false)} radiusClass={cardRadius}>
            <div className="text-center mb-6">
                <div className="bg-yellow-50 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-600">
                    <MessageCircle size={28} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900">Ayúdanos a mejorar</h3>
                <p className="text-zinc-500 text-sm mt-2">¿Qué sucedió con tu experiencia?</p>
            </div>
            <form onSubmit={handleEnviarFeedback} className="space-y-4">
              <input type="text" value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} placeholder="Tu Nombre (Opcional)" 
                className={`w-full px-4 py-3 bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-zinc-900 outline-none text-zinc-900 ${buttonRadius}`}
              />
              <textarea required rows={4} value={feedbackComentario} onChange={(e) => setFeedbackComentario(e.target.value)} placeholder="Escribe tu comentario aquí..." 
                className={`w-full px-4 py-3 bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-zinc-900 outline-none resize-none text-zinc-900 ${buttonRadius}`}
              />
              <button type="submit" disabled={enviando} 
                className={`w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3.5 transition-colors shadow-lg ${buttonRadius}`}
              >
                {enviando ? "Enviando..." : "Enviar Sugerencia"}
              </button>
            </form>
        </Modal>
      )}
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---
function BenefitCard({ icon, title, desc, color, radiusClass }: any) {
    return (
        <div className={`p-8 bg-white border border-zinc-100 shadow-sm hover:shadow-lg transition-all duration-300 group text-center md:text-left ${radiusClass}`}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 mx-auto md:mx-0 transition-transform group-hover:scale-110 duration-300" style={{ backgroundColor: `${color}10`, color: color }}>
                {icon}
            </div>
            <div className="mb-3"><SafeHTML as="h3" html={title} className="font-bold text-xl text-zinc-900" /></div>
            <div><SafeHTML as="p" html={desc} className="text-zinc-500 text-base leading-relaxed" /></div>
        </div>
    )
}
function Modal({ children, onClose, radiusClass }: any) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`bg-white shadow-2xl w-full max-w-md p-8 relative animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 ${radiusClass}`}>
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-zinc-300 hover:text-zinc-600 rounded-full transition-all"><X size={20} /></button>
            {children}
          </div>
        </div>
    )
}