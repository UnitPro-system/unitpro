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

    // 1. Crear Usuario (Auth)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      alert("Error: " + authError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      // 2. Crear la AGENCIA
      const { error: dbError } = await supabase.from("agencies").insert([
        {
          user_id: authData.user.id,
          nombre_agencia: formData.nombreAgencia,
          plan: 'trial' // Empiezan en prueba
        }
      ]);

      if (!dbError) {
        router.push("/admin"); // Lo mandamos a SU dashboard de agencia
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
                <label className="text-sm font-bold text-slate-700">Nombre de tu Agencia</label>
                <input required type="text" onChange={(e) => setFormData({...formData, nombreAgencia: e.target.value})} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-slate-900"/>
            </div>
            <div>
                <label className="text-sm font-bold text-slate-700">Email Admin</label>
                <input required type="email" onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-slate-900"/>
            </div>
            <div>
                <label className="text-sm font-bold text-slate-700">Contraseña</label>
                <input required type="password" onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-slate-900"/>
            </div>
            <button disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 flex justify-center">
                {loading ? <Loader2 className="animate-spin"/> : "Lanzar Agencia"}
            </button>
        </form>
      </div>
    </div>
  );
}