"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { 
  Users, LayoutDashboard, LogOut, Star, MessageCircle, 
  CreditCard, Settings, Link as LinkIcon, Check, 
  Calendar as CalendarIcon, UserCheck, Clock, ChevronLeft, ChevronRight, User, Eye, EyeOff,
  Mail,
  X,
  Menu,  Calendar, ChevronDown, ChevronUp, Briefcase, ExternalLink,
  Phone,
  Bell,Tag,Trash2,MoreVertical, Edit,Minus, Plus
} from "lucide-react";
import { approveAppointment, cancelAppointment, markDepositPaid } from "@/app/actions/confirm-booking/manage-appointment";
import { BotonCancelar } from "@/components/BotonCancelar";
import MarketingCampaign from "@/components/dashboards/MarketingCampaign";
import BlockTimeManager from "@/components/dashboards/BlockTimeManager";
import { PasswordManager } from "@/components/dashboards/PasswordManager";
import ManualBookingManager from "./ManualBookingManager";
import { rescheduleBooking, cancelBooking } from "@/app/actions/service-booking/calendar-actions";

// --- CONFIGURACIÓN ---
const CONST_LINK_MP = "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=TU_ID_DE_PLAN"; 

export default function ConfirmBookingDashboard({ initialData }: { initialData: any }) {
  const negocio = initialData; // Usamos el negocio que nos pasa el Factory
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [turnos, setTurnos] = useState<any[]>([]);
  const handleTurnoCancelado = (idEliminado: string) => {
    setTurnos((prev) => prev.filter((t) => t.id !== idEliminado));
    };
  const [resenas, setResenas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"resumen" | "calendario" | "clientes"| "solicitudes" | "resenas" | "suscripcion" | "configuracion" | "marketing"| "promociones" | "gestion_turnos">("resumen");
  const [contactModal, setContactModal] = useState({ show: false, clientEmail: '', clientName: '' });
  const [mailContent, setMailContent] = useState({ subject: '', message: '' });
  const [isSending, setIsSending] = useState(false);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{show: boolean, turnoId: string | null}>({ show: false, turnoId: null });
  const [priceInput, setPriceInput] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  const [rescheduleModal, setRescheduleModal] = useState({ show: false, turnoId: '', currentStart: '' });
  const [newDate, setNewDate] = useState('');

  // NUEVO: Función para guardar la reprogramación
  const handleRescheduleSave = async () => {
    if (!newDate) return alert("Selecciona una fecha válida");
    
    // Indicador visual simple
    const btn = document.getElementById('btn-save-reschedule');
    if(btn) btn.innerText = "Guardando...";

    // Usamos la Server Action compartida
    const res = await rescheduleBooking(rescheduleModal.turnoId, new Date(newDate).toISOString());

    if (!res.success) {
        alert("Error al reprogramar: " + res.error);
        if(btn) btn.innerText = "Guardar";
    } else {
        // Actualizamos estado local
        setTurnos(prev => prev.map(t => t.id === rescheduleModal.turnoId ? { ...t, fecha_inicio: newDate } : t));
        setRescheduleModal({ ...rescheduleModal, show: false });
        alert("Turno reprogramado y actualizado en Google Calendar.");
    }
  };


  // --- LÓGICA DE DATOS ESPECÍFICOS ---
  useEffect(() => {
    async function cargarDatosEspecificos() {
      setLoading(true);

      // Redirección de Google (se mantiene igual)
      if (searchParams.get('google_connected') === 'true') {
        setActiveTab("calendario"); 
        router.replace(window.location.pathname, { scroll: false });
      }

      // 1. Cargar Reseñas (se mantiene igual)
      const { data: datosResenas } = await supabase
        .from("resenas")
        .select("*")
        .eq("negocio_id", negocio.id)
        .order('created_at', { ascending: false });
      if (datosResenas) setResenas(datosResenas);

      // 2. CARGAR TURNOS Y FILTRAR CLIENTES
      const { data: datosTurnos } = await supabase
        .from("turnos")
        .select("*")
        .eq("negocio_id", negocio.id)
        .neq('estado', 'cancelado')
        .order('fecha_inicio', { ascending: false }); // IMPORTANTE: Del más nuevo al más viejo
        
      if (datosTurnos) {
        setTurnos(datosTurnos); // El calendario usa todos

        // FILTRO MÁGICO: Dejamos solo el primer registro que aparezca de cada email
        const clientesUnicos = datosTurnos.filter((obj: any, index: number, self: any[]) =>
            index === self.findIndex((t: any) => (
                t.cliente_email?.trim().toLowerCase() === obj.cliente_email?.trim().toLowerCase() && t.cliente_email
            ))
        );
        
        setLeads(clientesUnicos); // Guardamos la lista limpia en 'leads'
      }
      
      setLoading(false);
    }
    cargarDatosEspecificos();
  }, [negocio.id, searchParams, router]);

useEffect(() => {
    const fetchReviews = async () => {
        if (!negocio?.id) return;
        
        const { data, error } = await supabase
            .from('resenas')
            .select('*')
            .eq('negocio_id', negocio.id)
            .order('created_at', { ascending: false }); // Las más nuevas primero

        if (data) {
            setReviews(data);
        }
    };

    fetchReviews();}, [negocio?.id]); // Se ejecuta cuando carga el negocio
    const toggleVisibility = async (id: string, currentStatus: boolean) => {
    // 1. Actualizar en Supabase
    const { error } = await supabase
        .from('resenas')
        .update({ visible: !currentStatus })
        .eq('id', id);

    // 2. Actualizar visualmente en local (para que sea instantáneo)
    if (!error) {
        setReviews(prev => prev.map(r => r.id === id ? { ...r, visible: !currentStatus } : r));
    } else {
        alert("Error al actualizar: " + error.message);}};


  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleSendDirectEmail = async () => {
    setIsSending(true);
    try {
        const res = await fetch('/api/google/send-email', {
        method: 'POST',
        body: JSON.stringify({
            to: contactModal.clientEmail,
            subject: mailContent.subject,
            message: mailContent.message,
            negocioId: initialData.id // ID del negocio dueño del dashboard
        })
        });
        
        if (res.ok) {
        alert("Email enviado correctamente");
        setContactModal({ ...contactModal, show: false });
        } else {
        alert("Error al enviar. ¿Tienes Gmail conectado?");
        }
    } catch (err) {
        console.error(err);
    } finally {
        setIsSending(false);
    }
  };

  const handleConnectGoogle = () => {
    if (!negocio?.slug) return;
    window.location.href = `/api/google/auth?slug=${negocio.slug}`;
  };

  const onPreConfirm = (id: string) => {
      setConfirmModal({ show: true, turnoId: id });
      setPriceInput(""); 
  };


  const handleConfirmAction = async () => {
      if (!confirmModal.turnoId) return;
      
      setIsConfirming(true);
      const res = await approveAppointment(confirmModal.turnoId);
      
      if (!res.success) {
          alert("Error: " + res.error);
      }
      
      setIsConfirming(false);
      setConfirmModal({ show: false, turnoId: null });
  };

  const regularServices = negocio.config_web?.servicios?.items?.map((s: any) => ({ 
      ...s, 
      name: s.titulo 
  })) || [];
  const promoServices = negocio.config_web?.services || [];
  const allServices = [...regularServices, ...promoServices];

  const menuItems = [
    { id: "resumen", label: "General", icon: <LayoutDashboard size={18} /> },
    { 
      id: "calendario", 
      label: "Calendario", 
      icon: <CalendarIcon size={18} />, 
      badge: !negocio.google_calendar_connected ? "!" : undefined 
    },
    { id: "clientes", label: "Clientes", icon: <UserCheck size={18} /> },
    { 
        id: "solicitudes", 
        label: "Solicitudes", 
        icon: <Bell size={18} />, 
        badge: turnos.filter(t => t.estado === 'pendiente').length > 0 
            ? turnos.filter(t => t.estado === 'pendiente').length 
            : undefined 
    },
    { 
      id: "resenas", 
      label: "Reseñas", 
      icon: <MessageCircle size={18} />, 
      badge: resenas.length > 0 ? resenas.length : undefined 
    },
    { id: "suscripcion", label: "Suscripción", icon: <CreditCard size={18} /> },
    { id: "promociones", label: "Promociones", icon: <Tag size={18} /> },
    { id: "gestion_turnos", label: "Gestión de Turnos", icon: <Calendar size={18} /> },
    { id: "marketing", label: "Marketing", icon: <LinkIcon size={18} /> },
    { id: "configuracion", label: "Configuración", icon: <Settings size={18} /> },
  ];

  if (loading) return (
    <div className="h-full w-full flex items-center justify-center bg-white min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"/>
        </div>
    </div>
  );

  // CÁLCULOS ESTADÍSTICOS
  const promedio = resenas.length > 0
    ? (resenas.reduce((acc, curr) => acc + curr.puntuacion, 0) / resenas.length).toFixed(1)
    : "0.0";
  const totalReviews = resenas.length;

  if (loading) return (
    <div className="h-full w-full flex items-center justify-center bg-white min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"/>
            <p className="text-zinc-400 text-sm animate-pulse">Cargando datos del negocio...</p>
        </div>
    </div>
  );
  



  return (
    // 1. CONTENEDOR PRINCIPAL: 
    // - En móvil: 'flex-col' (uno debajo del otro)
    // - En escritorio: 'md:flex-row' (uno al lado del otro)
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row font-sans text-zinc-900 overflow-hidden">
      
      {/* --- 2. NAVBAR MÓVIL (Solo visible en md:hidden) --- */}
      {/* Usamos h-16 (64px) fijo para poder calcular el top del menú después */}
      <div className="md:hidden bg-white border-b border-zinc-200 h-16 px-4 flex justify-between items-center sticky top-0 z-40 shadow-sm shrink-0">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-900 rounded-md flex items-center justify-center text-white font-bold text-sm">
                {negocio.nombre ? negocio.nombre.substring(0,1) : "N"}
            </div>
            <span className="font-bold tracking-tight text-sm truncate max-w-[150px]">{negocio.nombre}</span>
         </div>
         <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-lg active:scale-95 transition-transform">
            {mobileMenuOpen ? <X size={24}/> : <Menu size={24}/>}
         </button>
      </div>

      {/* --- 3. MENÚ DESPLEGABLE MÓVIL (Overlay) --- */}
      {/* Se posiciona 'fixed' justo debajo del navbar (top-16) */}
      {mobileMenuOpen && (
        <>
            {/* Fondo oscuro transparente para cerrar al hacer click fuera */}
            <div className="md:hidden fixed inset-0 z-30 bg-black/20 backdrop-blur-sm top-16" onClick={() => setMobileMenuOpen(false)} />
            
            {/* El menú en sí */}
            <div className="md:hidden fixed top-16 left-0 w-full bg-white z-40 border-b border-zinc-200 shadow-2xl p-2 flex flex-col gap-1 animate-in slide-in-from-top-2 duration-200">
                {menuItems.map((item) => (
                    <button 
                        key={item.id}
                        onClick={() => {
                            setActiveTab(item.id as any);
                            setMobileMenuOpen(false);
                        }}
                        className={`flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-all ${activeTab === item.id ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}
                    >
                        {/* Clonamos icono para forzar color si está activo */}
                        {activeTab === item.id ? <div className="text-white">{item.icon}</div> : item.icon}
                        <span>{item.label}</span>
                        {item.badge && (
                        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badge === '!' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                            {item.badge}
                        </span>
                        )}
                    </button>
                ))}
                <div className="h-px bg-zinc-100 my-1"></div>
                <button onClick={handleLogout} className="flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium w-full text-left">
                    <LogOut size={18}/> Cerrar Sesión
                </button>
            </div>
        </>
      )}

      {/* --- SIDEBAR DE ESCRITORIO (MODIFICADO PARA USAR menuItems) --- */}
      <aside className="w-64 bg-white border-r border-zinc-200 hidden md:flex flex-col sticky top-0 h-screen z-20">
        <div className="p-6">
          <div className="flex items-center gap-3 px-2 mb-8">
            <div className="w-8 h-8 bg-zinc-900 rounded-md flex items-center justify-center text-white font-bold">
                {negocio.nombre.substring(0,1)}
            </div>
            <span className="font-bold tracking-tight truncate">{negocio.nombre}</span>
          </div>

          <nav className="space-y-1">
            {/* Mapeamos los mismos items para el escritorio */}
            {menuItems.map((item) => (
                <SidebarItem 
                    key={item.id}
                    icon={item.icon} 
                    label={item.label} 
                    active={activeTab === item.id} 
                    onClick={() => setActiveTab(item.id as any)} 
                    badge={item.badge}
                />
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-zinc-100">
            <button onClick={handleLogout} className="flex items-center gap-2 text-zinc-400 hover:text-red-600 text-sm font-medium transition-colors w-full px-2">
                <LogOut size={16} /> Cerrar Sesión
            </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto h-screen">
        <div className="max-w-6xl mx-auto p-6 lg:p-10">
            
            {/* --- TAB: RESUMEN (HOME) --- */}
            {activeTab === "resumen" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <header className="mb-8">
                        <h1 className="text-2xl font-bold tracking-tight mb-1">Buenos días, {negocio.nombre}</h1>
                        <p className="text-zinc-500 text-sm">Resumen de actividad y próximos eventos.</p>
                    </header>

                    {/* KPI GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard 
                            title="Total Clientes" 
                            value={turnos.length} 
                            icon={<Users className="text-blue-600" size={20}/>}
                            trend="Base de datos"
                            trendPositive={true}
                        />
                        <StatCard 
                            title="Calificación Global" 
                            value={promedio} 
                            icon={<Star className="text-yellow-500" size={20} fill="currentColor"/>}
                            subtext={`Basado en ${totalReviews} reseñas totales`}
                        />
                        <StatCard 
                            title="Próximos Turnos" 
                            value={turnos.filter(t => new Date(t.fecha_inicio) > new Date()).length} 
                            icon={<CalendarIcon className="text-purple-600" size={20}/>}
                            subtext="Sincronizados con Google Calendar"
                        />
                    </div>
                </div>
            )}

            {/* --- TAB: CALENDARIO --- */}
            {activeTab === "calendario" && (
                <CalendarTab 
                    negocio={negocio} 
                    turnos={turnos.filter((t: any) => t.estado !== 'cancelado')} 
                    handleConnectGoogle={handleConnectGoogle}
                    onCancel={handleTurnoCancelado}
                    onContact={(email: string, name: string) => setContactModal({ show: true, clientEmail: email, clientName: name })}
                    onReschedule={(id: string, start: string) => {
                        setRescheduleModal({ show: true, turnoId: id, currentStart: start });
                        // Formato para input datetime-local
                        const dateObj = new Date(start);
                        dateObj.setMinutes(dateObj.getMinutes() - dateObj.getTimezoneOffset());
                        setNewDate(dateObj.toISOString().slice(0, 16));
                    }}
                />
            )}
            {/* --- TAB: PROMOCIONES --- */}
            {activeTab === "promociones" && (
            <PromotionsTab initialConfig={negocio.config_web} negocioId={negocio.id} />
            )}

            {/* --- OTRAS TABS --- */}
            {activeTab === "clientes" && <div className="animate-in fade-in"><h1 className="text-2xl font-bold mb-4">Base de Clientes</h1><ClientesTable turnos={turnos} setContactModal={setContactModal} /></div>}
            {activeTab === "solicitudes" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-8">
                    <header className="mb-4">
                        <h1 className="text-2xl font-bold tracking-tight mb-1">Centro de Solicitudes</h1>
                        <p className="text-zinc-500 text-sm">Gestiona pagos pendientes y nuevas reservas.</p>
                    </header>

                    {/* --- ZONA 1: ESPERANDO SEÑA (Naranja) --- */}
                    {/* Estos turnos NO están en Google Calendar aún */}
                    {turnos.some(t => t.estado === 'esperando_senia') && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wide flex items-center gap-2 bg-orange-50 w-fit px-3 py-1 rounded-full border border-orange-100">
                                <Clock size={14} /> Esperando Pago de Seña
                            </h3>
                            <div className="grid gap-4">
                                {turnos.filter(t => t.estado === 'esperando_senia').map((t) => (
                                    <div key={t.id} className="bg-white p-5 rounded-2xl border border-orange-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
                                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500"></div>
                                        <div className="flex-1 pl-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-lg text-zinc-900">{t.cliente_nombre}</span>
                                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full uppercase">Falta Seña</span>
                                            </div>
                                            <p className="text-zinc-600 text-sm font-medium">{t.servicio}</p>
                                            <div className="flex gap-4 mt-2 text-xs text-zinc-400">
                                                <span className="flex items-center gap-1"><CalendarIcon size={14}/> {new Date(t.fecha_inicio).toLocaleDateString()}</span>
                                                <span className="flex items-center gap-1"><Clock size={14}/> {new Date(t.fecha_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}hs</span>
                                            </div>
                                            <p className="text-[10px] text-orange-600 mt-2 font-bold">⚠️ No agendado en Google Calendar todavía.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={async () => {
                                                    if(confirm("¿Confirmar que llegó el pago? Esto intentará reservar el lugar en Google Calendar.")) {
                                                        const res = await markDepositPaid(t.id);
                                                        if(!res.success) alert(res.error);
                                                    }
                                                }}
                                                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-colors text-sm flex items-center gap-2 shadow-lg shadow-orange-200"
                                            >
                                                <CreditCard size={16}/> Registrar Pago
                                            </button>
                                            <button 
                                                onClick={async () => { if(confirm("¿Cancelar turno?")) await cancelAppointment(t.id); }}
                                                className="px-3 py-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                            >
                                                <X size={20}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="h-px bg-zinc-200 my-6"></div>
                        </div>
                    )}

                    {/* --- ZONA 2: NUEVAS SOLICITUDES (Gris/Blanco) --- */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wide flex items-center gap-2 px-1">
                             Nuevas Solicitudes ({turnos.filter(t => t.estado === 'pendiente').length})
                        </h3>
                        
                        {turnos.filter(t => t.estado === 'pendiente').length === 0 ? (
                            <div className="py-12 text-center bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200">
                                <p className="text-zinc-400 text-sm">No hay nuevas solicitudes pendientes.</p>
                            </div>
                        ) : (
                            turnos.filter(t => t.estado === 'pendiente').map((t) => (
                                <div key={t.id} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-lg text-zinc-900">{t.cliente_nombre}</span>
                                                <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-[10px] font-bold rounded-full uppercase">Nuevo</span>
                                            </div>
                                            <p className="text-zinc-600 text-sm font-medium">{t.servicio}</p>
                                            <div className="flex flex-wrap gap-4 mt-3 text-xs text-zinc-400 font-mono">
                                                <span className="flex items-center gap-1"><CalendarIcon size={14}/> {new Date(t.fecha_inicio).toLocaleDateString()}</span>
                                                <span className="flex items-center gap-1"><Clock size={14}/> {new Date(t.fecha_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}hs</span>
                                            </div>
                                            {(t.mensaje || (t.fotos && t.fotos.length > 0)) && (
                                                <div className="mt-2 p-4 bg-zinc-50 rounded-xl border border-zinc-100 space-y-4">
                                                    {t.mensaje && <p className="text-sm text-zinc-700 italic">"{t.mensaje}"</p>}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                                            <button 
                                                onClick={async () => {
                                                    if(confirm("¿Rechazar esta solicitud?")) await cancelAppointment(t.id);
                                                }}
                                                className="flex-1 md:flex-none px-4 py-2 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-colors text-sm"
                                            >
                                                Rechazar
                                            </button>
                                            {/* Abre el Modal de Precio. Al confirmar ahí, llama a approveAppointment */}
                                            <button 
                                                onClick={() => onPreConfirm(t.id)}
                                                className="flex-1 md:flex-none px-6 py-2 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-all text-sm flex items-center justify-center gap-2"
                                            >
                                                <Check size={16}/> Aceptar
                                            </button>
                                        </div>
                                    </div>
                            ))
                        )}
                    </div>
                </div>
            )}
            {activeTab === "resenas" && <ReviewsTab resenas={reviews} onToggle={toggleVisibility}/>}
            {activeTab === "suscripcion" && <SubscriptionTab negocio={negocio} CONST_LINK_MP={CONST_LINK_MP} />}
            {activeTab === "gestion_turnos" && (
                <div className="space-y-12 animate-in fade-in">
                    <header>
                        <h1 className="text-2xl font-bold">Gestión de Turnos y Horarios</h1>
                        <p className="text-zinc-500 text-sm">Agenda turnos manuales o bloquea horarios por feriados/vacaciones.</p>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        {/* 1. Agendamiento Manual */}
                        <ManualBookingManager 
                            slug={negocio.slug} 
                            workers={negocio.config_web?.equipo?.members || negocio.config_web?.equipo?.items || []} 
                            services={allServices}
                        />

                        {/* 2. Bloqueos (Reutilizamos el componente que ya tenías) */}
                        <BlockTimeManager 
                            slug={negocio.slug} 
                            workers={negocio.config_web?.equipo?.members || negocio.config_web?.equipo?.items || []} 
                        />
                    </div>
                </div>
            )}
            {activeTab === "configuracion" && <ConfigTab negocio={negocio} handleConnectGoogle={handleConnectGoogle} />}
            {activeTab === "marketing" && <MarketingCampaign negocio={negocio} />}

            
        </div>
        {/* MODAL REPROGRAMAR (NUEVO) */}
        {rescheduleModal.show && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                    <h3 className="text-lg font-bold mb-4">Reprogramar Turno</h3>
                    <p className="text-sm text-zinc-500 mb-2">Selecciona la nueva fecha y hora:</p>
                    <input 
                        type="datetime-local"
                        className="w-full p-2 border rounded-lg mb-6 outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                    />
                    <div className="flex gap-3">
                        <button onClick={() => setRescheduleModal({ ...rescheduleModal, show: false })} className="flex-1 py-2 text-gray-600 font-medium">Cancelar</button>
                        <button id="btn-save-reschedule" onClick={handleRescheduleSave} className="flex-1 py-2 bg-zinc-900 text-white rounded-lg font-bold hover:bg-zinc-800">Guardar</button>
                    </div>
                </div>
            </div>
        )}


        {/* CONTACT MODAL */}
        {contactModal.show && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h3 className="text-lg font-bold mb-1">Enviar email a {contactModal.clientName}</h3>
              <p className="text-sm text-gray-500 mb-4">Desde tu cuenta de Gmail conectada</p>
              
              <div className="space-y-4">
                <input 
                  placeholder="Asunto"
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  onChange={e => setMailContent({...mailContent, subject: e.target.value})}
                />
                <textarea 
                  placeholder="Escribe tu mensaje..."
                  rows={5}
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  onChange={e => setMailContent({...mailContent, message: e.target.value})}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setContactModal({ ...contactModal, show: false })}
                  className="flex-1 py-2 text-gray-600 font-medium"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSendDirectEmail}
                  disabled={isSending}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {isSending ? "Enviando..." : "Enviar Email"}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* MODAL DE CONFIRMACIÓN DE PRECIO */}
        {confirmModal.show && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
                    <h3 className="text-xl font-bold text-zinc-900 mb-2">Confirmar Turno</h3>
                    <p className="text-sm text-zinc-500 mb-4">
                        Ingresa el precio final del servicio. Esto se enviará al cliente junto con la solicitud de seña (si aplica).
                    </p>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Precio Final ($)</label>
                            <input 
                                type="number" 
                                autoFocus
                                placeholder="Ej: 15000"
                                className="w-full p-3 border border-zinc-200 rounded-xl text-lg font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                value={priceInput}
                                onChange={(e) => setPriceInput(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => setConfirmModal({ show: false, turnoId: null })}
                                className="flex-1 py-3 text-zinc-500 font-bold hover:bg-zinc-100 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleConfirmAction}
                                disabled={isConfirming || !priceInput}
                                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isConfirming ? "Procesando..." : "Enviar y Confirmar"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}

// --- SUBCOMPONENTES (Copia aquí los mismos subcomponentes que tenías: CalendarTab, SidebarItem, etc.) ---
// ... (Aquí pegas las funciones CalendarTab, ClientesTable, SidebarItem, etc. del archivo original)
// Para ahorrar espacio en la respuesta, asumo que copiarás las funciones auxiliares al final de este archivo.
// Asegúrate de exportar o definir CalendarTab, ClientesTable, etc. aquí dentro.

function CalendarTab({ negocio, turnos, handleConnectGoogle, onCancel, onContact, onReschedule }: any) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const supabase = createClient(); 
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null); // Estado para el menú

    const handleDeleteFromMenu = async (id: string) => {
        if(!confirm("¿Estás seguro de cancelar este turno? Se eliminará de Google Calendar.")) return;
        
        // Usamos la Server Action importada
        const res = await cancelBooking(id);

        if (res.success) {
            onCancel(id); // Actualizar UI
        } else {
            alert("Error al cancelar: " + res.error);
        }
    };

    if (!negocio.google_calendar_connected) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 h-[600px] flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-zinc-300 text-center p-8">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <CalendarIcon size={40} />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 mb-2">Conecta tu Calendario</h2>
                <p className="text-zinc-500 max-w-md mb-8">
                    Para visualizar y gestionar tus turnos aquí, necesitamos sincronizar con tu Google Calendar.
                </p>
                <button onClick={handleConnectGoogle} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg">
                    <LinkIcon size={18} /> Conectar con Google
                </button>
            </div>
        );
    }

    // LÓGICA DE FECHAS
    const getDaysOfWeek = (date: Date) => {
        const start = new Date(date);
        const day = start.getDay(); 
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(start.setDate(diff));
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            days.push(d);
        }
        return days;
    };

    const days = getDaysOfWeek(currentDate);
    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() && date.getMonth() === today.getMonth();
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 h-[calc(100vh-140px)] flex flex-col">
            {/* HEADER */}
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Tu Calendario</h1>
                    <p className="text-zinc-500 text-sm">Gestiona tus turnos de la semana.</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-1 rounded-xl border border-zinc-200 shadow-sm">
                    <button onClick={() => {const d = new Date(currentDate); d.setDate(d.getDate()-7); setCurrentDate(d)}} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-600"><ChevronLeft size={20}/></button>
                    <span className="text-sm font-bold min-w-[140px] text-center capitalize">
                        {days[0].toLocaleDateString('es-AR', { month: 'long', day: 'numeric' })} - {days[6].toLocaleDateString('es-AR', { month: 'long', day: 'numeric' })}
                    </span>
                    <button onClick={() => {const d = new Date(currentDate); d.setDate(d.getDate()+7); setCurrentDate(d)}} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-600"><ChevronRight size={20}/></button>
                </div>
            </header>

            {/* GRID */}
            <div className="flex-1 bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
                <div className="hidden md:grid grid-cols-7 border-b border-zinc-200 bg-zinc-50">
                    {days.map((day, i) => (
                        <div key={i} className={`py-4 text-center border-r border-zinc-100 last:border-0 ${isToday(day) ? 'bg-blue-50/50' : ''}`}>
                            <p className="text-xs font-bold text-zinc-400 uppercase mb-1">{day.toLocaleDateString('es-AR', { weekday: 'short' })}</p>
                            <div className={`text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center mx-auto ${isToday(day) ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-900'}`}>{day.getDate()}</div>
                        </div>
                    ))}
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-7 overflow-y-auto min-h-[500px]">
                    {days.map((day, i) => {
                        const dayTurnos = turnos.filter((t: any) => {
                            const tDate = new Date(t.fecha_inicio);
                            return tDate.getDate() === day.getDate() && tDate.getMonth() === day.getMonth() && tDate.getFullYear() === day.getFullYear();
                        });

                        return (
                            <div key={i} className={`border-r border-zinc-100 last:border-0 p-2 space-y-2 ${isToday(day) ? 'bg-blue-50/10' : ''}`}>
                                {/* Header móvil */}
                                <div className={`md:hidden flex items-center gap-2 py-2 px-2 mb-2 rounded-lg ${isToday(day) ? 'bg-blue-50 text-blue-700' : 'bg-zinc-50 text-zinc-600'}`}>
                                    <span className="font-bold text-sm capitalize">{day.toLocaleDateString('es-AR', { weekday: 'long' })}</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isToday(day) ? 'bg-blue-200' : 'bg-zinc-200'}`}>{day.getDate()}</span>
                                </div>
                                
                                {dayTurnos.length === 0 && <div className="md:hidden text-center py-4 text-xs text-zinc-300 italic">Sin actividad</div>}

                                {dayTurnos.map((t: any) => (
                                    <div key={t.id} className="bg-white p-3 rounded-lg border border-zinc-200 shadow-sm relative group border-l-4 border-l-indigo-500 hover:shadow-md transition-all">
                                        
                                        {/* CABECERA: Hora y MENÚ DE 3 PUNTOS */}
                                        <div className="flex justify-between items-start mb-1 relative">
                                            <p className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                                                <Clock size={10}/> 
                                                {new Date(t.fecha_inicio).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}
                                            </p>

                                            {/* BOTÓN 3 PUNTOS */}
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenuId(activeMenuId === t.id ? null : t.id);
                                                }}
                                                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-full hover:bg-zinc-100 transition-colors"
                                            >
                                                <MoreVertical size={14} />
                                            </button>

                                            {/* MENÚ DESPLEGABLE */}
                                            {activeMenuId === t.id && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                                                    <div className="absolute right-0 top-6 w-48 bg-white rounded-lg shadow-xl border border-zinc-100 z-20 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                                        <button 
                                                            onClick={() => { onReschedule(t.id, t.fecha_inicio); setActiveMenuId(null); }}
                                                            className="w-full text-left px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-indigo-600 flex items-center gap-2"
                                                        >
                                                            <Edit size={14} /> Reprogramar
                                                        </button>
                                                        <button 
                                                            onClick={() => { onContact(t.cliente_email, t.cliente_nombre); setActiveMenuId(null); }}
                                                            className="w-full text-left px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-emerald-600 flex items-center gap-2"
                                                        >
                                                            <Mail size={14} /> Email
                                                        </button>
                                                        {t.cliente_telefono && (
                                                            <a 
                                                                href={`https://wa.me/${t.cliente_telefono.replace(/\D/g,'')}`}
                                                                target="_blank" rel="noopener noreferrer"
                                                                className="w-full text-left px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-green-600 flex items-center gap-2"
                                                            >
                                                                <Phone size={14} /> WhatsApp
                                                            </a>
                                                        )}
                                                        <div className="h-px bg-zinc-100 my-1" />
                                                        <button 
                                                            onClick={() => handleDeleteFromMenu(t.id)}
                                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                        >
                                                            <Trash2 size={14} /> Cancelar Turno
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <p className="text-sm font-bold text-zinc-900 truncate pr-4">{t.cliente_nombre}</p>
                                        
                                        {/* INFO DEL SERVICIO */}
                                        <div className="flex flex-col mt-1">
                                            <p className="text-xs font-medium text-zinc-700 truncate">
                                                {typeof t.servicio === 'string'
                                                    ? (t.servicio.includes(" - ") ? t.servicio.split(" - ")[0] : t.servicio)
                                                    : (t.servicio?.titulo || t.servicio?.name || "Servicio Agendado")
                                                }
                                            </p>
                                            {(t.worker_name || (typeof t.servicio === 'string' && t.servicio.includes(" - "))) && (
                                                <p className="text-[10px] text-zinc-400 flex items-center gap-1 truncate mt-0.5">
                                                    <User size={10}/>
                                                    {t.worker_name || (typeof t.servicio === 'string' ? t.servicio.split(" - ")[1] : "")}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function ClientesTable({ turnos, setContactModal }: any) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleRow = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };
    const formatearFecha = (isoString: string) => {
        if (!isoString) return "Sin fecha";
        try {
            const [fechaPart, horaPart] = isoString.split('T');
            const fecha = fechaPart.split('-').reverse().join('/');
            const hora = horaPart ? horaPart.slice(0, 5) : "";
            return `${fecha} - ${hora}`;
        } catch (e) {
            return isoString;
        }
    };
    const getWhatsAppLink = (phone: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        return `https://wa.me/${cleanPhone}`;
    };

    return (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                {/* --- VISTA ESCRITORIO (TABLE) --- */}
                <div className="hidden md:block">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-50/50 border-b border-zinc-100 text-zinc-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Nombre</th>
                                <th className="px-6 py-4">Teléfono</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Servicio</th>
                                <th className="px-6 py-4">Último Turno</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {turnos.map((t: any) => (
                                <tr key={t.id} className="group hover:bg-zinc-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-zinc-900">{t.cliente_nombre}</td>
                                    <td className="px-6 py-4 font-mono text-zinc-600">
                                        {t.cliente_telefono || "Sin teléfono"}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-500">{t.cliente_email}</td>
                                    <td className="px-6 py-4 text-zinc-500">{t.servicio || "General"}</td>
                                    <td className="px-6 py-4 font-mono text-zinc-600 text-xs">
                                        {formatearFecha(t.fecha_inicio)}
                                    </td>
                                    <td className="px-6 py-4">
                                    <div className="flex justify-end gap-2">
                                        {/* BOTÓN WHATSAPP (PC) */}
                                        {t.cliente_telefono && (
                                            <a 
                                                href={getWhatsAppLink(t.cliente_telefono)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-bold text-xs"
                                            >
                                                <MessageCircle size={14} /> 
                                                WhatsApp
                                            </a>
                                        )}
                                        
                                        {/* BOTÓN EMAIL (PC) */}
                                        <button 
                                            onClick={() => setContactModal({ 
                                                show: true, 
                                                clientEmail: t.cliente_email, 
                                                clientName: t.cliente_nombre 
                                            })}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-bold text-xs"
                                        >
                                            <Mail size={14} /> 
                                            Email
                                        </button>
                                    </div>
                                </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
    
                {/* --- VISTA MÓVIL (CARDS EXPANDIBLES) --- */}
                <div className="md:hidden divide-y divide-zinc-100">
                    {turnos.map((t: any) => (
                        <div key={t.id} className="flex flex-col">
                            {/* Fila Colapsada: Siempre visible */}
                            <div 
                                onClick={() => toggleRow(t.id)}
                                className="p-4 flex items-center justify-between active:bg-zinc-50 transition-colors cursor-pointer"
                            >
                                <div className="flex flex-col">
                                    <span className="font-bold text-zinc-900">{t.cliente_nombre}</span>
                                    <span className="text-sm text-zinc-500 flex items-center gap-1.5">
                                        <Phone size={12} className="text-zinc-400" />
                                        {t.cliente_telefono || "Sin teléfono"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {t.cliente_telefono && (
                                        <a 
                                            href={getWhatsAppLink(t.cliente_telefono)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-2 bg-emerald-50 text-emerald-600 rounded-full"
                                        >
                                            <MessageCircle size={14} /> 
                                        </a>
                                    )}
                                    <div className="text-zinc-400">
                                        {expandedId === t.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>
                            </div>
    
                            {/* Contenido Expandido: Detalles adicionales */}
                            {expandedId === t.id && (
                                <div className="px-4 pb-4 pt-2 bg-zinc-50/50 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="space-y-3 border-t border-zinc-100 pt-3">
                                        <div className="flex items-center gap-3 text-sm">
                                            <Mail size={16} className="text-zinc-400 shrink-0" />
                                            <span className="text-zinc-600 truncate">{t.cliente_email}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <Briefcase size={16} className="text-zinc-400 shrink-0" />
                                            <span className="text-zinc-600">{t.servicio || "General"}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <Calendar size={16} className="text-zinc-400 shrink-0" />
                                            <span className="text-zinc-600 font-mono text-xs">
                                                Último: {formatearFecha(t.fecha_inicio)}
                                            </span>
                                        </div>
                                        
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setContactModal({ 
                                                    show: true, 
                                                    clientEmail: t.cliente_email, 
                                                    clientName: t.cliente_nombre 
                                                });
                                            }}
                                            className="w-full mt-2 flex items-center justify-center gap-2 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm shadow-sm"
                                        >
                                            <Mail size={16} /> Enviar Email Profesional
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                
                {turnos.length === 0 && (
                    <div className="p-10 text-center text-zinc-400 text-sm">
                        No hay clientes registrados aún.
                    </div>
                )}
            </div>
        );
    }
function SidebarItem({ icon, label, active, onClick, badge }: any) {
    return (
        <button onClick={onClick} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all mb-1 ${active ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"}`}>
            <div className="flex items-center gap-3"><span className={active ? "text-zinc-900" : "text-zinc-400"}>{icon}</span>{label}</div>
            {badge && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge === '!' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>{badge}</span>}
        </button>
    )
}
function StatCard({ title, value, icon, subtext }: any) {
     return (
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-4"><div className="p-2 bg-zinc-50 rounded-lg border border-zinc-100">{icon}</div></div>
            <div>
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-3xl font-extrabold text-zinc-900 tracking-tight">{value}</h3>
                {subtext && <p className="text-zinc-400 text-xs mt-2">{subtext}</p>}
            </div>
        </div>
    )
}
function ReviewsTab({ resenas, onToggle }: any) {
    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <header className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
                    <Star className="text-yellow-400 fill-yellow-400" /> 
                    Reseñas de Clientes ({resenas.length})
                </h2>
                <p className="text-zinc-500 text-sm">Opiniones recibidas desde tu Landing Page.</p>
            </header>

            {resenas.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-zinc-300">
                    <div className="w-16 h-16 bg-zinc-50 text-zinc-300 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageCircle size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900">Sin reseñas aún</h3>
                    <p className="text-zinc-500 max-w-sm mx-auto mt-1">
                        Comparte el link de tu landing con tus clientes para empezar a recibir opiniones.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {resenas.map((review: any) => (
                        <div 
                            key={review.id} 
                            // CORRECCIÓN AQUÍ: Agregué 'relative' al principio de las clases
                            className="relative bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all group"
                        >
                            {/* --- BOTÓN DE VISIBILIDAD --- */}
                            {/* Ahora que el padre es relative, este absolute se quedará dentro de la tarjeta */}
                            <div className="absolute top-4 right-4 z-10">
                                <button 
                                    onClick={() => onToggle(review.id, review.visible)}
                                    className={`p-2 rounded-full transition-colors ${review.visible ? 'text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50' : 'text-zinc-400 hover:text-zinc-600 bg-zinc-200'}`}
                                    title={review.visible ? "Ocultar reseña" : "Mostrar reseña"}
                                >
                                    {review.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                            </div>

                            {/* Encabezado */}
                            <div className="flex justify-between items-start mb-3 pr-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                                        <User size={18} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-zinc-900">{review.nombre_cliente || "Anónimo"}</p>
                                        <p className="text-[11px] text-zinc-400 font-medium uppercase tracking-wide">
                                            {new Date(review.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                                {/* Estrellas */}
                                <div className="flex bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100 gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <Star 
                                            key={i} 
                                            size={12} 
                                            className={i < review.puntuacion ? "text-yellow-400 fill-yellow-400" : "text-zinc-200"} 
                                        />
                                    ))}
                                </div>
                            </div>
                            
                            {/* Comentario */}
                            <div className="relative mt-2">
                                <span className="absolute -top-2 -left-1 text-4xl text-zinc-200 font-serif leading-none">“</span>
                                <p className="text-sm text-zinc-600 italic leading-relaxed pl-4 relative z-10">
                                    {review.comentario}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
function SubscriptionTab({ negocio, CONST_LINK_MP }: any) {
    return (<div className="p-6 text-center text-zinc-400 bg-white rounded-2xl border border-zinc-200">Panel de Suscripción (simplificado)</div>);
}
function ConfigTab({ negocio, handleConnectGoogle }: any) {
    const supabase = createClient();
    const workers = negocio.config_web?.equipo?.members || negocio.config_web?.equipo?.items || [];

    const handleDisconnect = async () => {
        const confirmacion = window.confirm("¿Estás seguro de que quieres desconectar Google Calendar? Dejarás de sincronizar tus turnos.");
        
        if (!confirmacion) return;

        try {
            // Limpiamos los tokens y el estado en Supabase
            const { error } = await supabase
                .from('negocios')
                .update({
                    google_calendar_connected: false,
                    google_access_token: null,
                    google_refresh_token: null,
                    // google_watch_id: null // Descomenta si usas webhooks
                })
                .eq('id', negocio.id);

            if (error) throw error;

            // Recargamos la página para actualizar el estado visual
            window.location.reload(); 
        } catch (error: any) {
            alert("Error al desconectar: " + error.message);
        }
    }; 
    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-2xl space-y-12">
            
            {/* SECCIÓN 1: INTEGRACIONES (La que ya tenías) */}
            <section>
                <header className="mb-6"><h2 className="text-2xl font-bold">Integraciones</h2></header>
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 flex justify-between gap-6">
                    {/* ... (tu código del botón de Google Calendar) ... */}
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0"><CalendarIcon size={24} /></div>
                        <div>
                            <h3 className="font-bold text-zinc-900">Google Calendar</h3>
                            <p className="text-sm text-zinc-500 mt-1">Sincroniza tus turnos.</p>
                            {negocio.google_calendar_connected ? <div className="mt-2 text-emerald-600 text-sm font-bold flex gap-1 items-center"><Check size={14}/> Conectado</div> : <div className="mt-2 text-zinc-400 text-sm">Desconectado</div>}
                        </div>
                    </div>
                    {/* ... (tus botones de conectar/desconectar) ... */}
                    <div className="flex flex-col gap-2">
                         <button onClick={handleConnectGoogle} disabled={negocio.google_calendar_connected} className={`px-4 py-2 rounded-lg text-sm font-bold ${negocio.google_calendar_connected ? "bg-zinc-100 text-zinc-400" : "bg-blue-600 text-white"}`}>
                            {negocio.google_calendar_connected ? "Listo" : "Conectar"}
                        </button>
                        {negocio.google_calendar_connected && (
                            <button onClick={handleDisconnect} className="text-xs text-red-500 hover:underline">Desconectar</button>
                        )}
                    </div>
                </div>
            </section>

            {/* NUEVA SECCIÓN: SEGURIDAD */}
            <section>
                <header className="mb-6"><h2 className="text-2xl font-bold">Cuenta y Seguridad</h2></header>
                {/* Pasamos el email del negocio para el flujo de 6 dígitos */}
                <PasswordManager email={negocio.email} />
            </section>

        </div>
    )
}
function PromotionsTab({ initialConfig, negocioId }: { initialConfig: any, negocioId: string }) {
    const [config, setConfig] = useState(initialConfig || { services: [] });
    const [loading, setLoading] = useState(false);
    const supabase = createClient();
    
    // Estado para el formulario de nueva promoción
    const [newPromo, setNewPromo] = useState({
        name: '',
        description: '',
        price: '',
        duration: '60',
        isPromo: true,
        promoEndDate: '' // Fecha límite (YYYY-MM-DD)
    });

    const handleSave = async (updatedServices: any[]) => {
        setLoading(true);
        const newConfig = { ...config, services: updatedServices };
        
        const { error } = await supabase
            .from('negocios')
            .update({ config_web: newConfig })
            .eq('id', negocioId);

        if (error) {
            alert("Error al guardar: " + error.message);
        } else {
            setConfig(newConfig);
            alert("Cambios guardados correctamente");
            // Limpiar formulario si fue una creación
            setNewPromo({ ...newPromo, name: '', description: '', price: '', promoEndDate: '' });
        }
        setLoading(false);
    };

    const handleAddPromo = () => {
        if (!newPromo.name || !newPromo.price || !newPromo.promoEndDate) {
            alert("Completa los campos obligatorios (Nombre, Precio, Fecha Límite)");
            return;
        }

        const promoService = {
            id: crypto.randomUUID(), // Generar ID único
            ...newPromo,
            price: Number(newPromo.price),
            duration: Number(newPromo.duration)
        };

        handleSave([...(config.services || []), promoService]);
    };

    const handleDelete = (id: string) => {
        if(!confirm("¿Eliminar esta promoción?")) return;
        const filtered = (config.services || []).filter((s: any) => s.id !== id);
        handleSave(filtered);
    };

    // Filtrar solo las promociones actuales
    const promos = (config.services || []).filter((s: any) => s.isPromo);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 space-y-8 max-w-4xl">
            <header className="mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Tag className="text-pink-600" /> 
                    Gestión de Promociones
                </h2>
                <p className="text-zinc-500 text-sm">Crea ofertas por tiempo limitado que resaltarán en tu página.</p>
            </header>

            {/* FORMULARIO DE CREACIÓN */}
            <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-sm">
                <h3 className="font-bold text-lg mb-4 text-pink-700">Crear Nueva Promoción</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input 
                        placeholder="Nombre de la Promoción (Ej: 2x1 Corte)" 
                        className="p-2 border rounded-lg w-full"
                        value={newPromo.name}
                        onChange={e => setNewPromo({...newPromo, name: e.target.value})}
                    />
                    <input 
                        type="number" 
                        placeholder="Precio Promocional ($)" 
                        className="p-2 border rounded-lg w-full"
                        value={newPromo.price}
                        onChange={e => setNewPromo({...newPromo, price: e.target.value})}
                    />
                    <div className="md:col-span-2">
                        <textarea 
                            placeholder="Descripción breve..." 
                            className="p-2 border rounded-lg w-full h-20 resize-none"
                            value={newPromo.description}
                            onChange={e => setNewPromo({...newPromo, description: e.target.value})}
                        />
                    </div>
                    
                    {/* NUEVO SELECTOR DE DURACIÓN (STEPPER) */}
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-2">Duración del Servicio</label>
                        
                        <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-zinc-200 w-full max-w-[250px]">
                            {/* Botón Restar */}
                            <button 
                                onClick={() => {
                                    const current = Number(newPromo.duration);
                                    // Lógica: Si es <= 60 baja de 15 en 15. Si es > 60 baja de 30 en 30. Minimo 15.
                                    let newVal = current;
                                    if (current <= 60) {
                                        newVal = Math.max(15, current - 15);
                                    } else {
                                        newVal = current - 30;
                                    }
                                    setNewPromo({ ...newPromo, duration: newVal.toString() });
                                }}
                                className="w-10 h-10 flex items-center justify-center bg-zinc-50 hover:bg-zinc-100 text-zinc-600 rounded-lg transition-colors border border-zinc-100 active:scale-95"
                            >
                                <Minus size={18} />
                            </button>

                            {/* Visualizador */}
                            <div className="flex-1 text-center">
                                <span className="text-lg font-bold text-zinc-900 block">
                                    {Number(newPromo.duration) < 60 
                                        ? `${newPromo.duration} min`
                                        : Number(newPromo.duration) === 60 
                                            ? "1 hora"
                                            : (() => {
                                                const h = Math.floor(Number(newPromo.duration) / 60);
                                                const m = Number(newPromo.duration) % 60;
                                                return `${h}h ${m > 0 ? `${m}m` : ''}`;
                                              })()
                                    }
                                </span>
                                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                                    Tiempo
                                </span>
                            </div>

                            {/* Botón Sumar */}
                            <button 
                                onClick={() => {
                                    const current = Number(newPromo.duration);
                                    // Lógica: Si es < 60 sube 15. Si es >= 60 sube 30.
                                    let newVal = current;
                                    if (current < 60) {
                                        newVal = current + 15;
                                    } else {
                                        newVal = current + 30;
                                    }
                                    setNewPromo({ ...newPromo, duration: newVal.toString() });
                                }}
                                className="w-10 h-10 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg transition-colors shadow-sm active:scale-95"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-pink-600 mb-1">Válida hasta (inclusive)</label>
                        <input 
                            type="date" 
                            className="p-2 border border-pink-200 rounded-lg w-full bg-pink-50"
                            value={newPromo.promoEndDate}
                            onChange={e => setNewPromo({...newPromo, promoEndDate: e.target.value})}
                        />
                    </div>
                </div>
                <button 
                    onClick={handleAddPromo}
                    disabled={loading}
                    className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-pink-200"
                >
                    {loading ? "Guardando..." : "Lanzar Promoción 🚀"}
                </button>
            </div>

            {/* LISTA DE PROMOCIONES ACTIVAS */}
            <div className="space-y-4">
                <h3 className="font-bold text-lg text-zinc-800">Promociones Activas</h3>
                {promos.length === 0 ? (
                    <div className="p-8 text-center text-zinc-400 border border-dashed rounded-xl">No tienes promociones activas.</div>
                ) : (
                    <div className="grid gap-4">
                        {promos.map((promo: any) => (
                            <div key={promo.id} className="bg-white p-4 rounded-xl border border-l-4 border-l-pink-500 shadow-sm flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-zinc-900">{promo.name}</h4>
                                    <p className="text-sm text-zinc-500 line-clamp-1">{promo.description}</p>
                                    <div className="flex items-center gap-4 mt-2 text-xs font-medium">
                                        <span className="text-green-600 bg-green-50 px-2 py-1 rounded">${promo.price}</span>
                                        <span className="text-pink-600 bg-pink-50 px-2 py-1 rounded flex items-center gap-1">
                                            <Clock size={12}/> Vence: {promo.promoEndDate}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleDelete(promo.id)}
                                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Eliminar promoción"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
