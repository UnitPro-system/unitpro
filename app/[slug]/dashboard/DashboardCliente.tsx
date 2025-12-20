"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { 
  Users, 
  LayoutDashboard, 
  LogOut, 
  Star, 
  MessageCircle, 
  AlertTriangle, 
  CheckCircle, 
  CreditCard, 
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  Settings,
  Link as LinkIcon,
  Check,
  Calendar,
  Smartphone,
  UserCheck,
  Search,
  Clock,
  MapPin
} from "lucide-react";

// --- CONFIGURACIÓN ---
const CONST_LINK_MP = "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=TU_ID_DE_PLAN"; 

export default function ClientDashboard() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const [leads, setLeads] = useState<any[]>([]);
  const [resenas, setResenas] = useState<any[]>([]);
  const [negocio, setNegocio] = useState<any>(null);
  const [turnos, setTurnos] = useState<any[]>([]); // Estado para los turnos
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>({}); 
  
  const [activeTab, setActiveTab] = useState<"resumen" | "clientes" | "resenas" | "suscripcion" | "configuracion">("resumen");

  // --- CÁLCULOS ESTADÍSTICOS (RESTAURADOS) ---
  // Calculamos el promedio usando TODAS las reseñas (incluidas las de 4 y 5 estrellas)
  const promedio = resenas.length > 0
    ? (resenas.reduce((acc, curr) => acc + curr.puntuacion, 0) / resenas.length).toFixed(1)
    : "0.0";

  // Contador para la gráfica de barras
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  resenas.forEach(r => {
    // @ts-ignore
    if (counts[r.puntuacion] !== undefined) counts[r.puntuacion]++;
  });
  const totalReviews = resenas.length;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleConnectGoogle = () => {
    if (!negocio?.slug) {
        console.error("No hay slug de negocio cargado");
        return;
    }
    window.location.href = `/api/google/auth?slug=${negocio.slug}`;
  };

  useEffect(() => {
    async function cargarDatos() {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !user.email) {
        router.push("/login");
        return;
      }

      setDebugInfo((prev: any) => ({ ...prev, userEmail: user.email }));

      const { data: datosNegocio, error } = await supabase
        .from("negocios")
        .select("*")
        .eq("slug", params.slug)
        .single();

      if (error) {
        console.error("Error Supabase:", error);
        setDebugInfo((prev: any) => ({ ...prev, errorSupabase: error.message, errorCode: error.code }));
      }

      if (!datosNegocio || datosNegocio.email !== user.email) {
        setLoading(false);
        return; 
      }

      setNegocio(datosNegocio);

      if (searchParams.get('google_connected') === 'true') {
        setActiveTab("configuracion");
        router.replace(window.location.pathname, { scroll: false });
      }

      // Cargar Leads
      const { data: datosLeads } = await supabase
        .from("leads")
        .select("*")
        .eq("negocio_id", datosNegocio.id)
        .order('created_at', { ascending: false });
      if (datosLeads) setLeads(datosLeads);

      // Cargar Reseñas (TODAS, para el promedio y gráficos)
      const { data: datosResenas } = await supabase
        .from("resenas")
        .select("*")
        .eq("negocio_id", datosNegocio.id)
        .order('created_at', { ascending: false });
      if (datosResenas) setResenas(datosResenas);

      // SIMULACIÓN DE TURNOS (Esto vendrá de Google Calendar luego)
      // Aquí simulamos 7 turnos próximos ordenados por fecha
      // En el futuro, esto se llenará con datos reales de la integración
      const turnosSimulados = [
        { id: 1, cliente: "Juan Pérez", servicio: "Consulta General", fecha: "2023-10-25", hora: "09:00", estado: "Confirmado" },
        { id: 2, cliente: "Maria Gomez", servicio: "Revisión", fecha: "2023-10-25", hora: "10:30", estado: "Pendiente" },
        { id: 3, cliente: "Carlos Ruiz", servicio: "Mantenimiento", fecha: "2023-10-26", hora: "14:00", estado: "Confirmado" },
        { id: 4, cliente: "Ana López", servicio: "Consulta", fecha: "2023-10-27", hora: "11:00", estado: "Confirmado" },
        { id: 5, cliente: "Pedro Díaz", servicio: "Urgencia", fecha: "2023-10-28", hora: "09:15", estado: "Cancelado" },
        { id: 6, cliente: "Sofia M.", servicio: "Control", fecha: "2023-10-29", hora: "16:00", estado: "Pendiente" },
        { id: 7, cliente: "Luis F.", servicio: "Consulta", fecha: "2023-10-30", hora: "10:00", estado: "Confirmado" },
      ].sort((a, b) => new Date(a.fecha + ' ' + a.hora).getTime() - new Date(b.fecha + ' ' + b.hora).getTime()).slice(0, 7);
      
      setTurnos(turnosSimulados);
      
      setLoading(false);
    }

    cargarDatos();
  }, [params.slug, searchParams, router]); 

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"/>
            <p className="text-zinc-400 text-sm animate-pulse">Cargando panel...</p>
        </div>
    </div>
  );
  
  if (!negocio) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white gap-6 p-10 font-sans">
        <AlertTriangle size={64} className="text-amber-500" />
        <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Acceso Denegado</h1>
            <p className="text-zinc-400">No tienes permisos para ver este negocio o no existe.</p>
        </div>
        <button onClick={() => router.push("/login")} className="bg-white text-black px-6 py-3 rounded-full font-bold">Ir al Login</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 flex font-sans text-zinc-900">
      
      <aside className="w-64 bg-white border-r border-zinc-200 hidden md:flex flex-col sticky top-0 h-screen z-20">
        <div className="p-6">
          <div className="flex items-center gap-3 px-2 mb-8">
            <div className="w-8 h-8 bg-zinc-900 rounded-md flex items-center justify-center text-white font-bold">
                {negocio.nombre.substring(0,1)}
            </div>
            <span className="font-bold tracking-tight truncate">{negocio.nombre}</span>
          </div>

          <nav className="space-y-1">
            <SidebarItem 
                icon={<LayoutDashboard size={18} />} 
                label="General" 
                active={activeTab === "resumen"} 
                onClick={() => setActiveTab("resumen")}
            />
            <SidebarItem 
                icon={<UserCheck size={18} />} 
                label="Clientes" 
                active={activeTab === "clientes"} 
                onClick={() => setActiveTab("clientes")}
            />
            <SidebarItem 
                icon={<MessageCircle size={18} />} 
                label="Reseñas" 
                active={activeTab === "resenas"} 
                onClick={() => setActiveTab("resenas")}
                badge={resenas.filter(r => r.puntuacion <= 3).length}
            />
            <SidebarItem 
                icon={<CreditCard size={18} />} 
                label="Suscripción" 
                active={activeTab === "suscripcion"} 
                onClick={() => setActiveTab("suscripcion")}
            />
            <SidebarItem 
                icon={<Settings size={18} />} 
                label="Configuración" 
                active={activeTab === "configuracion"} 
                onClick={() => setActiveTab("configuracion")}
            />
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-zinc-100">
            <div className="bg-zinc-50 rounded-xl p-3 mb-4 border border-zinc-100">
                <p className="text-xs text-zinc-500 font-medium mb-1">Estado del Plan</p>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${negocio.estado_plan === 'activo' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`}></div>
                    <span className="text-sm font-semibold">{negocio.estado_plan === 'activo' ? 'Premium' : 'Gratuito'}</span>
                </div>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 text-zinc-400 hover:text-red-600 text-sm font-medium transition-colors w-full px-2">
                <LogOut size={16} /> Cerrar Sesión
            </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto h-screen">
        <div className="max-w-6xl mx-auto p-6 lg:p-10">
            
            {/* --- TAB: GENERAL (RESUMEN) --- */}
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
                            value={leads.length} 
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
                            value={turnos.length} 
                            icon={<Calendar className="text-purple-600" size={20}/>}
                            subtext="Para los próximos 7 días"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* SECCIÓN PRÓXIMOS TURNOS (RESTAURADA) */}
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                                <h3 className="font-bold text-zinc-800 text-sm flex items-center gap-2">
                                  <Clock size={16} className="text-zinc-400"/> Próximos 7 Turnos
                                </h3>
                                <button className="text-xs font-medium text-indigo-600 hover:text-indigo-800">Ver Calendario Completo</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-zinc-400 font-medium text-xs uppercase bg-white">
                                        <tr>
                                            <th className="px-5 py-3 font-medium">Hora</th>
                                            <th className="px-5 py-3 font-medium">Cliente</th>
                                            <th className="px-5 py-3 font-medium">Servicio</th>
                                            <th className="px-5 py-3 font-medium text-right">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-50">
                                        {turnos.map((turno) => (
                                            <tr key={turno.id} className="group hover:bg-zinc-50 transition-colors">
                                                <td className="px-5 py-3 font-mono text-zinc-600 font-bold text-xs">
                                                    {turno.fecha} <span className="text-zinc-400">|</span> {turno.hora}
                                                </td>
                                                <td className="px-5 py-3 font-medium text-zinc-900">
                                                    {turno.cliente}
                                                </td>
                                                <td className="px-5 py-3 text-zinc-500 text-xs">
                                                    {turno.servicio}
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                                                      turno.estado === 'Confirmado' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                                      turno.estado === 'Pendiente' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                                                      'bg-zinc-100 text-zinc-500 border-zinc-200'
                                                    }`}>
                                                        {turno.estado}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {turnos.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-5 py-8 text-center text-zinc-400 text-sm">
                                                    No hay turnos próximos agendados.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* DESGLOSE RESEÑAS (BARRAS) */}
                        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 h-fit">
                            <h3 className="font-bold text-zinc-800 text-sm mb-6">Reputación Online</h3>
                            <div className="space-y-4">
                                {[5, 4, 3, 2, 1].map((star) => {
                                    // @ts-ignore
                                    const count = counts[star];
                                    const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                                    return (
                                        <div key={star} className="flex items-center gap-3 text-xs">
                                            <span className="w-3 font-bold text-zinc-500">{star}</span>
                                            <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${star >= 4 ? 'bg-emerald-500' : star === 3 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                                    style={{ width: `${percent}%` }}
                                                ></div>
                                            </div>
                                            <span className="w-6 text-right text-zinc-400 font-mono">{count}</span>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="mt-8 p-4 bg-zinc-50 rounded-xl border border-zinc-100 text-center">
                                <div className="text-3xl font-bold text-zinc-900 mb-1">{promedio}</div>
                                <div className="flex justify-center gap-1 text-yellow-400 mb-2">
                                    {[1,2,3,4,5].map(s => (
                                        <Star key={s} size={14} fill={s <= Math.round(Number(promedio)) ? "currentColor" : "none"} className={s <= Math.round(Number(promedio)) ? "" : "text-zinc-300"}/>
                                    ))}
                                </div>
                                <p className="text-xs text-zinc-400">Promedio General</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: CLIENTES --- */}
            {activeTab === "clientes" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <header className="flex justify-between items-end mb-6">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Base de Clientes</h1>
                            <p className="text-zinc-500 text-sm mt-1">Todos los contactos generados desde tu landing.</p>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                            <input type="text" placeholder="Buscar..." className="pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm outline-none w-64"/>
                        </div>
                    </header>

                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-50/50 border-b border-zinc-100 text-zinc-500 font-medium">
                                <tr>
                                    <th className="px-6 py-4">Nombre</th>
                                    <th className="px-6 py-4">Contacto</th>
                                    <th className="px-6 py-4">Origen</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50">
                                {leads.map((cliente) => (
                                    <tr key={cliente.id} className="group hover:bg-zinc-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-zinc-900">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-xs text-zinc-500">
                                                    {cliente.nombre_cliente.substring(0,1)}
                                                </div>
                                                {cliente.nombre_cliente}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-600 font-mono text-xs">
                                            {cliente.telefono_cliente}
                                        </td>
                                        <td className="px-6 py-4 text-zinc-500 text-xs">
                                            Formulario Web
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-indigo-600 font-bold text-xs hover:underline">Ver Historial</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- TAB: RESEÑAS (TODAS) --- */}
            {activeTab === "resenas" && (
                <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <header className="mb-8 flex justify-between items-end">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Gestión de Reseñas</h1>
                            <p className="text-zinc-500 text-sm mt-1">Historial completo de feedback recibido.</p>
                        </div>
                        <div className="flex gap-2">
                            <div className="bg-emerald-100 px-3 py-1 rounded-full text-xs font-bold text-emerald-700 border border-emerald-200">
                                Positivas: {resenas.filter(r => r.puntuacion >= 4).length}
                            </div>
                            <div className="bg-red-100 px-3 py-1 rounded-full text-xs font-bold text-red-700 border border-red-200">
                                Negativas: {resenas.filter(r => r.puntuacion <= 3).length}
                            </div>
                        </div>
                    </header>

                    <div className="grid gap-4">
                        {/* AHORA MOSTRAMOS TODAS LAS RESEÑAS */}
                        {resenas.map((resena) => (
                            <div key={resena.id} className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${resena.puntuacion >= 4 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                            {resena.puntuacion}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-zinc-900 text-sm">{resena.nombre_cliente || "Anónimo"}</h4>
                                            <span className="text-xs text-zinc-400 flex items-center gap-1">
                                                <Calendar size={10} /> {new Date(resena.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {resena.puntuacion >= 4 ? (
                                        <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border border-emerald-100 flex items-center gap-1">
                                            <MapPin size={10} /> Redirigido a Maps
                                        </span>
                                    ) : (
                                        <span className="bg-red-50 text-red-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border border-red-100 flex items-center gap-1">
                                            <MessageCircle size={10} /> Feedback Interno
                                        </span>
                                    )}
                                </div>
                                
                                <div className={`pl-4 ml-5 border-l-2 ${resena.puntuacion >= 4 ? 'border-emerald-100' : 'border-red-100'}`}>
                                    {resena.puntuacion >= 4 ? (
                                        <p className="text-zinc-400 text-sm italic">
                                            El cliente dejó una calificación alta y fue redirigido a Google Maps. No tenemos el texto aquí.
                                        </p>
                                    ) : (
                                        <p className="text-zinc-700 text-sm italic">"{resena.comentario}"</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- TAB: SUSCRIPCIÓN --- */}
            {activeTab === "suscripcion" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-4xl mx-auto">
                    {/* ... (CONTENIDO DE SUSCRIPCIÓN IGUAL AL ANTERIOR) ... */}
                    <header className="mb-8 text-center">
                        <h1 className="text-2xl font-bold tracking-tight">Gestionar Suscripción</h1>
                        <p className="text-zinc-500 text-sm">Mejora tu plan para desbloquear todas las funcionalidades.</p>
                    </header>

                    <div className="grid md:grid-cols-2 gap-8 items-start">
                        {/* PLAN CARD */}
                        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl shadow-zinc-200/40 overflow-hidden relative">
                             <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900"></div>
                             <div className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="font-bold text-xl">Plan Pro Business</h3>
                                        <p className="text-zinc-500 text-sm">Todo lo que necesitas para crecer.</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-3xl font-bold tracking-tight">$35k</span>
                                        <span className="text-zinc-400 text-xs font-medium block">/mes ARS</span>
                                    </div>
                                </div>

                                <ul className="space-y-4 mb-8">
                                    <li className="flex gap-3 text-sm text-zinc-600">
                                        <CheckCircle size={18} className="text-emerald-500 shrink-0"/> Landing Page Personalizada
                                    </li>
                                    <li className="flex gap-3 text-sm text-zinc-600">
                                        <CheckCircle size={18} className="text-emerald-500 shrink-0"/> Redirección a Google Maps (4+ estrellas)
                                    </li>
                                    <li className="flex gap-3 text-sm text-zinc-600">
                                        <CheckCircle size={18} className="text-emerald-500 shrink-0"/> Captura de Feedback Negativo
                                    </li>
                                    <li className="flex gap-3 text-sm text-zinc-600">
                                        <CheckCircle size={18} className="text-emerald-500 shrink-0"/> Panel de Control de Clientes
                                    </li>
                                </ul>

                                {negocio.estado_plan === 'activo' ? (
                                    <button disabled className="w-full py-3 bg-emerald-50 text-emerald-700 font-bold rounded-xl border border-emerald-100 flex items-center justify-center gap-2 cursor-default">
                                        <ShieldCheck size={18} /> Plan Activo
                                    </button>
                                ) : (
                                    <a 
                                        href={CONST_LINK_MP} 
                                        target="_blank"
                                        className="block w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white text-center font-bold rounded-xl transition-all shadow-lg shadow-zinc-900/20"
                                    >
                                        Suscribirse Ahora
                                    </a>
                                )}
                             </div>
                        </div>

                        {/* INFO LATERAL */}
                        <div className="space-y-6 pt-4">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-zinc-900">Pagos Seguros</h4>
                                    <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                                        Procesamos todos los pagos a través de MercadoPago. Tus datos están encriptados y seguros.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center shrink-0">
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-zinc-900">Cancela cuando quieras</h4>
                                    <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                                        Sin contratos forzosos. Si el servicio no te sirve, puedes darte de baja en cualquier momento desde este panel.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: CONFIGURACIÓN (INTEGRACIONES) --- */}
            {activeTab === "configuracion" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-2xl">
                    <header className="mb-8">
                        <h1 className="text-2xl font-bold tracking-tight mb-1">Integraciones</h1>
                        <p className="text-zinc-500 text-sm">Conecta herramientas externas para potenciar tu negocio.</p>
                    </header>

                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                        <div className="p-6 flex items-start justify-between gap-6">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                                    <Calendar size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-zinc-900">Google Calendar</h3>
                                    <p className="text-sm text-zinc-500 mt-1 leading-relaxed max-w-md">
                                        Sincroniza automáticamente los leads generados como eventos en tu calendario para no perder ninguna cita.
                                    </p>
                                    
                                    {negocio.google_calendar_connected ? (
                                        <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full w-fit font-medium">
                                            <Check size={14} /> 
                                            Conectado como {negocio.email}
                                        </div>
                                    ) : (
                                        <div className="mt-4 flex items-center gap-2 text-sm text-zinc-400 bg-zinc-50 px-3 py-1.5 rounded-full w-fit">
                                            <div className="w-2 h-2 rounded-full bg-zinc-300" />
                                            Sin conectar
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleConnectGoogle}
                                disabled={negocio.google_calendar_connected}
                                className={`
                                    shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                                    ${negocio.google_calendar_connected 
                                        ? "bg-zinc-100 text-zinc-400 cursor-default border border-zinc-200" 
                                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
                                    }
                                `}
                            >
                                {negocio.google_calendar_connected ? (
                                    "Configurado"
                                ) : (
                                    <>
                                        <LinkIcon size={16} />
                                        Conectar
                                    </>
                                )}
                            </button>
                        </div>
                        
                        <div className="bg-zinc-50/50 px-6 py-3 border-t border-zinc-100 flex items-center gap-2 text-xs text-zinc-400">
                            <ShieldCheck size={12} />
                            <span>Solo solicitamos acceso para crear eventos. No leemos tus correos.</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </main>
    </div>
  );
}

// --- COMPONENTES UI REUTILIZABLES ---
function SidebarItem({ icon, label, active, onClick, badge }: any) {
    return (
        <button 
            onClick={onClick}
            className={`
                w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all mb-1
                ${active 
                    ? "bg-zinc-100 text-zinc-900" 
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                }
            `}
        >
            <div className="flex items-center gap-3">
                <span className={active ? "text-zinc-900" : "text-zinc-400"}>{icon}</span>
                {label}
            </div>
            {badge > 0 && (
                <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {badge}
                </span>
            )}
        </button>
    )
}

function StatCard({ title, value, icon, trend, trendPositive, subtext }: any) {
    return (
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-100">
                    {icon}
                </div>
            </div>
            <div>
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-3xl font-extrabold text-zinc-900 tracking-tight">{value}</h3>
                
                {trend && (
                    <div className={`flex items-center gap-1 text-xs font-medium mt-2 ${trendPositive ? 'text-emerald-600' : 'text-zinc-500'}`}>
                        {trendPositive && <TrendingUp size={12} />}
                        {trend}
                    </div>
                )}
                {subtext && <p className="text-zinc-400 text-xs mt-2">{subtext}</p>}
            </div>
        </div>
    )
}