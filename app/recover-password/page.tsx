'use client'

import { useState } from 'react'
import { sendRecoveryCode, resetPassword } from '@/app/actions/auth/recover-password'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RecoverPasswordPage() {
  const [step, setStep] = useState(1); // 1: Email, 2: Código + Pass
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await sendRecoveryCode(email);
    // Siempre avanzamos al paso 2 por seguridad, aunque el email no exista
    setLoading(false);
    setStep(2);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await resetPassword(email, code, password);
    setLoading(false);

    if (res.success) {
      alert('¡Contraseña cambiada con éxito!');
      router.push('/login');
    } else {
      alert('Error: ' + res.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border">
        <h2 className="text-2xl font-bold mb-6 text-center text-zinc-800">Recuperar Contraseña</h2>

        {step === 1 ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <p className="text-sm text-zinc-900 text-center mb-4">
              Ingresa tu email y te enviaremos un código de 6 dígitos.
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input 
                type="email" required 
                className="w-full p-2 border rounded-lg"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
            <button disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold">
              {loading ? 'Enviando...' : 'Enviar Código'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <p className="text-sm text-green-600 text-center mb-4 bg-green-50 p-2 rounded">
              Hemos enviado un código a {email}
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">Código de 6 dígitos</label>
              <input 
                type="text" required placeholder="Ej: 123456"
                className="w-full p-2 border rounded-lg text-center text-2xl tracking-widest"
                maxLength={6}
                value={code} onChange={e => setCode(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nueva Contraseña</label>
              <input 
                type="password" required placeholder="******"
                className="w-full p-2 border rounded-lg"
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold">
              {loading ? 'Verificando...' : 'Cambiar Contraseña'}
            </button>
            <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-zinc-900 mt-2">
              Volver / Reenviar
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-blue-600 hover:underline">Volver al Login</Link>
        </div>
      </div>
    </div>
  )
}