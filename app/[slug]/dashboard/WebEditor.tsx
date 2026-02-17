"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

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

  return (
    // CAMBIO 1: 'relative' en lugar de 'flex' para permitir superposición
    <div className="h-screen w-screen bg-gray-50 overflow-hidden relative font-sans"> 
      
      {/* 1. PANEL DE CONTROL (Ahora es un bloque flotante, no una barra completa) 
          Ocupa solo lo necesario y flota sobre el contenido (z-50)
      */}
      <div className="absolute top-0 left-0 w-80 bg-white z-50 shadow-xl border-r border-b border-gray-200 rounded-br-2xl overflow-hidden animate-in slide-in-from-left duration-300">
        
        {/* Header con título y botón volver */}
        <div className="p-4 flex items-center gap-3 bg-white">
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

        {/* PESTAÑAS (Diseñar / Dominio) */}
        <div className="flex border-t border-gray-100">
          <button
            onClick={() => setActiveTab("editor")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "editor" 
                ? "text-blue-600 bg-blue-50/50 border-b-2 border-blue-600" 
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
             Diseñar
          </button>
          <button
            onClick={() => setActiveTab("domain")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "domain" 
                ? "text-purple-600 bg-purple-50/50 border-b-2 border-purple-600" 
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
             Dominio
          </button>
        </div>
        
        {/* HEMOS ELIMINADO EL CONTENIDO DE TEXTO AQUÍ ABAJO */}
      </div>

      {/* 2. ÁREA DE TRABAJO (FONDO)
          Ocupa el 100% de la pantalla. El panel de arriba tapa la esquina superior izquierda.
      */}
      <div className="w-full h-full bg-gray-100 relative">
             
             {/* CASO A: Pestaña EDITOR */}
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

             {/* CASO B: Pestaña DOMINIO */}
             {activeTab === "domain" && (
                <div className="w-full h-full p-8 overflow-y-auto bg-slate-100 pt-32"> 
                   {/* Agregamos 'pt-32' (padding top) extra aquí para que el contenido 
                      del dominio no quede oculto detrás del panel flotante al inicio 
                   */}
                   
                   <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in-95 duration-300">
                      {/* Gestor de Dominio */}
                      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 relative z-10">
                          <DomainManager 
                            negocioId={data.id} 
                            initialDomain={data.custom_domain} 
                          />
                      </div>

                      {/* Preview estática de referencia (Fondo) */}
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
  );
}