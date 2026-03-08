"use client";

// app/[slug]/dashboard/DashboardCliente.tsx
// Factory: detecta system primero, luego category para legacy.

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

// ── Sistema modular (negocios nuevos) ──────────────────────────────────────
const ModularDashboard = dynamic(
  () => import("@/components/dashboards/ModularDashboard"),
  { loading: () => <LoadingScreen /> }
);

// ── Legacy activo ──────────────────────────────────────────────────────────
const ConfirmBookingDashboard = dynamic(
  () => import("@/components/dashboards/ConfirmBookingDashboard"),
  { loading: () => <LoadingScreen /> }
);

// ── Legacy histórico (negocios existentes, no se crean nuevos) ────────────
const ServiceBookingDashboard = dynamic(
  () => import("@/components/dashboards/ServiceBookingDashboard"),
  { loading: () => <LoadingScreen /> }
);
const ProjectDashboard = dynamic(
  () => import("@/components/dashboards/ProjectDashboard"),
  { loading: () => <LoadingScreen /> }
);

export default function DashboardCliente() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [negocio, setNegocio] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initDashboard() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.email) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("negocios")
        .select("*")
        .eq("slug", params.slug)
        .single();

      if (!data || data.email !== user.email) {
        router.push("/login");
        return;
      }

      setNegocio(data);
      setLoading(false);
    }

    initDashboard();
  }, [params.slug, router]);

  if (loading) return <LoadingScreen />;
  if (!negocio) return null;

  // ── Sistema modular: tiene prioridad sobre todo lo demás ──────────────────
  if (negocio.system === "modular") {
    return <ModularDashboard initialData={negocio} />;
  }

  // ── Legacy: bifurca por category ──────────────────────────────────────────
  const category = negocio.category || "confirm_booking";

  if (category === "confirm_booking") {
    return <ConfirmBookingDashboard initialData={negocio} />;
  }
  if (category === "service_booking") {
    return <ServiceBookingDashboard initialData={negocio} />;
  }
  if (category === "project_portfolio") {
    return <ProjectDashboard negocio={negocio} />;
  }

  return (
    <div className="p-10 text-center text-red-500">
      Categoría desconocida: {category}
    </div>
  );
}

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