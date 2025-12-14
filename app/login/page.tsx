"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Autenticar usuario con Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      setError("Credenciales incorrectas.");
      setLoading(false);
      return;
    }

    // Refrescar para actualizar cookies de sesión
    router.refresh(); 

    // 2. ENRUTAMIENTO INTELIGENTE (Corrección aquí)
    
    // A) Chequear si es AGENCIA (SuperAdmin)
    const { data: agencia } = await supabase
      .from("agencies")
      .select("slug") // IMPORTANTE: Pedir el slug
      .eq("user_id", data.user.id)
      .single();

    if (agencia && agencia.slug) {
      // Redirige a SU propio dashboard dinámico
      router.push(`/${agencia.slug}/dashboard`); 
      return; 
    }

    // B) Chequear si es CLIENTE FINAL (Negocio)
    const { data: negocio } = await supabase
      .from("negocios")
      .select("slug") // IMPORTANTE: Pedir el slug
      .eq("user_id", data.user.id)
      .single();

    if (negocio && negocio.slug) {
      // Redirige a SU propio dashboard dinámico
      router.push(`/${negocio.slug}/dashboard`);
      return;
    }

    // C) Si no tiene perfil asociado (Caso raro, tal vez usuario nuevo sin datos)
    // Lo mandamos a registrar o mostramos error
    setError("Usuario sin perfil de Agencia o Negocio asociado.");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Acceso a Plataforma</h1>
          <p className="text-slate-500 text-sm mt-2">Agencias y Clientes</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-600 text-slate-900 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-600 text-slate-900 transition-colors"
            />
          </div>
          
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition-all hover:shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Ingresar"}
          </button>
        </form>
        
        <div className="mt-6 text-center pt-6 border-t border-slate-100">
            <p className="text-sm text-slate-500 mb-2">¿Quieres crear tu propia Agencia de Software?</p>
            <button 
              onClick={() => router.push("/register")} 
              className="text-blue-600 font-bold text-sm hover:underline"
            >
              Registrar Agencia Nueva
            </button>
        </div>
      </div>
    </div>
  );
}