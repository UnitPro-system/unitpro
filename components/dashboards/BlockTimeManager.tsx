'use client'

import { useState } from 'react'
import { blockTime } from '@/app/actions/service-booking/block-time'

// Si tienes la lista de workers, pásala como prop. Si no, asume solo bloqueo general.
export default function BlockTimeManager({ slug, workers }: { slug: string, workers?: any[] }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    startTime: '09:00',
    endTime: '17:00',
    reason: '',
    workerId: 'all', // 'all' para bloqueo general
    isAllDay: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Si eligió "Todo el día", no importan las horas
    const res = await blockTime(slug, {
        ...formData,
        workerId: formData.workerId === 'all' ? undefined : formData.workerId
    });

    if (res.success) {
        alert('Bloqueo creado exitosamente. Se reflejará en el calendario.');
        setFormData({ ...formData, reason: '' }); // Limpiar motivo
    } else {
        alert('Error: ' + res.error);
    }
    setLoading(false);
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm mt-6">
      <h3 className="font-bold text-lg mb-4">Bloquear Horarios / Días Libres</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Fecha */}
        <div>
            <label className="block text-sm font-medium">Fecha a bloquear</label>
            <input 
                type="date" 
                required
                className="w-full p-2 border rounded"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
            />
        </div>

        {/* Checkbox Todo el día */}
        <div className="flex items-center gap-2">
            <input 
                type="checkbox" 
                id="allDay"
                checked={formData.isAllDay}
                onChange={e => setFormData({...formData, isAllDay: e.target.checked})}
            />
            <label htmlFor="allDay" className="text-sm">Bloquear todo el día (Cerrado)</label>
        </div>

        {/* Horarios (Solo si no es todo el día) */}
        {!formData.isAllDay && (
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium">Desde</label>
                    <input 
                        type="time" 
                        className="w-full p-2 border rounded"
                        value={formData.startTime}
                        onChange={e => setFormData({...formData, startTime: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Hasta</label>
                    <input 
                        type="time" 
                        className="w-full p-2 border rounded"
                        value={formData.endTime}
                        onChange={e => setFormData({...formData, endTime: e.target.value})}
                    />
                </div>
            </div>
        )}

        {/* Selección de Profesional (Si existen) */}
        {workers && workers.length > 0 && (
            <div>
                <label className="block text-sm font-medium">A quién aplica:</label>
                <select 
                    className="w-full p-2 border rounded"
                    value={formData.workerId}
                    onChange={e => setFormData({...formData, workerId: e.target.value})}
                >
                    <option value="all">A todo el negocio (Nadie trabaja)</option>
                    {workers.map(w => (
                        <option key={w.id} value={w.id}>{w.nombre}</option>
                    ))}
                </select>
            </div>
        )}

        {/* Motivo */}
        <div>
            <label className="block text-sm font-medium">Motivo (Opcional)</label>
            <input 
                type="text" 
                placeholder="Ej: Feriado, Vacaciones, Trámite personal"
                className="w-full p-2 border rounded"
                value={formData.reason}
                onChange={e => setFormData({...formData, reason: e.target.value})}
            />
        </div>

        <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 transition"
        >
            {loading ? 'Procesando...' : 'Confirmar Bloqueo'}
        </button>

      </form>
    </div>
  );
}