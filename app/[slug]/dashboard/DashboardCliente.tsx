"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Loader2 } from "lucide-react";


// 1. CARGA DINÁMICA (Igual que en LandingCliente)
const ServiceBookingDashboard = dynamic(() => import("@/components/dashboards/ServiceBookingDashboard"), {
  loading: () => <LoadingScreen />,
});

const ProjectDashboard = dynamic(() => import("@/components/dashboards/ProjectDashboard"), {
  loading: () => <LoadingScreen />,
});

const ConfirmBookingDashboard = dynamic(() => import("@/components/dashboards/ConfirmBookingDashboard"), {
  loading: () => <LoadingScreen />,
});

export default function DashboardFactory() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  
  const [negocio, setNegocio] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 2. FETCH INICIAL: Solo para Auth y Categoría
  useEffect(() => {
    async function initDashboard() {
      // A. Verificar Auth
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !user.email) {
        router.push("/login");
        return;
      }

      // B. Obtener Datos Básicos del Negocio
      const { data: datosNegocio, error } = await supabase
        .from("negocios")
        .select("*") // Traemos todo, incluyendo 'category' si existe
        .eq("slug", params.slug)
        .single();

      // C. Verificar Propiedad (Seguridad)
      if (!datosNegocio || datosNegocio.email !== user.email) {
        // Si no es el dueño, redirigir o mostrar error
        router.push("/login"); 
        return; 
      }

      setNegocio(datosNegocio);
      setLoading(false);
    }

    initDashboard();
  }, [params.slug, router]);

  if (loading) return <LoadingScreen />;
  if (!negocio) return null;

  // 3. SWITCH DE CATEGORÍA (Strategy Pattern)
  const category = negocio.category || 'service_booking'; // Fallback por defecto

  switch (category) {
    case 'service_booking':
      // Le pasamos el objeto 'negocio' ya cargado para no pedirlo de nuevo
      return <ServiceBookingDashboard initialData={negocio} />;
    
    case 'project_portfolio':
      return <ProjectDashboard negocio={negocio} />;

    case 'confirm_booking':
      return <ConfirmBookingDashboard initialData={negocio} />;
      
    
    default:
      return <div className="p-10 text-center text-red-500">Error: Categoría de negocio desconocida ({category}).</div>;
  }
}

// Componente de Carga
function LoadingScreen() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-zinc-900" size={32} />
            <p className="text-zinc-400 text-sm animate-pulse">Iniciando panel...</p>
        </div>
    </div>
  );
}