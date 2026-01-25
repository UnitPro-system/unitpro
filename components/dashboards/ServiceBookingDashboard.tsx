// components/dashboards/ServiceBookingDashboard.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { 
  Users, LayoutDashboard, LogOut, Star, MessageCircle, 
  CreditCard, Settings, Link as LinkIcon, Check, 
  Calendar as CalendarIcon, UserCheck, Clock, ChevronLeft, ChevronRight, User, Eye, EyeOff,
  Mail
} from "lucide-react";
import { BotonCancelar } from "@/components/BotonCancelar"; 

// --- CONFIGURACIÓN ---
const CONST_LINK_MP = "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=TU_ID_DE_PLAN"; 

export default function ServiceBookingDashboard({ initialData }: { initialData: any }) {
  const negocio = initialData; // Usamos el negocio que nos pasa el Factory
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const [turnos, setTurnos] = useState<any[]>([]);
  const handleTurnoCancelado = (idEliminado: string) => {
    setTurnos((prev) => prev.filter((t) => t.id !== idEliminado));
    };
  const [resenas, setResenas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"resumen" | "calendario" | "clientes" | "resenas" | "suscripcion" | "configuracion">("resumen");
  const [contactModal, setContactModal] = useState({ show: false, clientEmail: '', clientName: '' });
  const [mailContent, setMailContent] = useState({ subject: '', message: '' });
  const [isSending, setIsSending] = useState(false);



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
    <div className="min-h-screen bg-zinc-50 flex font-sans text-zinc-900">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-zinc-200 hidden md:flex flex-col sticky top-0 h-screen z-20">
        <div className="p-6">
          <div className="flex items-center gap-3 px-2 mb-8">
            <div className="w-8 h-8 bg-zinc-900 rounded-md flex items-center justify-center text-white font-bold">
                {negocio.nombre.substring(0,1)}
            </div>
            <span className="font-bold tracking-tight truncate">{negocio.nombre}</span>
          </div>

          <nav className="space-y-1">
            <SidebarItem icon={<LayoutDashboard size={18} />} label="General" active={activeTab === "resumen"} onClick={() => setActiveTab("resumen")} />
            
            <SidebarItem 
                icon={<CalendarIcon size={18} />} 
                label="Calendario" 
                active={activeTab === "calendario"} 
                onClick={() => setActiveTab("calendario")}
                badge={!negocio.google_calendar_connected ? "!" : undefined} 
            />
            
            <SidebarItem icon={<UserCheck size={18} />} label="Clientes" active={activeTab === "clientes"} onClick={() => setActiveTab("clientes")} />
            <SidebarItem icon={<MessageCircle size={18} />} label="Reseñas" active={activeTab === "resenas"} onClick={() => setActiveTab("resenas")} badge={resenas.length} />
            <SidebarItem icon={<CreditCard size={18} />} label="Suscripción" active={activeTab === "suscripcion"} onClick={() => setActiveTab("suscripcion")} />
            <SidebarItem icon={<Settings size={18} />} label="Configuración" active={activeTab === "configuracion"} onClick={() => setActiveTab("configuracion")} />
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
                    turnos={turnos} 
                    handleConnectGoogle={handleConnectGoogle}
                    onCancel={handleTurnoCancelado} 
                />
            )}

            {/* --- OTRAS TABS --- */}
            {activeTab === "clientes" && <div className="animate-in fade-in"><h1 className="text-2xl font-bold mb-4">Base de Clientes</h1><ClientesTable turnos={turnos} /></div>}
            {activeTab === "resenas" && <ReviewsTab resenas={reviews} onToggle={toggleVisibility}/>}
            {activeTab === "suscripcion" && <SubscriptionTab negocio={negocio} CONST_LINK_MP={CONST_LINK_MP} />}
            {activeTab === "configuracion" && <ConfigTab negocio={negocio} handleConnectGoogle={handleConnectGoogle} />}
            
        </div>

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
      </main>
    </div>
  );
}

// --- SUBCOMPONENTES (Copia aquí los mismos subcomponentes que tenías: CalendarTab, SidebarItem, etc.) ---
// ... (Aquí pegas las funciones CalendarTab, ClientesTable, SidebarItem, etc. del archivo original)
// Para ahorrar espacio en la respuesta, asumo que copiarás las funciones auxiliares al final de este archivo.
// Asegúrate de exportar o definir CalendarTab, ClientesTable, etc. aquí dentro.

