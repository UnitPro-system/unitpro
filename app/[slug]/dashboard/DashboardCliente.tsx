"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation"; // 1. Agregado useSearchParams
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
  MoreHorizontal,
  Calendar,
  Smartphone,
  Settings, // 2. Nuevo icono
  Link as LinkIcon, // 2. Nuevo icono
  Check // 2. Nuevo icono
} from "lucide-react";

// --- CONFIGURACIÓN ---
const CONST_LINK_MP = "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=TU_ID_DE_PLAN"; 

export default function ClientDashboard() {
  const params = useParams();
  const searchParams = useSearchParams(); // 3. Hook para leer la URL al volver de Google
  const router = useRouter();
  const supabase = createClient();

  const [leads, setLeads] = useState<any[]>([]);
  const [resenas, setResenas] = useState<any[]>([]);
  const [negocio, setNegocio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 4. Agregada la opción "configuracion" al estado
  const [activeTab, setActiveTab] = useState<"resumen" | "resenas" | "suscripcion" | "configuracion">("resumen");

  // Cálculos
  const promedio = resenas.length > 0
    ? (resenas.reduce((acc, curr) => acc + curr.puntuacion, 0) / resenas.length).toFixed(1)
    : "0.0";

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

  // 5. Nueva función para conectar con Google
  const handleConnectGoogle = () => {
    window.location.href = `/api/google/auth?slug=${params.slug}`;
  };

  useEffect(() => {
    async function cargarDatos() {
      // 6. Modificado para pedir datos de Google
      const { data: datosNegocio, error } = await supabase
        .from("negocios")
        .select("id, nombre, slug, estado_plan, google_calendar_connected, google_email") 
        .eq("slug", params.slug)
        .single();

      if (error || !datosNegocio) {
        setLoading(false);
        return;
      }
      setNegocio(datosNegocio);

      // 7. Auto-detectar si volvemos de conectar Google con éxito
      if (searchParams.get('google_connected') === 'true') {
        setActiveTab("configuracion");
      }

      const { data: datosLeads } = await supabase
        .from("leads")
        .select("*")
        .eq("negocio_id", datosNegocio.id)
        .order('created_at', { ascending: false });
      if (datosLeads) setLeads(datosLeads);

      const { data: datosResenas } = await supabase
        .from("resenas")
        .select("*")
        .eq("negocio_id", datosNegocio.id)
        .order('created_at', { ascending: false });
      if (datosResenas) setResenas(datosResenas);
      
      setLoading(false);
    }
    if (params.slug) cargarDatos();
  }, [params.slug, searchParams]); // 8. Agregado searchParams a dependencias

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"/>
            <p className="text-zinc-400 text-sm animate-pulse">Cargando panel...</p>
        </div>
    </div>
  );
  
  if (!negocio) return <div className="h-screen flex items-center justify-center font-bold">Acceso Denegado</div>;

  return (
    <div className="min-h-screen bg-zinc-50 flex font-sans text-zinc-900">
      
      {/* --- SIDEBAR MINIMALISTA --- */}
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
            {/* 9. Botón nuevo en Sidebar */}
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
            <button 
                onClick={handleLogout} 
                className="flex items-center gap-2 text-zinc-400 hover:text-red-600 text-sm font-medium transition-colors w-full px-2"
            >
                <LogOut size={16} /> Cerrar Sesión
            </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-y-auto h-screen">
        <div className="max-w-6xl mx-auto p-6 lg:p-10">
            
            {/* --- TAB: RESUMEN --- */}
            {activeTab === "resumen" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <header className="mb-8">
                        <h1 className="text-2xl font-bold tracking-tight mb-1">Buenos días, {negocio.nombre}</h1>
                        <p className="text-zinc-500 text-sm">Aquí está lo que está pasando en tu negocio hoy.</p>
                    </header>

                    {/* KPI GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard 
                            title="Total Leads" 
                            value={leads.length} 
                            icon={<Users className="text-blue-600" size={20}/>}
                            trend="+2 esta semana"
                            trendPositive={true}
                        />
                        <StatCard 
                            title="Calificación" 
                            value={promedio} 
                            icon={<Star className="text-yellow-500" size={20} fill="currentColor"/>}
                            subtext={`Basado en ${totalReviews} reseñas`}
                        />
                         <StatCard 
                            title="Tasa de Respuesta" 
                            value="98%" 
                            icon={<Smartphone className="text-emerald-600" size={20}/>}
                            trend="Excelente"
                            trendPositive={true}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* TABLA LEADS (Ocupa 2 columnas) */}
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                                <h3 className="font-bold text-zinc-800 text-sm">Últimos Contactos</h3>
                                <button className="text-xs font-medium text-zinc-500 hover:text-zinc-900">Descargar CSV</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-zinc-400 font-medium text-xs uppercase bg-white">
                                        <tr>
                                            <th className="px-5 py-3 font-medium">Cliente</th>
                                            <th className="px-5 py-3 font-medium">Fecha</th>
                                            <th className="px-5 py-3 font-medium text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-50">
                                        {leads.slice(0, 6).map((lead) => (
                                            <tr key={lead.id} className="group hover:bg-zinc-50 transition-colors">
                                                <td className="px-5 py-3">
                                                    <div className="font-medium text-zinc-900">{lead.nombre_cliente}</div>
                                                    <div className="text-xs text-zinc-400">Interesado en servicios</div>
                                                </td>
                                                <td className="px-5 py-3 text-zinc-500 font-mono text-xs">
                                                    {new Date(lead.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <a 
                                                        href={`https://wa.me/${lead.telefono_cliente}`} 
                                                        target="_blank"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-700 hover:bg-zinc-900 hover:text-white rounded-lg text-xs font-medium transition-all"
                                                    >
                                                        Contactar <ArrowUpRight size={12} />
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                        {leads.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="px-5 py-8 text-center text-zinc-400 text-sm">
                                                    Aún no hay clientes registrados.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* DESGLOSE RESEÑAS (Ocupa 1 columna) */}
                        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 h-fit">
                            <h3 className="font-bold text-zinc-800 text-sm mb-6">Desglose de Opiniones</h3>
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
                                                    className="h-full bg-zinc-900 rounded-full" 
                                                    style={{ width: `${percent}%` }}
                                                ></div>
                                            </div>
                                            <span className="w-6 text-right text-zinc-400 font-mono">{count}</span>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="mt-8 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                                <p className="text-xs text-zinc-500 text-center leading-relaxed">
                                    Mantener un promedio superior a <strong>4.0</strong> aumenta un 30% la conversión de leads.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: RESEÑAS (MODERACIÓN) --- */}
            {activeTab === "resenas" && (
                <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <header className="mb-8 flex justify-between items-end">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Feedback Privado</h1>
                            <p className="text-zinc-500 text-sm mt-1">Opiniones de clientes insatisfechos (no públicas).</p>
                        </div>
                        <div className="bg-zinc-100 px-3 py-1 rounded-full text-xs font-bold text-zinc-600">
                            Total: {resenas.filter(r => r.puntuacion <= 3).length}
                        </div>
                    </header>

                    <div className="grid gap-4">
                        {resenas.filter(r => r.puntuacion <= 3).map((resena) => (
                            <div key={resena.id} className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm">
                                            {resena.puntuacion}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-zinc-900 text-sm">{resena.nombre_cliente || "Anónimo"}</h4>
                                            <span className="text-xs text-zinc-400 flex items-center gap-1">
                                                <Calendar size={10} /> {new Date(resena.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="bg-red-50 text-red-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border border-red-100">
                                        Atención Requerida
                                    </span>
                                </div>
                                <div className="pl-13 border-l-2 border-red-100 pl-4 ml-5">
                                    <p className="text-zinc-700 text-sm italic">"{resena.comentario}"</p>
                                </div>
                            </div>
                        ))}
                        {resenas.filter(r => r.puntuacion <= 3).length === 0 && (
                            <div className="text-center py-24 border-2 border-dashed border-zinc-200 rounded-2xl">
                                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-zinc-900">Bandeja Limpia</h3>
                                <p className="text-zinc-500 text-sm">No hay quejas pendientes por resolver.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- TAB: SUSCRIPCIÓN --- */}
            {activeTab === "suscripcion" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-4xl mx-auto">
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
                                        <CheckCircle size={18} className="text-emerald-500 shrink-0"/> Panel de Control de Leads
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

            {/* 10. --- NUEVA TAB: CONFIGURACIÓN (INTEGRACIONES) --- */}
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
                                            Conectado como {negocio.google_email}
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
                        
                        {/* Footer informativo de la card */}
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