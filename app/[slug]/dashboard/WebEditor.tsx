"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

// Importamos tus editores específicos
import ConfirmBookingEditor from "@/components/editors/ConfirmBookingEditor";
import ServiceBookingEditor from "@/components/editors/ServiceBookingEditor";
import ProjectEditor from "@/components/editors/ProjectEditor";

// Importamos las Landings para la PREVIEW (usadas de fondo en la pestaña dominio)
import ConfirmBookingLanding from "@/components/landings/ConfirmBookingLanding";
import ServiceBookingLanding from "@/components/landings/ServiceBookingLanding";
import ProjectLanding from "@/components/landings/ProjectLanding";

// Importamos el gestor de dominios
import DomainManager from "@/components/dashboards/DomainManager"; 

interface WebEditorProps {
  initialData: any; 
  model: "negocio" | "agencia";
  onClose: () => void; 
  onSave: () => void;  
}

export default function WebEditor({ initialData, model, onClose, onSave }: WebEditorProps) {
  if (!initialData) {
      console.error("WebEditor Error: Missing initialData");
      return null;
  }
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<"editor" | "domain">("editor"); 
  const router = useRouter();

  const handleDataChange = (newData: any) => {
    setData(newData);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden fixed inset-0 z-50"> 
      
      {/* 1. SIDEBAR IZQUIERDO (Navegación Global) */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full shadow-lg z-20 shrink-0">
        
        {/* Header del Dashboard */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-white">
            <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-800 transition-colors"
                title="Volver al Dashboard"
            >
                <ArrowLeft size={20} />
            </button>
            <div>
                <h2 className="font-bold text-lg text-gray-800 leading-tight">Editor Web</h2>
                <p className="text-xs text-gray-400 truncate w-40">{data.nombre}</p>
            </div>
        </div>

        {/* PESTAÑAS PRINCIPALES */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("editor")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "editor" 
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            🎨 Diseñar
          </button>
          <button
            onClick={() => setActiveTab("domain")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "domain" 
                ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50/50" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            🌐 Dominio
          </button>
        </div>

        {/* CONTENIDO DEL SIDEBAR (Información de contexto) */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
          {activeTab === "editor" && (
             <div className="text-center text-gray-400 text-sm mt-4">
                <p className="mb-2">Modo Edición Activo</p>
                <p className="text-xs">Usa el panel derecho para modificar el contenido y el diseño.</p>
             </div>
          )}

          {activeTab === "domain" && (
            <div className="text-center text-gray-400 text-sm mt-4">
               <p className="mb-2">Configuración DNS</p>
               <p className="text-xs">Conecta tu propio dominio para profesionalizar tu marca.</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. ÁREA PRINCIPAL (Donde se cargan los editores o el gestor de dominio) */}
      <div className="flex-1 bg-gray-100 flex flex-col h-full relative overflow-hidden">
        
        {/* Header de la zona de trabajo */}
        <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10 shrink-0">
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {activeTab === "editor" ? "Espacio de Trabajo" : "Gestión de Dominio"}
                </span>
            </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
             
             {/* CASO A: Pestaña EDITOR (Renderizamos el editor AQUÍ DENTRO) */}
             {activeTab === "editor" && (
               <div className="w-full h-full bg-white animate-in fade-in duration-300">
                  {data.category === "confirm_booking" && (
                    <ConfirmBookingEditor 
                      negocio={data} 
                      onClose={onClose} 
                      onSave={onSave} 
                    />
                  )}

                  {data.category === "service_booking" && (
                    <ServiceBookingEditor 
                      negocio={data} 
                      onClose={onClose}
                      onSave={onSave}
                    />
                  )}

                  {(data.category === "project" || data.category === "project_portfolio") && (
                     <ProjectEditor 
                       negocio={data} 
                       onClose={onClose}
                       onSave={onSave}
                     />
                  )}
               </div>
             )}

             {/* CASO B: Pestaña DOMINIO (Renderizamos DomainManager y una preview de fondo) */}
             {activeTab === "domain" && (
                <div className="w-full h-full p-8 overflow-y-auto bg-slate-100">
                   <div className="max-w-4xl mx-auto space-y-8">
                      {/* Gestor de Dominio */}
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                          <DomainManager 
                            negocioId={data.id} 
                            initialDomain={data.custom_domain} 
                          />
                      </div>

                      {/* Preview estática de referencia */}
                      <div className="opacity-40 grayscale pointer-events-none border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white min-h-[500px]">
                         <div className="p-4 border-b text-xs font-bold text-gray-400 text-center uppercase">Vista Previa del Sitio</div>
                         <Suspense fallback={<div className="p-10 text-center">Cargando...</div>}>
                            {data.category === "confirm_booking" && <ConfirmBookingLanding initialData={data} />}
                            {data.category === "service_booking" && <ServiceBookingLanding initialData={data} />}
                            {(data.category === "project" || data.category === "project_portfolio") && <ProjectLanding initialData={data} />}
                        </Suspense>
                      </div>
                   </div>
                </div>
             )}
        </div>
      </div>

    </div>
  );
}