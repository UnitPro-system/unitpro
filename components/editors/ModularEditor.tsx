"use client";
// components/editors/ModularEditor.tsx

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Save, Monitor, Smartphone, ExternalLink,
  ChevronLeft, Loader2, Check, Pencil, RefreshCw,
} from "lucide-react";
import { createClient }    from "@/lib/supabase";
import { BLOCKS_REGISTRY } from "@/blocks/_registry";
import type { BlockId, BlockEditorProps } from "@/types/blocks";

const PRIMARY = "#577a2c";

// Columnas reales de la tabla negocios que el editor puede tocar
const DB_FIELDS = [
  "direccion", "horarios", "google_maps_link",
  "whatsapp", "instagram", "facebook", "linkedin",
] as const;

interface ModularEditorProps {
  negocio:  any;
  onClose:  () => void;
  onSaved?: () => void;
}

export default function ModularEditor({ negocio, onClose, onSaved }: ModularEditorProps) {
  const supabase = createClient();

  // ── Estado ────────────────────────────────────────────────────────────────
  const [config, setConfig] = useState<any>(() => {
    const raw = negocio.config_web;
    if (!raw) return {};
    if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return {}; } }
    return { ...raw };
  });

  const [dbFields, setDbFields] = useState<any>(() =>
    Object.fromEntries(DB_FIELDS.map(f => [f, (negocio as any)[f] || ""]))
  );

  const [activeIds,  setActiveIds]  = useState<BlockId[]>([]);
  const [activeTab,  setActiveTab]  = useState<BlockId>("landing");
  const [viewMode,   setViewMode]   = useState<"desktop" | "mobile">("desktop");
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [dirty,      setDirty]      = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [iframeKey,  setIframeKey]  = useState(0);

  // Refs para que el debounce pueda leer el estado más reciente
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configRef   = useRef(config);
  const dbRef       = useRef(dbFields);
  configRef.current = config;
  dbRef.current     = dbFields;

  // ── Cargar bloques activos ─────────────────────────────────────────────────
  useEffect(() => {
    supabase.from("tenant_blocks").select("block_id")
      .eq("negocio_id", negocio.id).eq("active", true)
      .then(({ data }) => {
        if (data) setActiveIds(data.map((b: any) => b.block_id as BlockId));
      });
  }, [negocio.id]);

  // ── Auto-save con debounce → preview en vivo ──────────────────────────────
  // Después de 1.5s sin cambios guarda silenciosamente y recarga el iframe.
  useEffect(() => {
    if (!dirty) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setAutoSaving(true);
      const { error } = await supabase.from("negocios").update({
        config_web: configRef.current,
        ...Object.fromEntries(DB_FIELDS.map(f => [f, dbRef.current[f] || null])),
      }).eq("id", negocio.id);

      setAutoSaving(false);
      if (!error) setIframeKey(k => k + 1);
    }, 1500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [config, dbFields, dirty]);

  // ── Tabs del editor ───────────────────────────────────────────────────────
  const editorTabs = [
    BLOCKS_REGISTRY.landing,
    ...Object.values(BLOCKS_REGISTRY)
      .filter(def =>
        def.id !== "landing" &&
        !!def.EditorPanel &&
        (def.alwaysActive || activeIds.includes(def.id))
      )
      .sort((a, b) => (a.adminOrder ?? 99) - (b.adminOrder ?? 99)),
  ].filter(def => !!def.EditorPanel);

  // ── Helpers de mutación ───────────────────────────────────────────────────
  const updateConfig = useCallback((section: string, field: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
    setDirty(true);
  }, []);

  const updateConfigRoot = useCallback((field: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [field]: value }));
    setDirty(true);
  }, []);

  const updateArray = useCallback((section: string, index: number, field: string, value: any) => {
    setConfig((prev: any) => {
      const items = [...(prev[section]?.items || [])];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, [section]: { ...prev[section], items } };
    });
    setDirty(true);
  }, []);

  const pushToArray = useCallback((section: string, item: any) => {
    setConfig((prev: any) => {
      const items = [...(prev[section]?.items || []), item];
      return { ...prev, [section]: { ...prev[section], items } };
    });
    setDirty(true);
  }, []);

  const removeFromArray = useCallback((section: string, index: number) => {
    setConfig((prev: any) => {
      const items = (prev[section]?.items || []).filter((_: any, i: number) => i !== index);
      return { ...prev, [section]: { ...prev[section], items } };
    });
    setDirty(true);
  }, []);

  const updateDb = useCallback((field: string, value: any) => {
    setDbFields((prev: any) => ({ ...prev, [field]: value }));
    setDirty(true);
  }, []);

  // ── Guardar manual ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaving(true);

    const { error } = await supabase.from("negocios").update({
      config_web: config,
      ...Object.fromEntries(DB_FIELDS.map(f => [f, dbFields[f] || null])),
    }).eq("id", negocio.id);

    setSaving(false);
    if (error) { alert("Error al guardar: " + error.message); return; }

    setSaved(true);
    setDirty(false);
    setIframeKey(k => k + 1);
    setTimeout(() => setSaved(false), 2500);
    onSaved?.();
  };

  const editorProps: BlockEditorProps = {
    negocio, config, dbFields,
    updateConfig, updateConfigRoot, updateArray,
    pushToArray, removeFromArray, updateDb,
  };

  const ActivePanel = BLOCKS_REGISTRY[activeTab]?.EditorPanel;
  const previewUrl  = `/${negocio.slug}`;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex font-sans text-zinc-900 overflow-hidden bg-zinc-100">

      {/* ── PREVIEW ────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 flex-col h-full border-r border-zinc-300 relative">
        <div className="h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-5 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-2 px-3 py-1 bg-[#577a2c]/10 text-[#577a2c] text-xs font-bold rounded-full border border-[#577a2c]/20">
            <Pencil size={12} /> Editor en vivo
          </div>
          <div className="flex bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
            <button onClick={() => setViewMode("desktop")}
              className={`p-2 rounded-md transition-all ${viewMode === "desktop" ? "bg-white shadow text-[#577a2c]" : "text-zinc-400 hover:text-zinc-600"}`}>
              <Monitor size={16} />
            </button>
            <button onClick={() => setViewMode("mobile")}
              className={`p-2 rounded-md transition-all ${viewMode === "mobile" ? "bg-white shadow text-[#577a2c]" : "text-zinc-400 hover:text-zinc-600"}`}>
              <Smartphone size={16} />
            </button>
          </div>
          <a href={previewUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs font-bold text-zinc-500 hover:text-zinc-800 flex items-center gap-1 transition-colors">
            Ver página <ExternalLink size={12} />
          </a>
        </div>

        <div className="flex-1 bg-zinc-200 flex items-center justify-center p-6 overflow-hidden">
          <div className={`relative bg-white shadow-2xl border border-zinc-300 overflow-hidden transition-all duration-500 ${
            viewMode === "mobile"
              ? "w-[390px] h-[844px] rounded-[3rem] border-[10px] border-zinc-800 shadow-xl max-h-full"
              : "w-full h-full rounded-xl"
          }`}>
            {autoSaving && (
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-zinc-500 text-[11px] font-bold px-3 py-1.5 rounded-full border border-zinc-200 shadow-sm">
                <RefreshCw size={11} className="animate-spin" /> Actualizando vista...
              </div>
            )}
            <iframe
              key={iframeKey}
              src={previewUrl}
              className="w-full h-full"
              style={{ border: "none" }}
              title="Preview"
            />
          </div>
        </div>
      </div>

      {/* ── SIDEBAR ────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[440px] bg-white flex flex-col h-full shadow-2xl shrink-0 border-l border-zinc-200">

        {/* Top bar */}
        <div className="h-14 px-4 border-b border-zinc-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <button onClick={onClose}
              className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-zinc-800 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div>
              <p className="font-bold text-sm leading-tight truncate max-w-[180px]">{negocio.nombre}</p>
              <p className="text-xs text-zinc-400">Editor de página</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={previewUrl} target="_blank" rel="noopener noreferrer"
              className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors lg:hidden">
              <ExternalLink size={16} />
            </a>
            <button onClick={handleSave} disabled={saving || !dirty}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                saved  ? "bg-green-50 text-green-700 border border-green-200" :
                !dirty ? "bg-zinc-100 text-zinc-400 cursor-not-allowed" :
                saving ? "opacity-60 cursor-wait text-white" : "text-white hover:opacity-90"
              }`}
              style={!saved && dirty ? { backgroundColor: PRIMARY } : {}}>
              {saving ? <Loader2 size={14} className="animate-spin" />
               : saved ? <><Check size={14} /> Guardado</>
               : <><Save size={14} /> Guardar</>}
            </button>
          </div>
        </div>

        {/* Pestañas */}
        <div className="border-b border-zinc-100 bg-zinc-50 shrink-0 overflow-x-auto">
          <div className="flex gap-0.5 p-2 min-w-max">
            {editorTabs.map(def => (
              <button key={def.id} onClick={() => setActiveTab(def.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  activeTab === def.id
                    ? "bg-white shadow-sm text-zinc-900 border border-zinc-200"
                    : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
                }`}>
                {def.editorLabel || def.name}
              </button>
            ))}
          </div>
        </div>

        {/* Panel activo */}
        <div className="flex-1 overflow-y-auto p-5 pb-24">
          {ActivePanel ? (
            <ActivePanel {...editorProps} />
          ) : (
            <div className="p-12 text-center text-zinc-400 text-sm">
              Este bloque no tiene opciones de edición aún.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 lg:relative p-4 bg-white border-t border-zinc-100 shrink-0">
          <button onClick={handleSave} disabled={saving || !dirty}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              saved  ? "bg-green-50 text-green-700 border border-green-200" :
              !dirty ? "bg-zinc-100 text-zinc-400 cursor-not-allowed" :
              "text-white hover:opacity-90"
            }`}
            style={!saved && dirty ? { backgroundColor: PRIMARY } : {}}>
            {saving ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
             : saved ? <><Check size={16} /> ¡Guardado!</>
             : <><Save size={16} /> Guardar cambios</>}
          </button>
          {autoSaving && (
            <p className="text-center text-xs text-zinc-400 mt-2 flex items-center justify-center gap-1">
              <RefreshCw size={10} className="animate-spin" /> Actualizando vista previa...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}