function CalendarTab({ negocio, turnos, handleConnectGoogle, onCancel }: any) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const supabase = createClient(); 
    const router = useRouter();

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

    if (!negocio.google_calendar_connected) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 h-[600px] flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-zinc-300 text-center p-8">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <CalendarIcon size={40} />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 mb-2">Conecta tu Calendario</h2>
                <p className="text-zinc-500 max-w-md mb-8">
                    Para visualizar y gestionar tus turnos aquí, necesitamos sincronizar con tu Google Calendar. Es seguro y automático.
                </p>
                <button 
                    onClick={handleConnectGoogle}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-1"
                >
                    <LinkIcon size={18} /> Conectar con Google
                </button>
            </div>
        );
    }

    // LÓGICA DE CALENDARIO SEMANAL
    const getDaysOfWeek = (date: Date) => {
        const start = new Date(date);
        const day = start.getDay(); // 0 (Dom) - 6 (Sab)
        const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Ajustar al Lunes
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

    const prevWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const nextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() && date.getMonth() === today.getMonth();
    };


    

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 h-[calc(100vh-140px)] flex flex-col">
            {/* HEADER CALENDARIO */}
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Tu Calendario</h1>
                    <p className="text-zinc-500 text-sm">Gestiona tus turnos de la semana.</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-1 rounded-xl border border-zinc-200 shadow-sm">
                    <button onClick={prevWeek} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-600"><ChevronLeft size={20}/></button>
                    <span className="text-sm font-bold min-w-[140px] text-center capitalize">
                        {days[0].toLocaleDateString('es-AR', { month: 'long', day: 'numeric' })} - {days[6].toLocaleDateString('es-AR', { month: 'long', day: 'numeric' })}
                    </span>
                    <button onClick={nextWeek} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-600"><ChevronRight size={20}/></button>
                </div>
            </header>

            {/* GRID SEMANAL */}
            <div className="flex-1 bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
                {/* CABECERA DÍAS */}
                <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50">
                    {days.map((day, i) => (
                        <div key={i} className={`py-4 text-center border-r border-zinc-100 last:border-0 ${isToday(day) ? 'bg-blue-50/50' : ''}`}>
                            <p className="text-xs font-bold text-zinc-400 uppercase mb-1">{day.toLocaleDateString('es-AR', { weekday: 'short' })}</p>
                            <div className={`text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center mx-auto ${isToday(day) ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-900'}`}>
                                {day.getDate()}
                            </div>
                        </div>
                    ))}
                </div>

                {/* CUERPO DEL CALENDARIO */}
                <div className="flex-1 grid grid-cols-7 overflow-y-auto min-h-[500px]">
                    {days.map((day, i) => {
                        const dayTurnos = turnos.filter((t: any) => {
                            const tDate = new Date(t.fecha_inicio);
                            return tDate.getDate() === day.getDate() && 
                                   tDate.getMonth() === day.getMonth() && 
                                   tDate.getFullYear() === day.getFullYear();
                        });

                        return (
                            <div key={i} className={`border-r border-zinc-100 last:border-0 p-2 space-y-2 ${isToday(day) ? 'bg-blue-50/10' : ''}`}>
                                {dayTurnos.length === 0 && (
                                    <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                        <div className="w-full h-full border-2 border-dashed border-zinc-100 rounded-lg flex items-center justify-center text-zinc-300 text-xs font-medium cursor-pointer hover:bg-zinc-50">
                                            +
                                        </div>
                                    </div>
                                )}
                                {dayTurnos.map((t: any) => (
                                    <div key={t.id} className="bg-white p-3 rounded-lg border border-zinc-200 shadow-sm relative group border-l-4 border-l-indigo-500">

                                        {/* CABECERA: Hora y Botón Borrar */}
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                                                <Clock size={10}/> 
                                                {new Date(t.fecha_inicio).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}
                                            </p>

                                            {/* AQUÍ PEGAS EL BOTÓN */}
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <BotonCancelar idTurno={t.id} />
                                            </div>
                                        </div>

                                        <p className="text-sm font-bold text-zinc-900 truncate pr-4">{t.cliente_nombre}</p>
                                        <p className="text-xs text-zinc-500 truncate">{t.servicio || "Reunión"}</p>
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

    return (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50/50 border-b border-zinc-100 text-zinc-500 font-medium">
                    <tr>
                        <th className="px-6 py-4">Nombre</th>
                        <th className="px-6 py-4">Contacto</th>
                        <th className="px-6 py-4">Servicio</th>
                        <th className="px-6 py-4">Ultimo Turno</th>
                        {/* 1. Nueva columna para acciones */}
                        <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                    {turnos.map((t: any) => (
                        <tr key={t.id} className="group hover:bg-zinc-50">
                            <td className="px-6 py-4 font-medium">{t.cliente_nombre}</td>
                            <td className="px-6 py-4 font-mono text-zinc-600">{t.cliente_email}</td>
                            <td className="px-6 py-4 text-zinc-500">{t.servicio || "General"}</td>
                            <td className="px-6 py-4 font-mono text-zinc-600">
                                {formatearFecha(t.fecha_inicio)}
                            </td>
                            {/* 2. Celda con el botón de contacto */}
                            <td className="px-6 py-4 text-right">
                                <button 
                                    onClick={() => setContactModal({ 
                                        show: true, 
                                        clientEmail: t.cliente_email, 
                                        clientName: t.cliente_nombre 
                                    })}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-bold text-xs"
                                >
                                    <Mail size={14} /> 
                                    Contactar
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
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
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-2xl">
            <header className="mb-8"><h1 className="text-2xl font-bold">Integraciones</h1></header>
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 flex justify-between gap-6">
                <div className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0"><CalendarIcon size={24} /></div>
                    <div>
                        <h3 className="font-bold text-zinc-900">Google Calendar</h3>
                        <p className="text-sm text-zinc-500 mt-1">Sincroniza tus turnos.</p>
                        {negocio.google_calendar_connected ? <div className="mt-2 text-emerald-600 text-sm font-bold flex gap-1 items-center"><Check size={14}/> Conectado</div> : <div className="mt-2 text-zinc-400 text-sm">Desconectado</div>}
                    </div>
                </div>
                <button onClick={handleConnectGoogle} disabled={negocio.google_calendar_connected} className={`px-4 py-2 rounded-lg text-sm font-bold ${negocio.google_calendar_connected ? "bg-zinc-100 text-zinc-400" : "bg-blue-600 text-white"}`}>
                    {negocio.google_calendar_connected ? "Listo" : "Conectar"}
                </button>
                <button 
                            onClick={handleDisconnect}
                            className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
                        >
                             (Desconectar)
                </button>
            </div>
        </div>
    )
}
