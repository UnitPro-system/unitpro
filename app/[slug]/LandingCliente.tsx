"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Phone, CheckCircle, Clock, MapPin, X, Star, MessageCircle, ArrowRight, ShieldCheck, Loader2, ChevronRight, Heart } from "lucide-react";

// --- IMPORTACIONES DE COMPONENTES ---
import { SafeHTML } from "@/components/ui/SafeHTML";
import { Testimonials } from "@/components/blocks/Testimonials";
import { Footer } from "@/components/blocks/Footer";
import type { WebConfig } from "@/types/web-config";

export default function LandingCliente({ initialData }: { initialData: any }) {
  const supabase = createClient();
  
  // Estado principal con los datos que vienen del servidor (ISR)
  const [negocio, setNegocio] = useState<any>(initialData);
  
  // Estados para Modales
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  
  // Estados de formularios y UI
  const [nombreCliente, setNombreCliente] = useState("");
  const [feedbackComentario, setFeedbackComentario] = useState("");
  const [ratingSeleccionado, setRatingSeleccionado] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [mostrarGracias, setMostrarGracias] = useState(false);

  // ---------------------------------------------------------
  // ⚡ ESCUCHA DE CAMBIOS EN TIEMPO REAL (PostMessage)
  // ---------------------------------------------------------
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Si recibimos un mensaje del tipo correcto, actualizamos el estado
      if (event.data?.type === "UPDATE_CONFIG" && event.data?.payload) {
        console.log("⚡ Configuración recibida en tiempo real:", event.data.payload);
        
        // Actualizamos solo la configuración visual, manteniendo el resto de datos
        setNegocio((prev: any) => ({
          ...prev,
          config_web: event.data.payload
        }));
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // --- 1. CONFIGURACIÓN ROBUSTA (Mapeo de JSON a TypeScript) ---
  const rawConfig = negocio?.config_web || {};
  
  // Helper para mezclar arrays por defecto si están vacíos
  const defaultBeneficios = rawConfig.beneficios?.items?.length > 0 
    ? rawConfig.beneficios.items 
    : [
        { titulo: "Servicio Garantizado", desc: "Calidad asegurada en cada trabajo." },
        { titulo: "Atención Rápida", desc: "Respondemos tus consultas al instante." },
        { titulo: "Experiencia", desc: "Años de trayectoria en el sector." }
      ];

  const config: WebConfig = {
    // Mapeo directo de propiedades de la raíz (como el logo)
    logoUrl: rawConfig.logoUrl || negocio.logo_url, // Prioridad al config, luego a la DB

    template: rawConfig.template || "modern",
    colors: {
        primary: negocio?.color_principal || "#000000",
        ...rawConfig.colors
    },
    hero: {
        mostrar: true,
        titulo: negocio?.nombre,
        subtitulo: negocio?.mensaje_bienvenida,
        ctaTexto: "Solicitar Presupuesto",
        imagenUrl: rawConfig.hero?.imagenUrl, // Importante mapearlo aquí
        ...rawConfig.hero
    },
    beneficios: {
        mostrar: true,
        titulo: "Nuestros Servicios",
        items: defaultBeneficios,
        ...rawConfig.beneficios
    },
    testimonios: {
        mostrar: rawConfig.testimonios?.mostrar ?? false,
        titulo: rawConfig.testimonios?.titulo || "Opiniones de Clientes",
        items: rawConfig.testimonios?.items || []
    },
    footer: {
        mostrar: true,
        textoCopyright: rawConfig.footer?.textoCopyright || `© ${new Date().getFullYear()} ${negocio.nombre}. Todos los derechos reservados.`,
        ...rawConfig.footer
    }
  };

  // --- 2. VARIABLES VISUALES CORREGIDAS ---
  const brandColor = config.colors.primary;
  
  // CORRECCIÓN CLAVE: Priorizamos la URL que viene del editor (config.hero.imagenUrl)
  // Si no hay en el editor, usamos la de la DB (negocio.imagen_url), y si no, un placeholder.
  const heroImage = config.hero.imagenUrl || negocio.imagen_url || "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200";

  // --- 3. HANDLERS (Lógica de Negocio) ---
  
  const handleRating = (stars: number) => {
    setRatingSeleccionado(stars);
    
    if (stars >= 4) {
      supabase.from("resenas").insert([{
        negocio_id: negocio.id,
        puntuacion: stars,
        comentario: "Calificación positiva (Rápida)",
        nombre_cliente: "Anónimo"
      }]);

      if (negocio.google_maps_link && negocio.google_maps_link.trim() !== "") {
        window.open(negocio.google_maps_link, '_blank');
      } else {
        setMostrarGracias(true);
        setTimeout(() => setMostrarGracias(false), 5000);
      }
    } else {
      setIsFeedbackModalOpen(true);
    }
  };

  const handleEnviarFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    
    await supabase.from("resenas").insert([{
        negocio_id: negocio.id,
        puntuacion: ratingSeleccionado,
        comentario: feedbackComentario,
        nombre_cliente: nombreCliente || "Anónimo"
    }]);

    setEnviando(false);
    setIsFeedbackModalOpen(false);
    setFeedbackComentario("");
    setMostrarGracias(true);
    setTimeout(() => setMostrarGracias(false), 5000);
  };

  const handleConsultar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);

    if (!nombreCliente.trim()) {
      alert("Por favor dinos tu nombre.");
      setEnviando(false);
      return;
    }

    await supabase.from("leads").insert([{
        negocio_id: negocio.id,
        nombre_cliente: nombreCliente,
        telefono_cliente: "No especificado",
        estado: "nuevo"
    }]);

    const mensaje = `Hola, soy ${nombreCliente}. Vi su web y quiero consultar.`;
    const url = `https://wa.me/${negocio.whatsapp}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
    
    setEnviando(false);
    setIsLeadModalOpen(false);
    setNombreCliente("");
  };

  // --- 4. RENDERIZADO VISUAL ---
  return (
    <div className="min-h-screen font-sans bg-white text-zinc-900 selection:bg-zinc-900 selection:text-white pb-0 overflow-x-hidden">
      
      {/* --- NUEVO: NAVBAR PARA MOSTRAR LOGO --- */}
      <nav className="absolute top-0 left-0 w-full z-30 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
            {config.logoUrl ? (
                <img src={config.logoUrl} alt="Logo Negocio" className="h-12 object-contain" />
            ) : (
                <span className="text-xl font-bold tracking-tight">{config.hero.titulo}</span>
            )}
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      {config.hero.mostrar && (
      <header className="relative w-full overflow-hidden pt-24 pb-24 lg:pt-32 lg:pb-32 px-6">
        {/* Decoración de fondo */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-10 blur-3xl pointer-events-none" style={{ backgroundColor: brandColor }}></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-zinc-100 blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-700 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-50 border border-zinc-200 shadow-sm text-sm font-medium text-zinc-600">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Disponible ahora
                </div>
                
                {/* Título */}
                <SafeHTML 
                  as="h1"
                  html={config.hero.titulo} 
                  className="text-5xl lg:text-7xl font-bold tracking-tight text-zinc-900 leading-[1.1]"
                />
                
                {/* Subtítulo */}
                <SafeHTML 
                  as="p"
                  html={config.hero.subtitulo} 
                  className="text-xl text-zinc-500 leading-relaxed max-w-lg mx-auto lg:mx-0"
                />

                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-2">
                  <button 
                    onClick={() => setIsLeadModalOpen(true)}
                    className="w-full sm:w-auto group relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-white font-bold text-lg shadow-xl shadow-zinc-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                    style={{ backgroundColor: brandColor }}
                  >
                    <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
                    <span className="relative flex items-center gap-2">
                        {config.hero.ctaTexto} <ArrowRight size={20} />
                    </span>
                  </button>
                  <div className="flex items-center gap-2 text-sm text-zinc-500 font-medium">
                     <span className="pl-2 flex items-center gap-1"><ShieldCheck size={16} className="text-emerald-500"/> Servicio Verificado</span>
                  </div>
                </div>
            </div>
            {/* Imagen Hero Dinámica */}
            <div className="relative animate-in fade-in slide-in-from-right-4 duration-1000 delay-200 lg:h-[500px] hidden lg:block">
                <div className="absolute inset-0 bg-zinc-900/5 rounded-[2.5rem] transform rotate-3 scale-95 translate-x-4"></div>
                <div className="relative h-full w-full rounded-[2rem] overflow-hidden shadow-2xl border border-zinc-100 group">
                    <img 
                      src={heroImage} 
                      alt={config.hero.titulo} 
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                    />
                </div>
            </div>
        </div>
      </header>
      )}

      {/* --- RATING SECTION --- */}
      <div className="w-full bg-zinc-900 text-white py-12 transform -skew-y-2 origin-left relative z-20 mt-[-50px] lg:mt-0 mb-12 overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ background: `linear-gradient(45deg, ${brandColor} 0%, transparent 100%)` }}></div>
          <div className="max-w-6xl mx-auto px-6 transform skew-y-2 flex flex-col md:flex-row items-center justify-between gap-6 min-h-[80px]">
              {!mostrarGracias ? (
                <>
                  <div className="text-center md:text-left animate-in fade-in slide-in-from-left-4">
                      <h3 className="text-2xl font-bold">¿Ya eres cliente?</h3>
                      <p className="text-zinc-400">Ayúdanos a mejorar con tu opinión.</p>
                  </div>
                  <div className="flex gap-2 bg-white/10 p-4 rounded-2xl backdrop-blur-sm animate-in fade-in slide-in-from-right-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} onClick={() => handleRating(star)} className="group/star transition-transform hover:scale-110 focus:outline-none">
                        <Star size={32} className={`transition-colors duration-200 ${ratingSeleccionado >= star ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-500 group-hover/star:text-yellow-200'}`} />
                        </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="w-full flex items-center justify-center gap-4 animate-in zoom-in-95 duration-300">
                    <div className="bg-emerald-500 text-white p-3 rounded-full shadow-lg">
                        <Heart size={32} fill="currentColor" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-white">¡Muchas gracias!</h3>
                        <p className="text-emerald-200">Tu opinión nos ayuda a crecer.</p>
                    </div>
                </div>
              )}
          </div>
      </div>

      {/* --- BENEFITS SECTION --- */}
      {config.beneficios.mostrar && (
      <section className="py-24 px-6 max-w-7xl mx-auto">
        {config.beneficios.titulo && (
            <h2 className="text-3xl font-bold text-center mb-16 text-zinc-900">{config.beneficios.titulo}</h2>
        )}
        <div className="grid md:grid-cols-3 gap-8">
            {config.beneficios.items.map((item, i) => (
                <BenefitCard 
                    key={i}
                    icon={<CheckCircle size={28} />} 
                    title={item.titulo} 
                    desc={item.desc} 
                    color={brandColor}
                />
            ))}
        </div>
      </section>
      )}

      {/* --- TESTIMONIOS --- */}
      {config.testimonios && config.testimonios.mostrar && (
        <Testimonials data={config.testimonios} primaryColor={brandColor} />
      )}

      {/* --- FOOTER --- */}
      {config.footer && config.footer.mostrar && (
        <Footer data={config.footer} negocioNombre={negocio.nombre} />
      )}

      {/* --- MODALES --- */}
      
      {isLeadModalOpen && (
        <Modal onClose={() => setIsLeadModalOpen(false)}>
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
              <input autoFocus type="text" required value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} placeholder="Tu Nombre Completo" className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all font-medium text-zinc-900"/>
              <button type="submit" disabled={enviando} className="w-full text-white font-bold py-4 rounded-xl transition-all hover:brightness-110 shadow-lg flex items-center justify-center gap-2" style={{ backgroundColor: brandColor }}>
                {enviando ? <Loader2 className="animate-spin" /> : <>Contactar por WhatsApp <ChevronRight /></>}
              </button>
            </form>
        </Modal>
      )}

      {isFeedbackModalOpen && (
        <Modal onClose={() => setIsFeedbackModalOpen(false)}>
            <div className="text-center mb-6">
                <div className="bg-yellow-50 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-600">
                    <MessageCircle size={28} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900">Ayúdanos a mejorar</h3>
                <p className="text-zinc-500 text-sm mt-2">¿Qué sucedió con tu experiencia?</p>
            </div>
            <form onSubmit={handleEnviarFeedback} className="space-y-4">
              <input type="text" value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} placeholder="Tu Nombre (Opcional)" className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-zinc-900"/>
              <textarea required rows={4} value={feedbackComentario} onChange={(e) => setFeedbackComentario(e.target.value)} placeholder="Escribe tu comentario aquí..." className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none resize-none text-zinc-900"/>
              <button type="submit" disabled={enviando} className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg">
                {enviando ? "Enviando..." : "Enviar Sugerencia"}
              </button>
            </form>
        </Modal>
      )}
    </div>
  );
}

// --- SUB-COMPONENTES AUXILIARES ---

function BenefitCard({ icon, title, desc, color }: any) {
    return (
        <div className="p-8 bg-white rounded-[2rem] border border-zinc-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group text-center md:text-left">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 mx-auto md:mx-0 transition-transform group-hover:scale-110 duration-300" style={{ backgroundColor: `${color}10`, color: color }}>
                {icon}
            </div>
            <div className="mb-3">
                <SafeHTML as="h3" html={title} className="font-bold text-xl text-zinc-900" />
            </div>
            <div>
                <SafeHTML as="p" html={desc} className="text-zinc-500 text-base leading-relaxed" />
            </div>
        </div>
    )
}

function Modal({ children, onClose }: any) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 relative animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-zinc-300 hover:text-zinc-600 rounded-full transition-all">
                <X size={20} />
            </button>
            {children}
          </div>
        </div>
    )
}