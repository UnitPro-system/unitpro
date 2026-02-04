import { useState } from "react";
import { sendRecoveryCode, resetPassword } from "@/app/actions/auth/recover-password"; //
import { KeyRound, Hash, CheckCircle2, Loader2 } from "lucide-react";

export function PasswordManager({ email }: { email: string }) {
  const [step, setStep] = useState<'request' | 'verify' | 'success'>('request');
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendCode = async () => {
    setLoading(true);
    setError("");
    const res = await sendRecoveryCode(email); //
    if (res.success) {
      setStep('verify');
    } else {
      setError("Error al enviar el código. Intenta de nuevo.");
    }
    setLoading(false);
  };

  const handleReset = async () => {
    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const res = await resetPassword(email, code, newPassword); //
    if (res.success) {
      setStep('success');
    } else {
      setError(res.error || "Código incorrecto o expirado.");
    }
    setLoading(false);
  };

  if (step === 'success') {
    return (
      <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl text-center">
        <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={32} />
        <p className="text-emerald-800 font-bold">¡Contraseña actualizada!</p>
        <p className="text-emerald-600 text-sm">Deberás usar tu nueva clave la próxima vez que ingreses.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
      <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
        <KeyRound size={18} className="text-zinc-400" /> 
        Seguridad de la cuenta
      </h3>

      {step === 'request' ? (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">
            Enviaremos un código de 6 dígitos a <strong>{email}</strong> para verificar tu identidad.
          </p>
          <button 
            onClick={handleSendCode}
            disabled={loading}
            className="w-full py-2.5 bg-zinc-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Enviar Código de Verificación
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Código de 6 dígitos</label>
            <input 
              type="text"
              maxLength={6}
              placeholder="000000"
              className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl mt-1 text-center font-mono text-lg tracking-widest"
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Nueva Contraseña</label>
            <input 
              type="password"
              placeholder="••••••••"
              className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl mt-1"
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-red-500 ml-1">{error}</p>}
          <button 
            onClick={handleReset}
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Confirmar Cambio
          </button>
          <button onClick={() => setStep('request')} className="w-full text-xs text-zinc-400 hover:underline">
            Volver a enviar código
          </button>
        </div>
      )}
    </div>
  );
}