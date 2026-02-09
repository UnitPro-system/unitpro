"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useSearchParams } from "next/navigation"; 
import { Phone, CheckCircle, X, Star, MessageCircle, ArrowRight, ShieldCheck, Loader2, ChevronRight, Heart, MapPin, Clock, Calendar as CalendarIcon, User, Mail, Menu, Maximize2, ChevronLeft, Instagram, Facebook, Linkedin, Users, Globe, Tag } from "lucide-react";

import { SafeHTML } from "@/components/ui/SafeHTML";
import { Footer } from "@/components/blocks/Footer";
import type { WebConfig } from "@/types/web-config";
import { checkAvailability } from "@/app/actions/confirm-booking/check-availability"; 
import { createAppointment } from "@/app/actions/confirm-booking/manage-appointment"; 

export default function LandingCliente({ initialData }: { initialData: any }) {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const isEditorMode = searchParams.get('editor') === 'true';

  const [negocio, setNegocio] = useState<any>(initialData);
  const [eventLink, setEventLink] = useState(""); 
  
  // --- MODALES ---
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Estado para menú móvil

  // --- ESTADO WIZARD (AGENDAMIENTO) ---
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingData, setBookingData] = useState<{
  service: any | null; // Cambiamos string por el objeto completo o null
  date: string;
  time: string;
  worker: any | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  message: string;
  images: string[];
}>({
  service: null, 
  date: "", 
  time: "", 
  clientName: "", 
  clientPhone: "", 
  clientEmail: "",
  message: "",
  images: [],
  worker: null,
});
  const [busySlots, setBusySlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  // --- ESTADOS GENERALES ---
  const [nombreCliente, setNombreCliente] = useState(""); 
  const [feedbackComentario, setFeedbackComentario] = useState("");
  const [ratingSeleccionado, setRatingSeleccionado] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [mostrarGracias, setMostrarGracias] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollPrev = () => {
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollBy({ left: -340, behavior: 'smooth' });
    }
  };

  const scrollNext = () => {
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollBy({ left: 340, behavior: 'smooth' });
    }
  };
  
  // Mostrar valoraciones
  useEffect(() => {
    const fetchReviews = async () => {
        if (!negocio?.id) return;
        const { data } = await supabase
            .from('resenas')
            .select('*')
            .eq('negocio_id', negocio.id)
            .eq('visible', true) // <--- AGREGAR ESTA LÍNEA
            .order('created_at', { ascending: false });
        
        if (data) setReviews(data);
    };
    fetchReviews();
  }, [negocio?.id]);
  
  useEffect(() => {
    const fetchAvailability = async () => {
        if (bookingData.date && negocio.slug) {
            // --- LOG TEMPORAL ---
            console.log("Frontend pidiendo disponibilidad:", {
                fecha: bookingData.date,
                workerID: bookingData.worker?.id, // <--- ESTO NO DEBE SER UNDEFINED
                workerNombre: bookingData.worker?.nombre
            });
            // --------------------

            setLoadingSlots(true);
            try {
                const res = await checkAvailability(negocio.slug, bookingData.date, bookingData.worker?.id);
                if (res.success && res.busy) {
                    setBusySlots(res.busy);
                } else {
                    setBusySlots([]);
                }
            } catch (error) {
                console.error("Error buscando disponibilidad:", error);
            } finally {
                setLoadingSlots(false);
            }
        }
    };

    fetchAvailability();
  }, [bookingData.date, bookingData.worker, negocio.slug]);

  // --- LISTENER DEL EDITOR ---
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

  // --- LÓGICA DE HORARIOS ---
  const getBusinessHours = () => {
    if (!negocio.horarios) return { start: 9, end: 18 }; 
    try {
        const times = negocio.horarios.match(/(\d{2}):(\d{2})/g);
        if (times && times.length >= 2) {
            const startHour = parseInt(times[0].split(':')[0]);
            const endHour = parseInt(times[1].split(':')[0]);
            return { start: startHour, end: endHour };
        }
    } catch(e) {}
    return { start: 9, end: 18 }; 
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    if (!dateStr) return;

    // Chequeo rápido de día cerrado
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayIndex = new Date(y, m - 1, d).getDay();
    const schedule = negocio.config_web?.schedule;
    
    // Si existe configuración y el día está cerrado...
    if (schedule && schedule[String(dayIndex)]?.isOpen === false) {
        const dias = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
        alert(`El negocio permanece cerrado los ${dias[dayIndex]}. Por favor elige otra fecha.`);
        // Reseteamos el valor del input (opcional, o dejamos que el usuario lo cambie)
        setBookingData(prev => ({ ...prev, date: "" })); 
        setBusySlots([]);
        return;
    }

    // Flujo normal
    setBookingData(prev => ({ ...prev, date: dateStr, time: "" })); 
    setBusySlots([]); 
};

  const generateTimeSlots = () => {
    // 1. Obtener fecha y día de la semana de forma segura
    if (!bookingData.date) return [];
    
    const [year, month, day] = bookingData.date.split('-').map(Number);
    // Creamos la fecha localmente para obtener el día correcto (0-6)
    const dateObj = new Date(year, month - 1, day); 
    const dayOfWeek = String(dateObj.getDay()); // "0" = Domingo, "1" = Lunes...

    // 2. Obtener configuración del día
    const schedule = negocio.config_web?.schedule || {};
    const dayConfig = schedule[dayOfWeek];

    // Variables para definir apertura y cierre
    let openHour = 9;
    let openMin = 0;
    let closeHour = 18;
    let closeMin = 0;

    // LÓGICA PRINCIPAL: Usar el schedule configurado
    if (dayConfig) {
        if (!dayConfig.isOpen) return []; // Si está marcado como cerrado, no devolvemos slots

        const [startH, startM] = dayConfig.start.split(':').map(Number);
        const [endH, endM] = dayConfig.end.split(':').map(Number);
        
        openHour = startH;
        openMin = startM;
        closeHour = endH;
        closeMin = endM;
    } else {
        // FALLBACK: Si no hay schedule nuevo, intentamos usar el string antiguo o valores por defecto
        const legacy = getBusinessHours(); // Tu función antigua (puedes mantenerla como auxiliar)
        openHour = legacy.start;
        closeHour = legacy.end;
    }

    const slots = [];
    // Duración del servicio o 60 min por defecto
    const serviceDuration = bookingData.service?.duracion || 60; 
    const INTERVAL_STEP = 30; // Saltos de 30 minutos en la grilla

    // 3. Generación de Slots
    for (let hour = openHour; hour <= closeHour; hour++) {
        for (let min = 0; min < 60; min += INTERVAL_STEP) {
            
            // FILTRO DE INICIO: Si estamos en la hora de apertura, respetar los minutos
            // Ej: Si abre 9:30, no generar 9:00
            if (hour === openHour && min < openMin) continue;

            // FILTRO DE CIERRE: Si nos pasamos de la hora de cierre, parar.
            if (hour > closeHour || (hour === closeHour && min >= closeMin)) break;

            const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
            
            // Construimos objetos Date para comparar colisiones
            const slotStart = new Date(`${bookingData.date}T${timeString}:00`);
            const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);

            // Validar que el servicio termine ANTES de cerrar
            const closingTime = new Date(`${bookingData.date}T${closeHour.toString().padStart(2, '0')}:${closeMin.toString().padStart(2, '0')}:00`);
            
            if (slotEnd > closingTime) continue;

            // 4. Verificar BusySlots (Google Calendar)
            const isBusy = busySlots.some((busy: any) => {
                const busyStart = new Date(busy.start);
                const busyEnd = new Date(busy.end);
                // Si se solapan de alguna forma
                return (slotStart < busyEnd && slotEnd > busyStart);
            });
            
            if (!isBusy) {
                slots.push({ time: timeString, available: true });
            }
        }
    }
    return slots;
};

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    
    const serviceDuration = bookingData.service?.duracion || 60;
    const slotStart = new Date(`${bookingData.date}T${bookingData.time}:00`);
    const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);

    const payload = {
        service: bookingData.service?.titulo, // Enviamos el nombre string al backend
        date: bookingData.date,
        time: bookingData.time,
        clientName: bookingData.clientName,
        clientPhone: bookingData.clientPhone,
        clientEmail: bookingData.clientEmail,
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        calendarId: bookingData.worker?.calendarId, // Para backend
        workerName: bookingData.worker?.nombre,
        workerId: bookingData.worker?.id,
    };
    
    const res = await createAppointment(negocio.slug, payload);
    
    setEnviando(false);
    if (res.success) {
        setIsBookingModalOpen(false);
        if ((res as any).eventLink) setEventLink((res as any).eventLink); 
        setMostrarGracias(true);
        setBookingStep(1);
        setBookingData({ service: null, date: "", time: "", clientName: "", clientPhone: "", clientEmail: "", worker: null, message: "", images: [] });
    } else {
        alert("Error: " + res.error);
    }
  };

  // --- LÓGICA FEEDBACK / LEAD ---
  const handleEnviarFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ratingSeleccionado === 0) return alert("Por favor, selecciona una puntuación.");
    setEnviando(true);

    // 1. Guardamos SIEMPRE en tu base de datos (para tu control interno)
    const { error } = await supabase.from("resenas").insert([{
        negocio_id: negocio.id,
        puntuacion: ratingSeleccionado,
        comentario: feedbackComentario,
        nombre_cliente: nombreCliente || "Anónimo"
    }]);

    setEnviando(false);
    
    if (!error) {
        setIsFeedbackModalOpen(false); // Cerramos modal
        
        // 2. LÓGICA DE REDIRECCIÓN INTELIGENTE
        if (ratingSeleccionado >= 4 && negocio.google_maps_link) {
            // Clientes felices (4 o 5) -> Los invitamos a Google Maps
            const irAGoogle = window.confirm("¡Muchas gracias por tu calificación!\n\n¿Te gustaría ayudarnos publicando esto mismo en Google Maps?");
            if(irAGoogle) {
                 window.open(negocio.google_maps_link, '_blank');
            }
        } else {
            // Clientes insatisfechos (1, 2 o 3) -> Solo agradecemos (feedback privado)
            alert("Gracias por tu opinión. Trabajaremos para mejorar nuestro servicio.");
        }

        // Limpiamos el formulario
        setFeedbackComentario(""); 
        setRatingSeleccionado(0); 
        setNombreCliente("");
    } else {
        alert("Hubo un error al guardar. Intenta nuevamente.");
    }
  };

  const handleConsultar = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setEnviando(true);
    await supabase.from("leads").insert([{ negocio_id: negocio.id, nombre_cliente: nombreCliente, telefono_cliente: "No especificado", estado: "nuevo" }]);
    window.open(`https://wa.me/${negocio.whatsapp}?text=${encodeURIComponent(`Hola, soy ${nombreCliente}, consulta...`)}`, '_blank');
    setEnviando(false); setIsLeadModalOpen(false); setNombreCliente("");
  };

  // --- UX HELPERS ---
  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // --- CONFIG VISUAL ---
  const handleEditClick = (e: React.MouseEvent, sectionName: string) => {
    if (!isEditorMode) return; 
    e.preventDefault(); e.stopPropagation();
    window.parent.postMessage({ type: "FOCUS_SECTION", section: sectionName }, "*");
  };
  
  const editableClass = isEditorMode ? "cursor-pointer hover:ring-2 hover:ring-indigo-500 hover:ring-offset-2 transition-all duration-200 rounded-lg relative z-50" : "";
  const rawConfig = negocio?.config_web || {};
  const appearance = rawConfig.appearance || { font: 'sans', radius: 'medium' };
  
  // Tailwind dinámico
  const fontClass = { 'sans': 'font-sans', 'serif': 'font-serif', 'mono': 'font-mono' }[appearance.font as string] || 'font-sans';
  const radiusClass = { 'none': 'rounded-none', 'medium': 'rounded-2xl', 'full': 'rounded-[2.5rem]' }[appearance.radius as string] || 'rounded-2xl';
  const btnRadius = { 'none': 'rounded-none', 'medium': 'rounded-xl', 'full': 'rounded-full' }[appearance.radius as string] || 'rounded-xl';
  const cardRadius = { 'none': 'rounded-none', 'medium': 'rounded-2xl', 'full': 'rounded-[2.5rem]' }[appearance.radius as string] || 'rounded-2xl';
  const buttonRadius = { 'none': 'rounded-none', 'medium': 'rounded-xl', 'full': 'rounded-full' }[appearance.radius as string] || 'rounded-xl';
  const config: WebConfig = {
    logoUrl: rawConfig.logoUrl || negocio.logo_url,
    template: rawConfig.template || "modern",
    colors: { primary: negocio?.color_principal || "#000000", ...rawConfig.colors },
    hero: { mostrar: true, layout: 'split', ...rawConfig.hero },
    servicios: { mostrar: true, titulo: "Nuestros Servicios", items: [], ...rawConfig.servicios },
    equipo: { mostrar: false, items: [], ...rawConfig.equipo },
    testimonios: { mostrar: rawConfig.testimonios?.mostrar ?? false, titulo: "Opiniones", items: [] },
    ubicacion: { mostrar: true, ...rawConfig.ubicacion },
    footer: { mostrar: true, textoCopyright: rawConfig.footer?.textoCopyright,
        redesSociales: {
            instagram: negocio.instagram, 
            facebook: negocio.facebook,   
            linkedin: negocio.linkedin,  
            whatsapp: negocio.whatsapp}, ...rawConfig.footer },
    customSections: rawConfig.customSections || [],
    sectionOrder: rawConfig.sectionOrder
  };

  const defaultOrder = [
      'hero', 
      'servicios', 
      ...(config.customSections?.map((s:any) => s.id) || []), 
      'testimonios',
      'ubicacion'
  ];

  // Este es el array final que usaremos para pintar
  const activeOrder = config.sectionOrder && config.sectionOrder.length > 0 
      ? config.sectionOrder 
      : defaultOrder;
  
  const brandColor = config.colors.primary;
  const secondaryColor = config.colors.secondary || "#ffffff"; // Color de Fondo
  const textColor = config.colors.text || "#1f2937";
  const heroImage = config.hero.imagenUrl || negocio.imagen_url || "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200";
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  
  return (
    <div 
    className={`min-h-screen pb-0 overflow-x-hidden ${fontClass}`}
    style={{ backgroundColor: secondaryColor, color: textColor }}>
      
      {/* --- NAVBAR DE NAVEGACIÓN --- */}
      <nav className="fixed top-0 left-0 w-full z-40 bg-white/80 backdrop-blur-md border-b border-zinc-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
            
            {/* Logo o Nombre (Izquierda) */}
            <div onClick={(e) => handleEditClick(e, 'identity')} className={`cursor-pointer ${editableClass}`}>
                {config.logoUrl ? (
                    <img src={config.logoUrl} alt="Logo" className="h-10 object-contain" />
                ) : (
                    <span className="text-xl font-bold tracking-tight text-zinc-900">{negocio.nombre}</span>
                )}
            </div>

            {/* Menú Desktop */}
            <div className="hidden md:flex items-center gap-8">
                <button onClick={() => scrollToSection('inicio')} className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Inicio</button>
                {config.servicios?.mostrar && (
                <button onClick={() => scrollToSection('servicios')} className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Servicios</button>
                )}
                {config.ubicacion?.mostrar && (
                <button onClick={() => scrollToSection('ubicacion')} className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Dónde estamos</button>
                )}
                <button onClick={() => scrollToSection('contacto')} className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Contacto</button>
                
                <button 
                    onClick={() => setIsBookingModalOpen(true)} 
                    className={`px-5 py-2.5 text-white font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all ${btnRadius}`}
                    style={{ backgroundColor: brandColor }}
                >
                    Reservar Turno
                </button>
            </div>

            {/* Menú Móvil Toggle */}
            <button className="md:hidden p-2 text-zinc-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X/> : <Menu/>}
            </button>
        </div>

        {/* Menú Móvil Dropdown */}
        {mobileMenuOpen && (
            <div className="md:hidden bg-white border-t border-zinc-100 p-6 flex flex-col gap-4 shadow-xl">
                <button onClick={() => scrollToSection('inicio')} className="text-left font-medium text-zinc-600 py-2">Inicio</button>
                {config.servicios?.mostrar && (
                <button onClick={() => scrollToSection('servicios')} className="text-left font-medium text-zinc-600 py-2">Servicios</button>
                )}
                {config.ubicacion?.mostrar && (
                <button onClick={() => scrollToSection('ubicacion')} className="text-left font-medium text-zinc-600 py-2">Dónde estamos</button>
                )}
                <button onClick={() => scrollToSection('contacto')} className="text-left font-medium text-zinc-600 py-2">Contacto</button>
                <button onClick={() => {setIsBookingModalOpen(true); setMobileMenuOpen(false)}} className="w-full bg-zinc-900 text-white font-bold py-3 rounded-xl mt-2">Reservar Turno</button>
            </div>
        )}
      </nav>

      {/* --- HERO SECTION --- */}
      <header id="inicio" className="relative w-full h-screen min-h-[600px] flex items-center justify-center overflow-hidden" onClick={(e) => handleEditClick(e, 'hero')}>
         
         {/* Fondo con Overlay */}
         <div className="absolute inset-0 w-full h-full z-0">
            <img src={heroImage} className="w-full h-full object-cover" alt="Fondo"/>
            <div className="absolute inset-0 bg-black transition-all duration-300" style={{ opacity: (config.hero.overlayOpacity || 50) / 100 }}></div>
         </div>

         {/* Contenido Central */}
         <div className={`relative z-10 max-w-4xl mx-auto px-6 text-center flex flex-col items-center gap-6 ${editableClass}`}>
            
            {/* Logo en el Hero (Condicional si se desea repetir o si no está en nav) */}
            {config.logoUrl && (
                <div className="w-24 h-24 md:w-32 md:h-32 bg-white/10 backdrop-blur-md rounded-full p-4 mb-4 flex items-center justify-center shadow-2xl border border-white/20">
                     <img src={config.logoUrl} alt="Logo Hero" className="w-full h-full object-contain drop-shadow-md"/>
                </div>
            )}

            <div className="bg-white/10 backdrop-blur-sm border border-white/10 p-8 md:p-12 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-700">
                <SafeHTML as="h1" html={config.hero.titulo} className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 drop-shadow-lg" />
                <SafeHTML as="p" html={config.hero.subtitulo} className="text-lg md:text-xl text-zinc-200 max-w-2xl mx-auto mb-8 leading-relaxed" />
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button 
                        onClick={() => setIsBookingModalOpen(true)} 
                        className={`w-full sm:w-auto px-8 py-4 text-white font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 ${btnRadius}`} 
                        style={{ backgroundColor: brandColor }}
                    >
                        <CalendarIcon size={20}/> {config.hero.ctaTexto || "Reservar Turno"}
                    </button>
                    <button onClick={() => scrollToSection('servicios')} className="text-white hover:text-zinc-200 font-medium px-6 py-3 transition-colors">
                        Ver Servicios
                    </button>
                </div>
            </div>
         </div>
      </header>

      {/* --- SERVICIOS --- */}
      {config.servicios?.mostrar && (
          // Quitamos bg-zinc-50 para que se vea tu color de fondo secundario
          <section id="servicios" className="py-24 px-6" onClick={(e) => handleEditClick(e, 'servicios')}>
            <div className={`max-w-7xl mx-auto ${editableClass}`}>
                {config.servicios?.titulo && (
                    <div className="text-center mb-16">
                        <span className="text-sm font-bold uppercase tracking-wider opacity-60">Lo que hacemos</span>
                        {/* Usamos 'inherit' en el color para respetar tu configuración */}
                        <h2 className="text-3xl md:text-4xl font-bold mt-2" style={{ color: textColor }}>{config.servicios.titulo}</h2>
                        <div className="w-20 h-1.5 mt-4 mx-auto rounded-full" style={{ backgroundColor: brandColor }}></div>
                    </div>
                )}
                
                <div className="grid md:grid-cols-3 gap-8">
                    {/* Combinamos servicios normales y promociones */}
                    {[...(config.servicios?.items || []), ...(negocio.config_web?.services || [])].map((service: any, i: number) => {
                        
                        // LÓGICA DE PROMOCIÓN
                        const isPromo = service.isPromo && service.promoEndDate;
                        const isExpired = isPromo && new Date(service.promoEndDate) < new Date();

                        // Normalizamos nombres de campos (para soportar ambos formatos)
                        const titulo = service.name || service.titulo;
                        const precio = service.price || service.precio;
                        const desc = service.description || service.desc;
                        const duracion = service.duration || service.duracion || 60;

                        // Si la promo expiró, no la mostramos
                        if (isExpired) return null;

                        return (
                            <div 
                                key={service.id || i} 
                                className={`
                                    relative p-8 transition-all duration-300 group cursor-pointer
                                    ${radiusClass}
                                    ${isPromo 
                                        ? 'bg-gradient-to-br from-pink-50 to-white border-2 border-pink-200 shadow-lg shadow-pink-100 transform hover:-translate-y-2' 
                                        : 'border border-zinc-500/10 shadow-sm hover:shadow-xl hover:-translate-y-2'
                                    }
                                `}
                                style={{ backgroundColor: isPromo ? undefined : 'rgba(255,255,255,0.05)' }}
                                onClick={() => {
                                    // Conectamos con tu lógica de reserva existente
                                    setBookingData(prev => ({ ...prev, service: service }));
                                    setBookingStep(2); // Pasamos directo a elegir profesional (o al siguiente paso)
                                    setIsBookingModalOpen(true);
                                }}
                            >
                                {/* BADGE DE PROMOCIÓN */}
                                {isPromo ? (
                                    <div className="absolute -top-3 right-4 bg-pink-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm uppercase tracking-wider flex items-center gap-1 z-10">
                                        <Tag size={10} /> Oferta Limitada
                                    </div>
                                ) : (
                                    // Icono normal para servicios estándar
                                    <div className="w-14 h-14 mb-6 text-white rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: brandColor }}>
                                        <CheckCircle size={28}/>
                                    </div>
                                )}

                                <h3 className={`font-bold text-xl mb-3 ${isPromo ? 'text-pink-900' : ''}`} style={{ color: isPromo ? undefined : textColor }}>
                                    {titulo}
                                </h3>
                                
                                <p className={`leading-relaxed opacity-70 mb-4 ${isPromo ? 'text-pink-800 font-medium' : ''}`}>
                                    {/* Si es número, le agregamos el $ */}
                                    {typeof precio === 'number' || !isNaN(Number(precio)) ? `$${precio}` : precio}
                                </p>

                                {/* INFO DE VENCIMIENTO SI ES PROMO */}
                                {isPromo && (
                                    <div className="mb-4 text-xs font-bold text-pink-600 bg-pink-100/50 p-2 rounded-lg text-center border border-pink-100">
                                        🔥 Válido hasta el {new Date(service.promoEndDate).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                    </div>
                                )}

                                <div className="flex flex-row items-center gap-2 text-xs font-bold text-zinc-400 mb-2">
                                    <Clock size={12} />
                                    <span>{duracion} min</span>
                                </div>
                                
                                <p className="leading-relaxed opacity-70 text-sm line-clamp-3">
                                    {desc}
                                </p>

                                {/* Botón de acción visual */}
                                <div className={`mt-6 w-full py-2 rounded-lg text-center text-sm font-bold transition-colors ${isPromo ? 'bg-pink-600 text-white group-hover:bg-pink-700' : 'bg-zinc-100 text-zinc-600 group-hover:bg-zinc-900 group-hover:text-white'}`}>
                                    Reservar
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
          </section>
      )}
      
      {/* --- NUEVA SECCIÓN: EQUIPO --- */}
      {config.equipo?.mostrar && (
        <section id="equipo" className="py-24 px-6 bg-zinc-50 border-t border-zinc-200">
            <div className="max-w-7xl mx-auto text-center mb-12">
                 <span className="text-sm font-bold uppercase tracking-wider opacity-60">Nuestro Equipo</span>
                 <h2 className="text-3xl font-bold mt-2 mb-4" style={{ color: textColor }}>{config.equipo.titulo}</h2>
                 {config.equipo.subtitulo && <p className="text-zinc-500 max-w-2xl mx-auto">{config.equipo.subtitulo}</p>}
            </div>
            <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
                {config.equipo.items?.map((item: any, i: number) => (
                    <div key={i} className="flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow-sm border border-zinc-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                        <div className="w-24 h-24 rounded-full overflow-hidden mb-4 bg-zinc-100 border-2 border-white shadow-md">
                             {item.imagenUrl ? (
                                <img src={item.imagenUrl} className="w-full h-full object-cover" alt={item.nombre}/>
                             ) : (
                                <Users className="w-full h-full p-6 text-zinc-300"/>
                             )}
                        </div>
                        <h3 className="font-bold text-lg" style={{ color: textColor }}>{item.nombre}</h3>
                        <p className="text-zinc-500 max-w-2xl mx-auto">{item.cargo}</p>
                    </div>
                ))}
            </div>
        </section>
      )}
      {/* --- SECCIÓN FEEDBACK (SOLO BOTÓN) --- */}
      {/* --- SECCIÓN TESTIMONIOS/RESEÑAS --- */}
      {config.testimonios?.mostrar && (
      <section className="py-24 px-6 bg-zinc-50 border-y border-zinc-100">
          <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12 max-w-3xl mx-auto">
                <span className="text-sm font-bold uppercase tracking-wider opacity-60 block mb-2">Testimonios</span>
                <h2 className="text-3xl font-bold mb-4" style={{ color: textColor }}>
                    Lo que dicen nuestros clientes
                </h2>
                <p className="text-zinc-500 mb-8">
                    La confianza de nuestros clientes es nuestra mejor carta de presentación.
                </p>
                <button 
                    onClick={() => setIsFeedbackModalOpen(true)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all text-sm"
                    style={{ backgroundColor: brandColor }}
                >
                    <Star size={18} className="fill-current"/> Dejar mi valoración
                </button>
              </div>

              {/* LISTA DE RESEÑAS CON CARRUSEL */}
              {reviews.length > 0 ? (
                <div className="relative">
                    
                    {/* Botón Izquierda (Solo si hay +3 reseñas) */}
                    {reviews.length > 3 && (
                        <button 
                            onClick={scrollPrev}
                            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 z-20 bg-white p-3 rounded-full shadow-lg border border-zinc-100 text-zinc-600 hover:text-indigo-600 hover:scale-110 transition-all"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    )}

                    {/* Contenedor Scrollable */}
                    <div 
                        ref={scrollContainerRef}
                        className={`flex gap-6 overflow-x-auto pb-8 px-2 snap-x snap-mandatory ${reviews.length > 3 ? 'cursor-grab active:cursor-grabbing' : 'justify-center'}`}
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Oculta la barra de scroll nativa
                    >
                        {reviews.map((review) => (
                            <div 
                                key={review.id} 
                                // CAMBIO: Usamos anchos fijos (w-[350px]) en lugar de grid flexible
                                className={`snap-center shrink-0 w-[85vw] md:w-[350px] lg:w-[400px] p-6 bg-white shadow-sm border border-zinc-100 flex flex-col ${cardRadius}`}
                            >
                                {/* Estrellas */}
                                <div className="flex gap-1 mb-4">
                                    {[...Array(5)].map((_, i) => (
                                        <Star 
                                            key={i} 
                                            size={16} 
                                            className={i < review.puntuacion ? "text-yellow-400 fill-yellow-400" : "text-zinc-200"} 
                                        />
                                    ))}
                                </div>
                                
                                {/* Comentario */}
                                <div className="flex-1">
                                    <p className="text-zinc-600 mb-6 italic text-sm leading-relaxed">"{review.comentario}"</p>
                                </div>

                                {/* Autor */}
                                <div className="flex items-center gap-3 pt-4 border-t border-zinc-50 mt-auto">
                                    <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-400 text-xs uppercase">
                                        {review.nombre_cliente?.charAt(0) || "A"}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-zinc-900">{review.nombre_cliente || "Anónimo"}</p>
                                        <p className="text-[10px] text-zinc-400 uppercase font-medium">{new Date(review.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Botón Derecha (Solo si hay +3 reseñas) */}
                    {reviews.length > 3 && (
                        <button 
                            onClick={scrollNext}
                            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 z-20 bg-white p-3 rounded-full shadow-lg border border-zinc-100 text-zinc-600 hover:text-indigo-600 hover:scale-110 transition-all"
                        >
                            <ChevronRight size={24} />
                        </button>
                    )}
                </div>
              ) : (
                <div className="text-center text-zinc-400 py-10 italic bg-white rounded-2xl border border-dashed border-zinc-200">
                    Aún no hay reseñas visibles. ¡Sé el primero en opinar!
                </div>
              )}
          </div>
      </section>
      )}
      {/* --- SECCIONES DINÁMICAS (Nuevo Bloque) --- */}
      {config.customSections?.map((section: any) => (
        <section key={section.id} className="py-20 px-6 max-w-7xl mx-auto">
            
            {/* Si es QUIENES SOMOS */}
            {section.type === 'about' && (
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className={section.imagenUrl ? 'order-1' : ''}>
                        <h2 className="text-3xl font-bold mb-6 text-zinc-900">{section.titulo}</h2>
                        {/* Usamos SafeHTML para que respete saltos de línea */}
                        <SafeHTML as="div" html={section.texto} className="text-lg text-zinc-600 leading-relaxed whitespace-pre-line" />
                    </div>
                    {section.imagenUrl && (
                        <div className={`overflow-hidden shadow-xl h-[400px] ${cardRadius}`}>
                            <img src={section.imagenUrl} alt={section.titulo} className="w-full h-full object-cover"/>
                        </div>
                    )}
                </div>
            )}

            {/* Si es GALERÍA */}
            {section.type === 'gallery' && (
                <div>
                    <h2 className="text-3xl font-bold mb-12 text-center text-zinc-900">{section.titulo}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {section.imagenes?.map((img: any, i: number) => (
                            <div 
                                key={i} 
                                onClick={() => setSelectedImage(img.url)} // <--- ESTO ES NUEVO
                                className={`group relative aspect-square overflow-hidden bg-zinc-100 cursor-zoom-in ${cardRadius}`} // <--- cursor-zoom-in AGREGADO
                            >
                                <img src={img.url} alt={img.descripcion} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"/>
                                
                                {/* --- OVERLAY NUEVO (Icono al pasar mouse) --- */}
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                     <Maximize2 className="text-white drop-shadow-md" size={24} />
                                </div>

                                {img.descripcion && (
                                    <div className="absolute bottom-0 left-0 w-full bg-black/60 text-white p-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                        {img.descripcion}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
      ))}

      {/* --- UBICACIÓN (NUEVA SECCIÓN) --- */}
      {config.ubicacion?.mostrar && (
        <section id="ubicacion" className="py-24 px-6 relative overflow-hidden" onClick={(e) => handleEditClick(e, 'contact')}>
            <div className={`max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center ${editableClass}`}>
                <div>
                    <span className="text-sm font-bold uppercase tracking-wider opacity-60">Dónde estamos</span>
                    <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-6" style={{ color: textColor }}>Visítanos en nuestra sucursal</h2>
                    <p className="mb-8 text-lg opacity-70">Estamos listos para atenderte con la mejor calidad y servicio. Agenda tu cita o ven directamente.</p>
                    
                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: brandColor + '20', color: brandColor }}><MapPin size={20}/></div>
                            <div>
                                <h4 className="font-bold" style={{ color: textColor }}>Dirección</h4>
                                <p className="opacity-70">{negocio.direccion || "Dirección no configurada"}</p>
                                {negocio.google_maps_link && (
                                    <a href={negocio.google_maps_link} target="_blank" className="text-sm font-bold mt-1 inline-flex items-center gap-1 hover:underline" style={{ color: brandColor }}>Ver en Google Maps <ArrowRight size={14}/></a>
                                )}
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: brandColor + '20', color: brandColor }}><Clock size={20}/></div>
                            <div>
                                <h4 className="font-bold" style={{ color: textColor }}>Horarios de Atención</h4>
                                <p className="opacity-70">{negocio.horarios || "Lunes a Viernes 9:00 - 18:00"}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: brandColor + '20', color: brandColor }}><Phone size={20}/></div>
                            <div>
                                <h4 className="font-bold" style={{ color: textColor }}>Contacto Directo</h4>
                                <p className="opacity-70">{negocio.whatsapp || "No especificado"}</p>
                            </div>
                        </div>
                        {/* Redes Sociales */}
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: brandColor + '20', color: brandColor }}><Globe size={20}/></div>
                            <div>
                                <h4 className="font-bold" style={{ color: textColor }}>Redes Sociales</h4>
                                {/* INSTAGRAM */}
                                {negocio.instagram && (
                                    <a 
                                        href={negocio.instagram} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm font-medium hover:text-pink-400 transition-colors"
                                    >
                                        <Instagram size={18} />
                                        <span>Instagram</span>
                                    </a>
                                )}

                                {/* FACEBOOK */}
                                {negocio.facebook && (
                                    <a 
                                        href={negocio.facebook} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm font-medium hover:text-blue-400 transition-colors"
                                    >
                                        <Facebook size={18} />
                                        <span>Facebook</span>
                                    </a>
                                )}

                                {/* LINKEDIN */}
                                {negocio.linkedin && (
                                    <a 
                                        href={negocio.linkedin} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm font-medium hover:text-sky-400 transition-colors"
                                    >
                                        <Linkedin size={18} />
                                        <span>LinkedIn</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Mapa o Imagen Representativa */}
                <div className={`h-[400px] bg-zinc-100 overflow-hidden shadow-2xl relative ${radiusClass}`}>
                    {/* Si tuvieras una API Key de Maps real podrías usar un iframe, por ahora simulamos con imagen o el link */}
                    <div className="absolute inset-0 bg-zinc-200 flex items-center justify-center text-zinc-400">
                        {negocio.google_maps_link ? (
                            <iframe width="100%" height="100%" src={`https://maps.google.com/maps?q=${encodeURIComponent(negocio.direccion)}&t=&z=15&ie=UTF8&iwloc=&output=embed`} title="Mapa"></iframe>
                        ) : (
                            <div className="text-center p-6"><MapPin size={48} className="mx-auto mb-2 opacity-50"/>Mapa no disponible</div>
                        )}
                    </div>
                </div>
            </div>
        </section>
      )}
      


      {/* --- FOOTER / CONTACTO --- */}
      <div id="contacto">
        {config.footer?.mostrar && <Footer data={config.footer} negocioNombre={negocio.nombre} />}
      </div>
      {/* --- LIGHTBOX (MODAL DE IMAGEN) --- */}
      {selectedImage && (
        <div 
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
            onClick={() => setSelectedImage(null)}
        >
            <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 p-3 bg-white/10 text-white hover:bg-white/20 rounded-full transition-colors z-50"
            >
                <X size={24} />
            </button>
            <img 
                src={selectedImage} 
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300" 
                onClick={(e) => e.stopPropagation()} 
                alt="Vista completa"
            />
        </div>
      )}
      {/* --- MODALES (NO CAMBIADOS, SE MANTIENEN IGUAL) --- */}
      {isBookingModalOpen && (
        <Modal onClose={() => setIsBookingModalOpen(false)} radiusClass={radiusClass}>
            {/* ... (Todo el contenido del modal de agendamiento igual que tu archivo original) ... */}
            {/* He resumido esta parte por brevedad, pero en tu código debes pegar el contenido exacto del modal original */}
             <div className="mb-6">
                <h3 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                    <CalendarIcon className="text-blue-600"/> Agendar Turno
                </h3>
                <p className="text-zinc-500 text-sm">Paso {bookingStep} de 4</p>
                <div className="h-1 bg-zinc-100 rounded-full mt-2 w-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${(bookingStep / 4) * 100}%` }}></div>
                </div>
            </div>
            {/* PASO 1: SELECCIONAR SERVICIO (CORREGIDO) */}
            {bookingStep === 1 && (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    <p className="font-bold text-zinc-700 mb-2">Selecciona un servicio:</p>
                    
                    {/* FUSIONAMOS SERVICIOS + PROMOS */}
                    {(() => {
                        const allServices = [
                            ...(config.servicios?.items || []), 
                            ...(negocio.config_web?.services || [])
                        ];
                        
                        if (allServices.length === 0) {
                            return <p className="text-center text-zinc-400 text-sm py-4">No hay servicios configurados.</p>;
                        }

                        return allServices.map((item: any, i: number) => {
                            // LÓGICA DE PROMO
                            const isPromo = item.isPromo && item.promoEndDate;
                            const isExpired = isPromo && new Date(item.promoEndDate) < new Date();
                            
                            // Normalizar datos
                            const titulo = item.name || item.titulo;
                            const precio = item.price || item.precio;
                            const desc = item.description || item.desc;
                            const duracion = item.duration || item.duracion || 60;

                            if (isExpired) return null; // No mostrar promos vencidas

                            return (
                                <button 
                                    key={item.id || i}
                                    onClick={() => { 
                                        setBookingData({...bookingData, service: item}); 
                                        setBookingStep(2); 
                                    }} 
                                    className={`w-full p-4 border rounded-xl text-left transition-all group relative overflow-hidden
                                        ${isPromo 
                                            ? 'bg-pink-50 border-pink-200 hover:border-pink-400 hover:bg-pink-100' 
                                            : 'bg-white border-zinc-200 hover:bg-indigo-50 hover:border-indigo-500'
                                        }
                                    `}
                                >
                                    {isPromo && (
                                        <div className="absolute top-0 right-0 bg-pink-500 text-white text-[9px] px-2 py-0.5 font-bold uppercase rounded-bl-lg">
                                            Promo
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center w-full">
                                        <span className={`font-bold ${isPromo ? 'text-pink-900' : 'text-zinc-900 group-hover:text-indigo-700'}`}>
                                            {titulo}
                                        </span>
                                        {precio && (
                                            <span className={`font-semibold px-2 py-1 rounded text-sm 
                                                ${isPromo 
                                                    ? 'bg-pink-200 text-pink-800' 
                                                    : 'bg-zinc-100 text-zinc-900 group-hover:bg-indigo-100 group-hover:text-indigo-700'
                                                }`}>
                                                {typeof precio === 'number' || !isNaN(Number(precio)) ? `$${precio}` : precio}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-xs text-zinc-500 truncate max-w-[70%]">{desc}</span>
                                        <span className={`text-xs font-bold flex items-center gap-1 ${isPromo ? 'text-pink-400' : 'text-zinc-400'}`}>
                                            <Clock size={12}/> {duracion} min
                                        </span>
                                    </div>
                                </button>
                            );
                        });
                    })()}
                </div>
            )}
            {bookingStep === 2 && (
                <div className="space-y-4">
                        <button onClick={() => setBookingStep(1)} className="text-xs text-zinc-400">← Volver</button>
                        <h4 className="font-bold text-lg">¿Con quién te quieres atender?</h4>
                        
                        {config.equipo?.mostrar && config.equipo?.items?.length > 0 ? (
                            <div className="grid gap-3">
                                <button 
                                    onClick={() => { setBookingData({...bookingData, worker: null}); setBookingStep(3); }}
                                    className="p-4 border border-zinc-200 rounded-xl text-left hover:bg-zinc-50 flex items-center gap-3"
                                >
                                    <div className="bg-zinc-100 p-2 rounded-full"><Users size={20}/></div>
                                    <div>
                                        <span className="font-bold block text-zinc-900">Cualquiera disponible</span>
                                        <span className="text-xs text-zinc-500">Máxima disponibilidad</span>
                                    </div>
                                </button>
                                {config.equipo.items.map((worker: any) => (
                                    <button 
                                        key={worker.id}
                                        onClick={() => { setBookingData({...bookingData, worker: worker}); setBookingStep(3); }}
                                        className="p-4 border border-zinc-200 rounded-xl text-left hover:bg-indigo-50 hover:border-indigo-200 flex items-center gap-3"
                                    >
                                        <img src={worker.imagenUrl || "/default-avatar.png"} className="w-10 h-10 rounded-full object-cover bg-zinc-200"/>
                                        <div>
                                            <span className="font-bold block text-zinc-900">{worker.nombre}</span>
                                            <span className="text-xs text-zinc-500">{worker.cargo}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            // SI NO HAY EQUIPO, SALTAMOS AUTOMÁTICAMENTE
                            <div className="text-center py-4">
                                <p className="text-zinc-500">No hay profesionales específicos.</p>
                                <button onClick={() => setBookingStep(3)} className="mt-2 text-blue-600 font-bold">Continuar</button>
                            </div>
                        )}
                </div>
            )}
            {/* PASO 3 */}
            {bookingStep === 3 && (
                <div className="space-y-4">
                     {/* El botón de volver debería llevar al paso 2, no al 1, si viniste de elegir profesional */}
                     <button onClick={() => setBookingStep(2)} className="text-xs text-zinc-400">← Volver</button>
                     
                    <input 
                        type="date" 
                        min={getLocalDateString()} 
                        className="w-full p-3 border rounded-xl" 
                        onChange={handleDateChange}
                    />
                     
                     {bookingData.date && (
                         loadingSlots ? <Loader2 className="animate-spin mx-auto"/> : 
                         <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                            {generateTimeSlots().map((slot) => (
                                <button 
                                    key={slot.time} 
                                    disabled={!slot.available} 
                                    onClick={() => { 
                                        setBookingData({...bookingData, time: slot.time}); 
                                        setBookingStep(4); // <--- CORRECCIÓN AQUÍ (Antes decía 3)
                                    }} 
                                    className={`py-2 text-sm rounded-lg border ${slot.available ? 'hover:bg-blue-50 border-zinc-200' : 'bg-zinc-100 text-zinc-300'}`}
                                >
                                    {slot.time}
                                </button>
                            ))}
                         </div>
                     )}
                </div>
            )}
            {/* PASO 4 */}
            {bookingStep === 4 && (
                <form onSubmit={handleConfirmBooking} className="space-y-4">
                     <button type="button" onClick={() => setBookingStep(2)} className="text-xs text-zinc-400">← Volver</button>
                     <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 border border-blue-100">
                        Turno: {new Date(bookingData.date + 'T00:00:00').toLocaleDateString()} - {bookingData.time}hs
                        </div>
                     <input required placeholder="Nombre y Apellido" className="w-full p-3 border rounded-xl" onChange={e => setBookingData({...bookingData, clientName: e.target.value})}/>
                     <input required placeholder="Teléfono" className="w-full p-3 border rounded-xl" onChange={e => setBookingData({...bookingData, clientPhone: e.target.value})}/>
                     <input required placeholder="Email" className="w-full p-3 border rounded-xl" onChange={e => setBookingData({...bookingData, clientEmail: e.target.value})}/>
                     <button type="submit" disabled={enviando} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl flex justify-center gap-2">{enviando ? <Loader2 className="animate-spin"/> : "Confirmar"}</button>
                     <textarea 
                        placeholder="Mensaje explicativo" 
                        className="w-full p-3 border rounded-xl" 
                        onChange={e => setBookingData({...bookingData, message: e.target.value})}
                        />

                        <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700">Adjuntar imágenes</label>
                        <input 
                            type="file" 
                            multiple 
                            accept="image/*"
                            onChange={async (e) => {
                            // Aquí deberías implementar la lógica de subida a Supabase Storage
                            // y guardar las URLs resultantes en bookingData.images
                            }}
                            className="w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        </div>
                </form>
            )}
        </Modal>
      )}

      {/* MODAL EXITO */}
      {mostrarGracias && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md">
            <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm">
                <CheckCircle size={48} className="mx-auto text-emerald-500 mb-4"/>
                <h3 className="text-2xl font-bold">¡Turno Confirmado!</h3>
                <button onClick={() => setMostrarGracias(false)} className="mt-4 text-sm text-zinc-500">Cerrar</button>
            </div>
        </div>
      )}

      

      {isFeedbackModalOpen && (
        <Modal onClose={() => setIsFeedbackModalOpen(false)} radiusClass={radiusClass}>
             <h3 className="text-2xl font-bold mb-4 text-center">Tu opinión</h3>
             <form onSubmit={handleEnviarFeedback} className="space-y-4">
                 <div className="flex justify-center gap-2">
                     {[1,2,3,4,5].map(s => <button key={s} type="button" onClick={() => setRatingSeleccionado(s)}><Star size={32} className={s <= ratingSeleccionado ? "fill-yellow-400 text-yellow-400" : "text-zinc-300"}/></button>)}
                 </div>
                 <input required placeholder="Tu Nombre" value={nombreCliente} onChange={e => setNombreCliente(e.target.value)} className="w-full p-3 border rounded-xl"/>
                 <textarea placeholder="Comentario..." value={feedbackComentario} onChange={e => setFeedbackComentario(e.target.value)} className="w-full p-3 border rounded-xl"/>
                 <button type="submit" disabled={enviando} className="w-full bg-zinc-900 text-white font-bold py-3 rounded-xl">{enviando ? <Loader2 className="animate-spin"/> : "Enviar"}</button>
             </form>
        </Modal>
      )}

    </div>
  );
}

// COMPONENTE AUXILIAR MODAL
function Modal({ children, onClose, radiusClass }: any) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md animate-in fade-in">
          <div className={`bg-white shadow-2xl w-full max-w-md p-8 relative animate-in zoom-in-95 ${radiusClass}`}>
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-zinc-300 hover:text-zinc-600"><X size={20} /></button>
            {children}
          </div>
        </div>
    )
}