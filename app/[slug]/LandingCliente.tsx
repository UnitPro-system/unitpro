"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useSearchParams } from "next/navigation"; 
import { Phone, CheckCircle, X, Star, MessageCircle, ArrowRight, ShieldCheck, Loader2, ChevronRight, Heart, MapPin, Clock, Calendar as CalendarIcon, User, Mail } from "lucide-react";

import { SafeHTML } from "@/components/ui/SafeHTML";
import { Testimonials } from "@/components/blocks/Testimonials";
import { Footer } from "@/components/blocks/Footer";
import type { WebConfig } from "@/types/web-config";
import { getAvailability, createAppointment } from "../actions/google-calendar"; // <--- IMPORTAMOS LAS ACTIONS

export default function LandingCliente({ initialData }: { initialData: any }) {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const isEditorMode = searchParams.get('editor') === 'true';

  const [negocio, setNegocio] = useState<any>(initialData);
  
  // Muestra el link del evento creado
  const [eventLink, setEventLink] = useState(""); // <--- NUEVO
  
  // MODALES
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false); // Presupuesto rápido
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false); // <--- NUEVO: Modal de Turnos
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  // ESTADO DE AGENDAMIENTO (WIZARD)
  const [bookingStep, setBookingStep] = useState(1); // 1: Servicio, 2: Fecha/Hora, 3: Datos
  const [bookingData, setBookingData] = useState({
    service: "",
    date: "",
    time: "",
    clientName: "",
    clientPhone: "",
    clientEmail: ""
  });
  const [busySlots, setBusySlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  // ESTADOS GENERALES
  const [nombreCliente, setNombreCliente] = useState(""); // Para el modal simple
  const [feedbackComentario, setFeedbackComentario] = useState("");
  const [ratingSeleccionado, setRatingSeleccionado] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [mostrarGracias, setMostrarGracias] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "UPDATE_CONFIG" && event.data?.payload) {
        setNegocio((prev: any) => ({ ...prev, config_web: event.data.payload }));
      }
      if (event.data?.type === "UPDATE_DB" && event.data?.payload) {
        setNegocio((prev: any) => ({ ...prev, ...event.data.payload }));
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // --- LOGICA DE HORARIOS ---
  // Parsea el string "Lunes a Viernes: 09:00 - 18:00" para obtener límites
  const getBusinessHours = () => {
    if (!negocio.horarios) return { start: 9, end: 18 }; // Default
    try {
        const parts = negocio.horarios.split(':'); // "Lunes a Viernes" : " 09" : "00 - 18" : "00"
        // Esta es una heurística simple, idealmente guardaríamos start/end como columnas separadas
        // Buscamos patrones de hora HH:mm
        const times = negocio.horarios.match(/(\d{2}):(\d{2})/g);
        if (times && times.length >= 2) {
            const startHour = parseInt(times[0].split(':')[0]);
            const endHour = parseInt(times[1].split(':')[0]);
            return { start: startHour, end: endHour };
        }
    } catch(e) {}
    return { start: 9, end: 18 }; // Fallback
  };

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setBookingData({...bookingData, date, time: ""}); // Reset hora al cambiar fecha
    
    // Consultar disponibilidad en Google Calendar
    setLoadingSlots(true);
    const res = await getAvailability(negocio.slug, date);
    setLoadingSlots(false);
    
    if (res.success) {
        // Agregamos "as any" para decirle a TypeScript: "Confía en mí, esto existe"
        setBusySlots((res as any).busySlots);
    } else {
        console.error(res.error);
    }
  };

  const generateTimeSlots = () => {
    const { start, end } = getBusinessHours();
    const slots = [];
    for (let hour = start; hour < end; hour++) {
        // Generamos slots cada 1 hora (ej: 09:00, 10:00...)
        const timeString = `${hour.toString().padStart(2, '0')}:00`;
        
        // Verificar si choca con algún busySlot de Google
        const slotDate = new Date(`${bookingData.date}T${timeString}:00`);
        const isBusy = busySlots.some((busy: any) => {
            const busyStart = new Date(busy.start);
            const busyEnd = new Date(busy.end);
            // Si el slot empieza dentro de un evento ocupado
            return slotDate >= busyStart && slotDate < busyEnd;
        });

        slots.push({ time: timeString, available: !isBusy });
    }
    return slots;
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    
    const res = await createAppointment(negocio.slug, bookingData);
    
    setEnviando(false);
    if (res.success) {
        setIsBookingModalOpen(false);
        setMostrarGracias(true);
        setTimeout(() => setMostrarGracias(false), 5000);
        // Reset
        setBookingStep(1);
        setBookingData({ service: "", date: "", time: "", clientName: "", clientPhone: "", clientEmail: "" });
    } else {
        alert("Error al agendar: " + res.error);
    }
  };

  // --- CONFIG ---
  const handleEditClick = (e: React.MouseEvent, sectionName: string) => {
    if (!isEditorMode) return; 
    e.preventDefault(); e.stopPropagation();
    window.parent.postMessage({ type: "FOCUS_SECTION", section: sectionName }, "*");
  };
  const editableClass = isEditorMode ? "cursor-pointer hover:ring-2 hover:ring-indigo-500 hover:ring-offset-2 transition-all duration-200 rounded-lg relative z-50" : "";
  const rawConfig = negocio?.config_web || {};
  const appearance = rawConfig.appearance || { font: 'sans', radius: 'medium' };
  const fontClass = { 'sans': 'font-sans', 'serif': 'font-serif', 'mono': 'font-mono' }[appearance.font as string] || 'font-sans';
  const cardRadius = { 'none': 'rounded-none', 'medium': 'rounded-2xl', 'full': 'rounded-[2.5rem]' }[appearance.radius as string] || 'rounded-2xl';
  const buttonRadius = { 'none': 'rounded-none', 'medium': 'rounded-xl', 'full': 'rounded-full' }[appearance.radius as string] || 'rounded-xl';
  
  const config: WebConfig = {
    logoUrl: rawConfig.logoUrl || negocio.logo_url,
    template: rawConfig.template || "modern",
    colors: { primary: negocio?.color_principal || "#000000", ...rawConfig.colors },
    hero: { mostrar: true, layout: 'split', parallax: false, overlayOpacity: 50, titulo: negocio?.nombre, subtitulo: negocio?.mensaje_bienvenida, ctaTexto: "Solicitar Presupuesto", imagenUrl: rawConfig.hero?.imagenUrl, ...rawConfig.hero },
    beneficios: { mostrar: true, titulo: "Nuestros Servicios", items: [], ...rawConfig.beneficios },
    testimonios: { mostrar: rawConfig.testimonios?.mostrar ?? false, titulo: "Opiniones", items: [] },
    footer: { mostrar: true, textoCopyright: rawConfig.footer?.textoCopyright || `© ${new Date().getFullYear()} ${negocio.nombre}.`, ...rawConfig.footer }
  };
  const brandColor = config.colors.primary;
  const heroImage = config.hero.imagenUrl || negocio.imagen_url || "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200";

  // Handlers simples existentes
  const handleConsultar = async (e: React.FormEvent) => {
    e.preventDefault(); setEnviando(true);
    await supabase.from("leads").insert([{ negocio_id: negocio.id, nombre_cliente: nombreCliente, telefono_cliente: "No especificado", estado: "nuevo" }]);
    window.open(`https://wa.me/${negocio.whatsapp}?text=${encodeURIComponent(`Hola, soy ${nombreCliente}...`)}`, '_blank');
    setEnviando(false); setIsLeadModalOpen(false); setNombreCliente("");
  };

  return (
    <div className={`min-h-screen bg-white text-zinc-900 pb-0 overflow-x-hidden ${fontClass}`}>
      
      {/* TOP BAR */}
      {(negocio.direccion || negocio.horarios) && (
        <div onClick={(e) => handleEditClick(e, 'contact')} className={`w-full bg-zinc-900 text-zinc-300 text-xs py-2 px-6 flex flex-col sm:flex-row justify-between items-center gap-2 ${editableClass}`}>
            <div className="flex gap-4">
                {negocio.direccion && <span className="flex items-center gap-1.5"><MapPin size={12}/> {negocio.direccion}</span>}
                {negocio.horarios && <span className="flex items-center gap-1.5"><Clock size={12}/> {negocio.horarios}</span>}
            </div>
            {negocio.whatsapp && <div className="hidden sm:block text-zinc-500"><span className="flex items-center gap-1.5"><Phone size={12}/> {negocio.whatsapp}</span></div>}
        </div>
      )}

      {/* NAVBAR & HERO (CON BOTÓN DE AGENDAR) */}
      <nav className="absolute top-10 left-0 w-full z-30 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div onClick={(e) => handleEditClick(e, 'identity')} className={editableClass}>
                {config.logoUrl ? <img src={config.logoUrl} alt="Logo" className="h-12 object-contain" /> : <span className={`text-xl font-bold tracking-tight ${config.hero.layout === 'full' ? 'text-white drop-shadow-md' : 'text-zinc-900'}`}>{config.hero.titulo}</span>}
            </div>
            {/* BOTÓN AGENDAR EN NAVBAR (Opcional) */}
            <button onClick={() => setIsBookingModalOpen(true)} className="hidden md:flex bg-white text-zinc-900 px-5 py-2.5 rounded-full font-bold text-sm shadow-lg hover:bg-zinc-100 transition-colors items-center gap-2">
                <CalendarIcon size={16}/> Agendar Turno
            </button>
        </div>
      </nav>

      <header className="relative w-full overflow-hidden pt-32 pb-32 px-6">
         {/* Fondo decorativo */}
         <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-10 blur-3xl pointer-events-none" style={{ backgroundColor: brandColor }}></div>
         <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
            <div className="space-y-8 text-center lg:text-left">
                <SafeHTML as="h1" html={config.hero.titulo} className="text-5xl lg:text-7xl font-bold tracking-tight text-zinc-900 leading-[1.1]" />
                <SafeHTML as="p" html={config.hero.subtitulo} className="text-xl text-zinc-500 leading-relaxed max-w-lg mx-auto lg:mx-0" />
                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-2">
                    {/* BOTÓN PRINCIPAL: AGENDAR */}
                    <button onClick={() => setIsBookingModalOpen(true)} className={`w-full sm:w-auto group relative inline-flex items-center justify-center gap-3 px-8 py-4 text-white font-bold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden ${buttonRadius}`} style={{ backgroundColor: brandColor }}>
                        <span className="relative flex items-center gap-2"><CalendarIcon size={20}/> Solicitar Turno</span>
                    </button>
                    <button onClick={() => setIsLeadModalOpen(true)} className="text-sm font-bold text-zinc-500 hover:text-zinc-900 px-4 py-2">Consultar Presupuesto</button>
                </div>
            </div>
            {/* Imagen Hero */}
            <div className={`relative hidden lg:block h-[500px] ${cardRadius} overflow-hidden shadow-2xl`}>
                 <img src={heroImage} className="w-full h-full object-cover"/>
            </div>
         </div>
      </header>

      {/* ... RESTO DE SECCIONES (Beneficios, Footer, etc.) ... */}
      {config.beneficios.mostrar && <section className="py-24 px-6 max-w-7xl mx-auto"><h2 className="text-3xl font-bold text-center mb-16">{config.beneficios.titulo}</h2><div className="grid md:grid-cols-3 gap-8">{config.beneficios.items?.map((item:any, i:number) => <BenefitCard key={i} title={item.titulo} desc={item.desc} icon={<CheckCircle size={28}/>} color={brandColor} radiusClass={cardRadius}/>)}</div></section>}
      {config.footer?.mostrar && <Footer data={config.footer} negocioNombre={negocio.nombre} />}

      {/* --- MODAL DE AGENDAMIENTO (NUEVO) --- */}
      {isBookingModalOpen && (
        <Modal onClose={() => setIsBookingModalOpen(false)} radiusClass={cardRadius}>
            <div className="mb-6">
                <h3 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                    <CalendarIcon className="text-blue-600"/> Agendar Turno
                </h3>
                <p className="text-zinc-500 text-sm">Paso {bookingStep} de 3</p>
                {/* Progress Bar */}
                <div className="h-1 bg-zinc-100 rounded-full mt-2 w-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${(bookingStep / 3) * 100}%` }}></div>
                </div>
            </div>

            {/* PASO 1: SERVICIO */}
            {bookingStep === 1 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-right-4">
                    <p className="font-bold text-zinc-700 mb-2">Selecciona un servicio:</p>
                    <button onClick={() => { setBookingData({...bookingData, service: "Servicio 1"}); setBookingStep(2); }} className="w-full p-4 border border-zinc-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 text-left transition-all group">
                        <span className="font-bold block text-zinc-900 group-hover:text-blue-700">Servicio Estándar</span>
                        <span className="text-xs text-zinc-500">Duración: 1 hora</span>
                    </button>
                    <button onClick={() => { setBookingData({...bookingData, service: "Servicio 2"}); setBookingStep(2); }} className="w-full p-4 border border-zinc-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 text-left transition-all group">
                        <span className="font-bold block text-zinc-900 group-hover:text-blue-700">Servicio Premium</span>
                        <span className="text-xs text-zinc-500">Duración: 1 hora • Atención especial</span>
                    </button>
                </div>
            )}

            {/* PASO 2: FECHA Y HORA */}
            {bookingStep === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <button onClick={() => setBookingStep(1)} className="text-xs text-zinc-400 hover:text-zinc-600 mb-2 flex items-center gap-1">← Volver</button>
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">Elige el día</label>
                        <input 
                            type="date" 
                            min={new Date().toISOString().split('T')[0]} 
                            className="w-full p-3 border border-zinc-200 rounded-xl outline-none focus:border-blue-500"
                            onChange={handleDateChange}
                        />
                    </div>
                    
                    {bookingData.date && (
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">Horarios Disponibles</label>
                            {loadingSlots ? (
                                <div className="text-center py-4 text-zinc-400"><Loader2 className="animate-spin mx-auto"/> Buscando huecos...</div>
                            ) : (
                                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                    {generateTimeSlots().map((slot) => (
                                        <button 
                                            key={slot.time} 
                                            disabled={!slot.available}
                                            onClick={() => { setBookingData({...bookingData, time: slot.time}); setBookingStep(3); }}
                                            className={`py-2 text-sm rounded-lg border font-medium transition-all ${
                                                slot.available 
                                                    ? 'border-zinc-200 hover:border-blue-500 hover:bg-blue-50 text-zinc-700' 
                                                    : 'bg-zinc-100 text-zinc-300 cursor-not-allowed border-transparent'
                                            }`}
                                        >
                                            {slot.time}
                                        </button>
                                    ))}
                                    {generateTimeSlots().length === 0 && <p className="col-span-3 text-center text-xs text-zinc-400 py-2">No hay horarios o local cerrado.</p>}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* PASO 3: DATOS DEL CLIENTE */}
            {bookingStep === 3 && (
                <form onSubmit={handleConfirmBooking} className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <button type="button" onClick={() => setBookingStep(2)} className="text-xs text-zinc-400 hover:text-zinc-600 mb-2 flex items-center gap-1">← Volver</button>
                    
                    <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-3 text-sm text-blue-800 border border-blue-100">
                        <CalendarIcon size={16}/> 
                        <span>{new Date(bookingData.date).toLocaleDateString()} a las <strong>{bookingData.time}hs</strong></span>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">Nombre Completo</label>
                        <div className="relative">
                            <User size={16} className="absolute left-3 top-3.5 text-zinc-400"/>
                            <input required type="text" placeholder="Juan Pérez" className="w-full pl-10 p-3 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                onChange={e => setBookingData({...bookingData, clientName: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">Teléfono</label>
                        <div className="relative">
                            <Phone size={16} className="absolute left-3 top-3.5 text-zinc-400"/>
                            <input required type="tel" placeholder="+54 9 11..." className="w-full pl-10 p-3 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                onChange={e => setBookingData({...bookingData, clientPhone: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">Email</label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3 top-3.5 text-zinc-400"/>
                            <input required type="email" placeholder="juan@gmail.com" className="w-full pl-10 p-3 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                onChange={e => setBookingData({...bookingData, clientEmail: e.target.value})}
                            />
                        </div>
                    </div>

                    <button type="submit" disabled={enviando} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 transition-all flex justify-center items-center gap-2">
                        {enviando ? <Loader2 className="animate-spin"/> : "Confirmar Turno"}
                    </button>
                </form>
            )}
        </Modal>
      )}

      {/* MODAL DE ÉXITO */}
      {mostrarGracias && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm animate-in zoom-in-95">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} />
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 mb-2">¡Turno Confirmado!</h3>
                <p className="text-zinc-500">Te esperamos. Hemos enviado un correo con los detalles.</p>
                <button onClick={() => setMostrarGracias(false)} className="mt-6 text-sm font-bold text-zinc-400 hover:text-zinc-600">Cerrar</button>
            </div>
        </div>
      )}

      {/* OTROS MODALES (Presupuesto, Feedback - Se mantienen igual) */}
      {isLeadModalOpen && (/* ... código anterior ... */ <Modal onClose={() => setIsLeadModalOpen(false)} radiusClass={cardRadius}><p>Formulario Presupuesto...</p></Modal>)} 
      {/* (Para abreviar, asegurate de mantener el código de isLeadModalOpen y isFeedbackModalOpen original si lo usas) */}
    </div>
  );
}

function BenefitCard({ icon, title, desc, color, radiusClass }: any) {
    return (<div className={`p-8 bg-white border border-zinc-100 shadow-sm ${radiusClass}`}><div className="w-12 h-12 mb-4 text-zinc-900 bg-zinc-100 rounded-xl flex items-center justify-center">{icon}</div><h3 className="font-bold text-lg mb-2">{title}</h3><p className="text-zinc-500">{desc}</p></div>)
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