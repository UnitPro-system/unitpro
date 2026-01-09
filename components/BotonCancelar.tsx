"use client"; 

import { useState } from "react";
import { Trash2 } from "lucide-react"; 

// IMPORTANTE: Aquí corregimos la ruta roja. 
// Asumiendo que tu archivo está en app/actions/agendar-turno.ts
import { cancelAppointment } from "@/app/actions/service-booking/manage-appointment"; 

export function BotonCancelar({ idTurno }: { idTurno: string }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    const confirmacion = window.confirm("¿Cancelar esta cita? Se enviará un email al cliente.");
    if (!confirmacion) return;

    setLoading(true);
    const res = await cancelAppointment(idTurno);
    
    if (!res.success) {
      alert("Error: " + res.error);
      setLoading(false);
    }
    // Si es exitoso, no hacemos nada más; revalidatePath refresca la lista solo.
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
      title="Cancelar Cita"
    >
      {loading ? (
        <span className="text-xs font-bold">...</span>
      ) : (
        <Trash2 size={18} />
      )}
    </button>
  );
}