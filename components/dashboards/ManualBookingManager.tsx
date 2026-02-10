// components/dashboards/ManualBookingManager.tsx
'use client'

import { useState } from 'react'
import { createManualAppointment } from '@/app/actions/confirm-booking/manage-appointment'
import { UserPlus, Clock, Phone, Mail, User } from 'lucide-react'

export default function ManualBookingManager({ slug, workers, services }: { slug: string, workers?: any[], services?: any[] }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    date: '',
    startTime: '09:00',
    duration: '60',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    workerId: workers?.[0]?.id || '',
    service: services?.[0]?.name || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Calcular fecha fin basada en duración
    const start = new Date(`${formData.date}T${formData.startTime}:00`)
    const end = new Date(start.getTime() + Number(formData.duration) * 60000)
    
    const workerName = workers?.find(w => String(w.id) === String(formData.workerId))?.nombre || 'Profesional'

    const res = await createManualAppointment(slug, {
      ...formData,
      start: start.toISOString(),
      end: end.toISOString(),
      workerName
    })

    if (res.success) {
      alert('Turno agendado exitosamente.')
      setFormData({ ...formData, clientName: '', clientPhone: '', clientEmail: '' })
    } else {
      alert('Error: ' + res.error)
    }
    setLoading(false)
  }

  return (
    <div className="p-6 border rounded-2xl bg-white shadow-sm max-w-2xl">
      <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
        <UserPlus className="text-indigo-600" size={22}/> 
        Agendar Turno Manualmente
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cliente</label>
            <input 
              required placeholder="Nombre completo" className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm"
              value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Teléfono</label>
            <input 
              placeholder="Ej: 1122334455" className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm"
              value={formData.clientPhone} onChange={e => setFormData({...formData, clientPhone: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha</label>
            <input 
              type="date" required className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm"
              value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hora</label>
              <input type="time" className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Duración</label>
              <select className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})}>
                <option value="30">30 min</option>
                <option value="60">1 hora</option>
                <option value="90">1.5 h</option>
                <option value="120">2 horas</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Profesional</label>
                <select className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm" value={formData.workerId} onChange={e => setFormData({...formData, workerId: e.target.value})}>
                    {workers?.map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Servicio</label>
                <select className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm" value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})}>
                    {services?.map((s, idx) => <option key={idx} value={s.name}>{s.name}</option>)}
                </select>
            </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition font-bold shadow-lg shadow-indigo-100">
          {loading ? 'Agendando...' : 'Confirmar y Sincronizar'}
        </button>
      </form>
    </div>
  )
}