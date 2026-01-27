'use client'

import { useState } from 'react'
import { getCampaignAudience } from '@/app/actions/marketing/get-audience'
import { sendCampaignBatch } from '@/app/actions/marketing/send-campaign' // Crearemos esto en el siguiente paso
import { Loader2, Users, Send, CheckCircle, AlertCircle } from 'lucide-react'

// Definimos el tipo de Cliente para TypeScript
type Cliente = {
  id: string
  cliente_nombre: string
  cliente_email: string
  fecha_inicio: string
}

export default function MarketingCampaign({ negocioId }: { negocioId: string }) {
  // --- ESTADOS ---
  const [step, setStep] = useState<1 | 2>(1) // Paso 1: Filtro/Selección, Paso 2: Redacción/Envío
  const [loadingAudience, setLoadingAudience] = useState(false)
  const [sending, setSending] = useState(false)
  
  // Datos
  const [audience, setAudience] = useState<Cliente[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [fechaLimite, setFechaLimite] = useState('')

  // Redacción
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('Hola {{nombre}},\n\nQueremos invitarte a...')

  // Progreso
  const [progress, setProgress] = useState(0)
  const [stats, setStats] = useState({ sent: 0, errors: 0 })

  // --- LÓGICA DE AUDIENCIA ---

  const handleSearch = async () => {
    if (!fechaLimite) return alert('Selecciona una fecha')
    
    setLoadingAudience(true)
    setAudience([])
    setSelectedIds(new Set()) // Reseteamos selección
    
    const res = await getCampaignAudience(negocioId, fechaLimite)
    
    if (res.success && res.data) {
      setAudience(res.data)
      // Por defecto, seleccionamos a TODOS
      setSelectedIds(new Set(res.data.map((c: any) => c.id)))
    } else {
      alert('Error al buscar clientes: ' + res.error)
    }
    setLoadingAudience(false)
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === audience.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(audience.map(c => c.id)))
    }
  }

  // --- LÓGICA DE ENVÍO POR LOTES (BATCHING) ---

  const handleSendCampaign = async () => {
    if (!subject || !body) return alert('Completa el asunto y el mensaje')
    if (selectedIds.size === 0) return alert('Selecciona al menos un cliente')
    
    const confirmacion = confirm(`¿Estás seguro de enviar esta campaña a ${selectedIds.size} clientes?`)
    if (!confirmacion) return

    setSending(true)
    setProgress(0)
    setStats({ sent: 0, errors: 0 })

    // 1. Filtramos los clientes reales seleccionados
    const targets = audience.filter(c => selectedIds.has(c.id))
    
    // 2. Dividimos en Lotes de 50
    const BATCH_SIZE = 50
    const totalBatches = Math.ceil(targets.length / BATCH_SIZE)
    
    let sentCounter = 0
    let errorCounter = 0

    for (let i = 0; i < totalBatches; i++) {
      const start = i * BATCH_SIZE
      const end = start + BATCH_SIZE
      const batch = targets.slice(start, end)

      // Llamada al Server Action para este lote
      const res = await sendCampaignBatch(negocioId, batch, subject, body)

      if (res.success) {
        sentCounter += res.sent || 0
        errorCounter += (batch.length - (res.sent || 0)) // Asumimos error si no se envió
      } else {
        errorCounter += batch.length
        console.error('Error en lote:', res.error)
      }

      // Actualizar UI
      setStats({ sent: sentCounter, errors: errorCounter })
      const currentProgress = Math.round(((i + 1) / totalBatches) * 100)
      setProgress(currentProgress)
    }

    setSending(false)
    alert(`Campaña finalizada.\nEnviados: ${sentCounter}\nErrores: ${errorCounter}`)
  }

  // --- RENDER ---

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
        <Users className="w-6 h-6 text-blue-600" />
        Campañas de Marketing
      </h2>

      {/* PASO 1: FILTRO Y SELECCIÓN */}
      <div className={`transition-all ${step === 1 ? 'block' : 'hidden'}`}>
        <div className="flex gap-4 items-end mb-6 bg-blue-50 p-4 rounded-md">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enviar a clientes que no vienen desde:
            </label>
            <input 
              type="date" 
              value={fechaLimite}
              onChange={(e) => setFechaLimite(e.target.value)}
              className="w-full border p-2 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button 
            onClick={handleSearch}
            disabled={loadingAudience}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loadingAudience ? <Loader2 className="animate-spin w-4 h-4" /> : 'Buscar Clientes'}
          </button>
        </div>

        {audience.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-700">
                Resultados: {selectedIds.size} seleccionados de {audience.length}
              </h3>
              <div className="text-sm">
                <button onClick={toggleSelectAll} className="text-blue-600 hover:underline">
                  {selectedIds.size === audience.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
              </div>
            </div>

            {/* TABLA CON SCROLL */}
            <div className="border rounded-md max-h-60 overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 sticky top-0">
                  <tr>
                    <th className="p-2 w-10 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.size === audience.length && audience.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="p-2">Nombre</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Última Visita</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {audience.map((cliente) => (
                    <tr key={cliente.id} className={selectedIds.has(cliente.id) ? 'bg-blue-50' : ''}>
                      <td className="p-2 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(cliente.id)}
                          onChange={() => toggleSelect(cliente.id)}
                        />
                      </td>
                      <td className="p-2">{cliente.cliente_nombre}</td>
                      <td className="p-2 text-gray-500">{cliente.cliente_email}</td>
                      <td className="p-2 text-gray-500">
                        {new Date(cliente.fecha_inicio).toLocaleDateString('es-AR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <button 
                onClick={() => setStep(2)}
                disabled={selectedIds.size === 0}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                Siguiente: Redactar Mensaje <Users className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PASO 2: REDACCIÓN Y ENVÍO */}
      <div className={`transition-all ${step === 2 ? 'block' : 'hidden'}`}>
        <div className="mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asunto del Correo</label>
            <input 
              type="text" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ej: ¡Te extrañamos! Acá tenés un descuento..."
              className="w-full border p-2 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mensaje <span className="text-xs text-gray-500">(Usa {'{{nombre}}'} para personalizar)</span>
            </label>
            <textarea 
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full border p-2 rounded-md font-sans"
            />
          </div>
        </div>

        {/* BARRA DE PROGRESO */}
        {sending && (
          <div className="mb-6 bg-gray-50 p-4 rounded-md border border-gray-200">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-semibold text-blue-700">Enviando campaña...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3 h-3"/> Enviados: {stats.sent}</span>
              <span className="flex items-center gap-1 text-red-600"><AlertCircle className="w-3 h-3"/> Fallidos: {stats.errors}</span>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t">
          <button 
            onClick={() => setStep(1)}
            disabled={sending}
            className="text-gray-600 hover:text-gray-900 px-4 py-2"
          >
            ← Volver a Selección
          </button>
          
          <button 
            onClick={handleSendCampaign}
            disabled={sending}
            className={`px-6 py-2 rounded-md text-white font-medium flex items-center gap-2 shadow-lg
              ${sending ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
            `}
          >
            {sending ? <Loader2 className="animate-spin w-5 h-5"/> : <Send className="w-5 h-5"/>}
            {sending ? 'Enviando...' : `Enviar a ${selectedIds.size} clientes`}
          </button>
        </div>
      </div>
    </div>
  )
}