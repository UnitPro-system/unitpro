"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Building2, Mail, Lock, Loader2 } from "lucide-react";

export default function RegisterAgency() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    nombreAgencia: "",
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. Crear Usuario en Auth de Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      alert("Error de autenticación: " + authError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      // 2. Generar SLUG automático (Igual que con los negocios)
      const slugGenerado = formData.nombreAgencia
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')  // Quitar caracteres especiales
        .replace(/[\s_-]+/g, '-')  // Espacios a guiones
        + "-" + Math.floor(Math.random() * 1000); // Sufijo random para unicidad

      // 3. Crear la AGENCIA en la base de datos
      const { error: dbError } = await supabase.from("agencies").insert([
        {
          user_id: authData.user.id,
          nombre_agencia: formData.nombreAgencia,
          slug: slugGenerado, // <--- CAMPO NUEVO IMPORTANTE
          plan: 'trial' 
        }
      ]);

      if (!dbError) {
        // Redirigir directamente al nuevo dashboard dinámico
        router.push(`/${slugGenerado}/dashboard`);
        router.refresh();
      } else {
        alert("Error guardando datos de agencia: " + dbError.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-slate-900 mb-6 text-center">Crea tu Agencia SaaS</h1>
        
        <form onSubmit={handleRegister} className="space-y-4">
            <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Nombre de tu Agencia</label>
                <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 text-slate-400" size={20} />
                    <input 
                        required 
                        type="text" 
                        placeholder="Mi Agencia Digital"
                        onChange={(e) => setFormData({...formData, nombreAgencia: e.target.value})} 
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-slate-900 transition-colors"
                    />
                </div>
            </div>
            
            <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Email Admin</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-slate-400" size={20} />
                    <input 
                        required 
                        type="email" 
                        placeholder="admin@miagencia.com"
                        onChange={(e) => setFormData({...formData, email: e.target.value})} 
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-slate-900 transition-colors"
                    />
                </div>
            </div>

            <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Contraseña</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-2.5 text-slate-400" size={20} />
                    <input 
                        required 
                        type="password" 
                        placeholder="******"
                        onChange={(e) => setFormData({...formData, password: e.target.value})} 
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-slate-900 transition-colors"
                    />
                </div>
            </div>

            <button 
                disabled={loading} 
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 flex justify-center transition-all mt-6 shadow-lg shadow-blue-500/30"
            >
                {loading ? <Loader2 className="animate-spin"/> : "Lanzar Agencia"}
            </button>
        </form>
      </div>
    </div>
  );
}