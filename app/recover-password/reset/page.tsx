'use client'
import { useState, useEffect } from "react";
import { setNewPassword } from "@/app/actions/auth/recover-password";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
// Importamos el cliente de Supabase para el navegador
import { createClient } from "@/lib/supabase"; 

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionActive, setSessionActive] = useState(false); // Para verificar si el token fue válido
  const router = useRouter();

  useEffect(() => {
    // Al cargar la página, verificamos si Supabase logró establecer la sesión 
    // a partir del hash (#access_token=...) en la URL
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setSessionActive(true);
      } else {
        // Si no hay sesión (token inválido o expirado)
        setError("El enlace de recuperación no es válido o ha expirado. Por favor, solicita uno nuevo.");
      }
    };

    checkSession();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    const res = await setNewPassword(password);
    if (res.success) {
      // Opcional: Cerrar la sesión de recuperación antes de redirigir
      const supabase = createClient();
      await supabase.auth.signOut();
      
      router.push("/login?message=Contraseña actualizada correctamente");
    } else {
      setError(res.error || "Ocurrió un error al actualizar la contraseña");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl border border-zinc-200 shadow-xl">
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">Nueva Contraseña</h1>
      <p className="text-zinc-500 mb-8 text-sm">Elige una contraseña segura que no hayas usado antes.</p>
      
      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Nueva Contraseña</label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-3 text-zinc-400" size={18} />
            <input 
              type="password"
              required
              disabled={!sessionActive} // Deshabilitar si no hay sesión
              className="w-full pl-10 p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none disabled:opacity-50"
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button 
          disabled={loading || !sessionActive} // Deshabilitar si no hay sesión
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          Guardar Nueva Contraseña
        </button>
      </form>
    </div>
  );
}