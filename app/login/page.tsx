"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import Link from 'next/link'
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

    // 1. Validamos contraseña con Supabase (Necesario para seguridad)
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.user || !data.user.email) {
      setError("Email o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    // ELIMINAMOS USER_ID DE LA ECUACIÓN.
    // Usamos puramente el texto del email.
    const userEmail = data.user.email;

    // 2. Buscamos en NEGOCIOS usando el campo de texto 'email'
    const { data: negocio } = await supabase
      .from("negocios")
      .select("slug")
      .eq("email", userEmail) // <--- BUSCA TEXTO CONTRA TEXTO
      .single();

    if (negocio) {
      router.refresh();
      router.push(`/${negocio.slug}/dashboard`);
      return;
    }

    // 3. Buscamos en AGENCIAS usando el campo de texto 'email'
    const { data: agencia } = await supabase
      .from("agencies")
      .select("slug")
      .eq("email", userEmail) // <--- BUSCA TEXTO CONTRA TEXTO
      .single();

    if (agencia) {
      router.refresh();
      router.push(`/${agencia.slug}/dashboard`);
      return;
    }

    // 4. Si el mail no aparece escrito en ninguna tabla
    await supabase.auth.signOut();
    setError(`El email ${userEmail} no tiene ningún negocio asignado en la base de datos.`);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Acceso</h1>
          <p className="text-slate-500 text-sm mt-2">Sistema de Gestión</p>
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
          
          {error && (
            <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 flex items-start gap-3">
                <AlertCircle size={18} className="shrink-0 mt-0.5"/>
                <span>{error}</span>
            </div>
          )}
          <Link href="/recover-password" className="text-sm text-blue-600 hover:underline float-right mb-2">
          ¿Olvidaste tu contraseña?
          </Link>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition-all hover:shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}