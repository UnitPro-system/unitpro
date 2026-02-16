"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

// Importamos tus editores específicos
import ConfirmBookingEditor from "@/components/editors/ConfirmBookingEditor";
import ServiceBookingEditor from "@/components/editors/ServiceBookingEditor";
import ProjectEditor from "@/components/editors/ProjectEditor";

// Importamos el gestor de dominios
import DomainManager from "@/components/dashboards/DomainManager"; 

interface WebEditorProps {
  initialData: any; 
  model: "negocio" | "agencia";
}

export default function WebEditor({ initialData, model }: WebEditorProps) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<"editor" | "domain">("editor"); // Estado para controlar la vista
  const router = useRouter();

  // Función para que los hijos actualicen el estado global si es necesario
  const handleDataChange = (newData: any) => {
    setData(newData);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      
      {/* 1. SIDEBAR IZQUIERDO (Navegación Global) */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full shadow-lg z-20">
        <div className="p-5 border-b border-gray-100">
            <h2 className="font-bold text-xl text-gray-800">Panel de Control</h2>
            <p className="text-xs text-gray-400 mt-1">{data.nombre}</p>
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
            🎨 Editar Web
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

        {/* CONTENIDO DEL SIDEBAR */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          
          {/* CASO A: ESTAMOS EN LA PESTAÑA DE EDITOR */}
          {activeTab === "editor" && (
            <div className="h-full">
                {/* Aquí renderizamos el editor específico según el tipo de negocio */}
                {/* Estos componentes renderizarán SUS PROPIOS inputs en este espacio */}
                
                {data.tipo === "confirm_booking" && (
                  <ConfirmBookingEditor 
                    data={data} 
                    onChange={handleDataChange} 
                    model={model}
                  />
                )}

                {data.tipo === "service_booking" && (
                  <ServiceBookingEditor 
                    data={data} 
                    onChange={handleDataChange} 
                    model={model}
                  />
                )}

                {data.tipo === "project" && (
                  <ProjectEditor 
                    data={data} 
                    onChange={handleDataChange} 
                    model={model}
                  />
                )}

                {/* Si no coincide con ninguno, mostramos un aviso */}
                {!["confirm_booking", "service_booking", "project"].includes(data.tipo) && (
                    <div className="p-6 text-center text-gray-500">
                        Tipo de editor no reconocido: {data.tipo}
                    </div>
                )}
            </div>
          )}

          {/* CASO B: ESTAMOS EN LA PESTAÑA DE DOMINIO */}
          {activeTab === "domain" && (
            <div className="p-4 animate-in fade-in slide-in-from-left-4 duration-300">
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-gray-900">Conexión de Dominio</h3>
                    <p className="text-xs text-gray-500">Configura tu URL personalizada.</p>
                  </div>
                  
                  {/* Aquí va tu componente universal */}
                  <DomainManager 
                    negocioId={data.id} 
                    initialDomain={data.custom_domain} 
                  />
               </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. PREVIEW EN VIVO (Lado Derecho - Siempre visible) */}
      <div className="flex-1 bg-gray-100 flex flex-col h-full relative overflow-hidden">
        {/* Barra superior del preview */}
        <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10">
            <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Vista Previa</span>
                {data.custom_domain && (
                     <a href={`https://${data.custom_domain}`} target="_blank" className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full hover:bg-green-200 transition-colors flex items-center gap-1">
                        {data.custom_domain} <span className="text-[10px]">↗</span>
                     </a>
                )}
            </div>
            {/* Decoración UI */}
            <div className="flex gap-1.5">
                 <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
            </div>
        </div>

        {/* Área de renderizado (Iframe o Componente) */}
        <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start bg-slate-100">
             {/* NOTA: Aquí deberías renderizar la Landing REAL usando 'data'.
                Como 'WebEditor' ya tiene 'data' actualizado, la preview cambiará en tiempo real.
             */}
             <div className="w-full max-w-[1000px] bg-white shadow-2xl rounded-xl overflow-hidden min-h-[800px] border border-gray-200 transform origin-top transition-all duration-300">
                {/* Ejemplo: <LandingCliente initialData={data} /> */}
                <div className="p-10 text-center opacity-50 mt-20">
                    <p>Aquí se renderiza tu componente <code>LandingCliente</code> con los datos actuales.</p>
                    <p className="text-sm mt-2">Título actual: <b>{data.nombre}</b></p>
                </div>
             </div>
        </div>
      </div>
    </div>
  );
}