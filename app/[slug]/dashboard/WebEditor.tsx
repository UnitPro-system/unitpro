"use client";
import ServiceBookingEditor from "@/components/editors/ServiceBookingEditor";
import ProjectEditor from "@/components/editors/ProjectEditor"
import { AlertTriangle } from "lucide-react";

interface Props {
  negocio: any;
  onClose: () => void;
  onSave: () => void;
}

export default function WebEditorFactory({ negocio, onClose, onSave }: Props) {
  // LÓGICA DE SELECCIÓN (STRATEGY PATTERN)

  // 1. Si es Service Booking (Tu caso actual), cargamos el editor completo
  if (negocio.category === 'service_booking') {
    return <ServiceBookingEditor negocio={negocio} onClose={onClose} onSave={onSave} />;
  }

  if (negocio.category === 'project_portfolio') {
     return <ProjectEditor negocio={negocio} onClose={onClose} onSave={onSave} />;
  }
  // 2. Si es cualquier otro tipo futuro, mostramos un aviso por ahora
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md text-center">
        <div className="mx-auto bg-amber-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="text-amber-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Módulo en Desarrollo</h3>
        <p className="text-slate-500 mt-2 mb-6">
          El editor para la categoría <strong>{negocio.category}</strong> estará disponible próximamente.
        </p>
        <button onClick={onClose} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold">
          Entendido
        </button>
      </div>
    </div>
  );
}