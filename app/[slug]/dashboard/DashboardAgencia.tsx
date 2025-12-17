"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { ShieldCheck, Plus, LogOut, Users, Smartphone, Loader2, Palette, ExternalLink } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import WebEditor from "./WebEditor"; 

export default function DashboardAgencia() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();

  const [agency, setAgency] = useState<any>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [newClientData, setNewClientData] = useState({ email: "", password: "", nombre: "", whatsapp: "" });
  const [creating, setCreating] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);

  useEffect(() => {
    checkAgencySession();
  }, []);

  async function checkAgencySession() {
    // 1. Verificar que el usuario esté logueado (cualquiera sirve)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) { 
      router.push("/login"); 
      return; 
    }

    // 2. Buscar la agencia por SLUG (sin restricción de dueño)
    const { data: agencyData, error } = await supabase
        .from("agencies")
        .select("*")
        .eq("slug", params.slug)
        .single();
    
    // Si hay error o no existe, solo mostramos error en consola
    if (error || !agencyData) {
        console.error("Agencia no encontrada o error de conexión");
        // Opcional: router.push("/login"); // Si prefieres que te expulse si no existe
        return;
    }

    // ¡ÉXITO! Cargamos los datos sin preguntar "de quién es"
    setAgency(agencyData);
    cargarClientes(agencyData.id);
  }

  async function cargarClientes(agencyId: number) {
    const { data } = await supabase
      .from("negocios")
      .select("*")
      .eq("agency_id", agencyId)
      .order('created_at', { ascending: false });
      
    if (data) setClientes(data);
    setLoading(false);
  }

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newClientData.email,
        password: newClientData.password,
        options: { data: { role: 'cliente' } }
    });

    if (authError) { 
      alert("Error creando usuario: " + authError.message); 
      setCreating(false); 
      return; 
    }

    if (authData.user) {
        const slug = newClientData.nombre
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-') + "-" + Math.floor(Math.random() * 1000);

        const { error: dbError } = await supabase.from("negocios").insert([{
            user_id: authData.user.id,
            agency_id: agency.id,
            nombre: newClientData.nombre,
            slug: slug,
            whatsapp: newClientData.whatsapp,
            mensaje_bienvenida: `Bienvenidos a ${newClientData.nombre}`,
            color_principal: '#000000',
            estado_plan: 'activo', 
            config_web: {
              template: "modern",
              hero: { 
                titulo: newClientData.nombre, 
                subtitulo: "El mejor servicio profesional de la zona.", 
                ctaTexto: "Solicitar Presupuesto", 
                mostrar: true 
              },
              beneficios: { 
                mostrar: true, 
                titulo: "Nuestros Servicios", 
                items: [
                  {titulo: "Atención Rápida", desc: "Respondemos en minutos."},
                  {titulo: "Calidad Garantizada", desc: "Profesionales certificados."},
                  {titulo: "Soporte Local", desc: "Estamos cerca de ti."}
                ]
              }
            }
        }]);

        if (!dbError) {
            setShowModal(false);
            setNewClientData({ email: "", password: "", nombre: "", whatsapp: "" });
            window.location.reload(); 
        } else {
            alert("Error guardando datos del negocio: " + dbError.message);
        }
    }
    setCreating(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-500 gap-2 font-sans">
      <Loader2 className="animate-spin"/> Cargando Panel de Agencia...
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      
      {/* HEADER AGENCIA */}
      <header className="bg-white border-b border-slate-200 px-6 lg:px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2 rounded-lg shadow-md shadow-indigo-200">
              <ShieldCheck size={24}/>
            </div>
            <div>
                <h1 className="text-xl font-bold leading-tight">{agency?.name || agency?.nombre_agencia}</h1>
                <p className="text-xs text-slate-500 font-medium">Panel de Control</p>
            </div>
        </div>
        <div className="flex items-center gap-4">
            {/* Link corregido para usar el slug de la agencia si es necesario */}
            <a href={`/${agency.slug}`} target="_blank" className="text-sm text-indigo-600 font-bold hover:underline hidden md:block">
                Ver mi Landing
            </a>
            <button 
            onClick={handleLogout} 
            className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-2 font-medium transition-colors px-3 py-2 hover:bg-red-50 rounded-lg"
            >
            <LogOut size={16}/> Salir
            </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 lg:p-8">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
                <Users className="text-slate-400"/> Tus Clientes
              </h2>
              <p className="text-slate-500 text-sm mt-1">Gestiona las webs y suscripciones de tus negocios.</p>
            </div>
            <button 
              onClick={() => setShowModal(true)} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5"
            >
                <Plus size={20}/> Nuevo Cliente
            </button>
        </div>

        {/* LISTA DE CLIENTES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clientes.map((cliente) => (
                <div key={cliente.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all p-6 flex flex-col justify-between group">
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md" style={{backgroundColor: cliente.color_principal || '#000'}}>
                                {cliente.nombre.substring(0,1)}
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold border tracking-wide ${cliente.estado_plan === 'activo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                {cliente.estado_plan}
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">{cliente.nombre}</h3>
                        <p className="text-sm text-slate-400 mb-4 truncate font-mono bg-slate-50 inline-block px-2 py-0.5 rounded">/{cliente.slug}</p>
                    </div>
                    
                    <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
                        <button 
                            onClick={() => setEditingClient(cliente)}
                            className="flex-1 text-center py-2.5 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-xs font-bold text-indigo-700 flex items-center justify-center gap-2 transition-colors border border-indigo-100"
                        >
                            <Palette size={14}/> Diseñar
                        </button>
                        
                        <a 
                            href={`/${cliente.slug}`} 
                            target="_blank" 
                            className="flex-1 text-center py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-colors border border-slate-200"
                        >
                            <ExternalLink size={14}/> Ver Web
                        </a>
                    </div>
                </div>
            ))}
            
            {clientes.length === 0 && (
                <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                      <Users className="text-slate-300" size={32}/>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Sin clientes todavía</h3>
                    <p className="text-slate-500 mb-6 max-w-sm mx-auto text-sm">Crea tu primer negocio para empezar a facturar.</p>
                    <button onClick={() => setShowModal(true)} className="text-indigo-600 font-bold hover:underline">Crear el primero</button>
                </div>
            )}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-in zoom-in-95 duration-300 relative">
                <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <LogOut size={20} className="rotate-45" /> 
                </button>
                
                <h3 className="text-2xl font-bold mb-2 text-slate-900">Nuevo Cliente</h3>
                <p className="text-slate-500 text-sm mb-6">Estás creando una cuenta bajo tu agencia.</p>
                
                <form onSubmit={handleCreateClient} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Datos del Negocio</label>
                      <input required placeholder="Nombre Comercial" className="w-full p-3 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all mb-3" onChange={e => setNewClientData({...newClientData, nombre: e.target.value})}/>
                      <input required placeholder="WhatsApp" className="w-full p-3 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" onChange={e => setNewClientData({...newClientData, whatsapp: e.target.value})}/>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <label className="text-xs font-bold text-slate-700 uppercase mb-2 block">Credenciales de Acceso</label>
                        <input required type="email" placeholder="Email del Cliente" className="w-full p-3 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all mb-3" onChange={e => setNewClientData({...newClientData, email: e.target.value})}/>
                        <input required type="password" placeholder="Contraseña Temporal" className="w-full p-3 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" onChange={e => setNewClientData({...newClientData, password: e.target.value})}/>
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                        <button type="submit" disabled={creating} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-indigo-200 transition-all">
                            {creating ? <Loader2 className="animate-spin"/> : "Crear Cuenta"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {editingClient && (
        <WebEditor 
            negocio={editingClient} 
            onClose={() => setEditingClient(null)} 
            onSave={() => cargarClientes(agency.id)} 
        />
      )}

    </div>
  );
}