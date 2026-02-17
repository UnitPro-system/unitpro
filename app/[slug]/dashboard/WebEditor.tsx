"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

// Importamos tus editores específicos
import ConfirmBookingEditor from "@/components/editors/ConfirmBookingEditor";
import ServiceBookingEditor from "@/components/editors/ServiceBookingEditor";
import ProjectEditor from "@/components/editors/ProjectEditor";

// Importamos las Landings para la PREVIEW del panel general
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
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full shadow-lg z-20">
        
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

        {/* CONTENIDO DEL SIDEBAR (Solo DomainManager va aquí dentro) */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          
          {/* CASO: Estamos en Pestaña Editor pero NO en modo full screen (estado intermedio o carga) */}
          {activeTab === "editor" && (
             <div className="p-6 text-center text-gray-400 text-sm mt-10">
                <p>Abriendo editor de diseño...</p>
                <Loader2 className="animate-spin mx-auto mt-2" size={20}/>
             </div>
          )}

          {/* CASO: Pestaña Dominio */}
          {activeTab === "domain" && (
            <div className="p-4 animate-in fade-in slide-in-from-left-4 duration-300">
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-gray-900">Conexión de Dominio</h3>
                    <p className="text-xs text-gray-500">Configura tu URL personalizada.</p>
                  </div>
                  <DomainManager 
                    negocioId={data.id} 
                    initialDomain={data.custom_domain} 
                  />
               </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. AREA PRINCIPAL (Preview o Editor) */}
      <div className="flex-1 bg-gray-100 flex flex-col h-full relative overflow-hidden">
        
        {/* Header de la zona de trabajo (Opcional, para dar contexto) */}
        <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10">
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {activeTab === "editor" ? "Modo Edición" : "Vista Previa"}
                </span>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-0 flex justify-center items-start bg-slate-100 relative">
            
            {/* CASO A: Estamos en la pestaña DOMINIO (Mostramos preview estática de fondo) */}
            {activeTab === "domain" && (
              <div className="w-full h-full p-8 overflow-y-auto">
                  <div className="w-full max-w-[1200px] mx-auto bg-white shadow-2xl rounded-xl overflow-hidden min-h-[800px] border border-gray-200 transform origin-top transition-all duration-300 pointer-events-none opacity-50 grayscale">
                      <Suspense fallback={<div className="p-10">Cargando...</div>}>
                          {data.category === "confirm_booking" && <ConfirmBookingLanding initialData={data} />}
                          {data.category === "service_booking" && <ServiceBookingLanding initialData={data} />}
                          {(data.category === "project" || data.category === "project_portfolio") && <ProjectLanding initialData={data} />}
                      </Suspense>
                  </div>
              </div>
            )}

            {/* CASO B: Estamos en la pestaña EDITOR (Renderizamos el Editor REAL aquí dentro) */}
            {activeTab === "editor" && (
              <div className="w-full h-full bg-white animate-in fade-in duration-300">
                  {/* NOTA IMPORTANTE: 
                      Tus componentes Editor (ConfirmBookingEditor, etc.) deben adaptarse al 100% del ancho/alto de su contenedor padre.
                      Si esos componentes tienen 'fixed inset-0' dentro de ellos, deberás quitarlo también.
                  */}
                  
                  {data.category === "confirm_booking" && (
                      <ConfirmBookingEditor negocio={data} onClose={onClose} onSave={onSave} />
                  )}

                  {data.category === "service_booking" && (
                      <ServiceBookingEditor negocio={data} onClose={onClose} onSave={onSave} />
                  )}

                  {(data.category === "project" || data.category === "project_portfolio") && (
                      <ProjectEditor negocio={data} onClose={onClose} onSave={onSave} />
                  )}
              </div>
            )}
        </div>
      </div>

      

    </div>
  );
}