"use client";

import { useState } from "react";
import { addDomain, removeDomain, checkDomainStatus } from "@/app/actions/domain-actions";

interface DomainManagerProps {
  negocioId: string;
  initialDomain?: string | null;
}

export default function DomainManager({ negocioId, initialDomain }: DomainManagerProps) {
  const [domain, setDomain] = useState(initialDomain || "");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<{ valid: boolean; status: string } | null>(null);

  // 1. Añadir Dominio
  const handleAdd = async () => {
    setLoading(true);
    setError("");
    
    // Validación simple
    if (!inputValue.includes(".")) {
        setError("Por favor ingresa un dominio válido (ej: mitienda.com)");
        setLoading(false);
        return;
    }

    const result = await addDomain(inputValue, negocioId);
    
    if (result.error) {
      setError(result.error);
    } else {
      setDomain(inputValue);
      setInputValue("");
      setStatus({ valid: false, status: "Pending DNS" }); // Asumimos pendiente al crear
    }
    setLoading(false);
  };

  // 2. Eliminar Dominio
  const handleRemove = async () => {
    if (!confirm("¿Estás seguro? Tu sitio dejará de funcionar en este dominio.")) return;
    
    setLoading(true);
    const result = await removeDomain(domain, negocioId);
    if (result.error) {
      setError(result.error);
    } else {
      setDomain("");
      setStatus(null);
    }
    setLoading(false);
  };

  // 3. Verificar Estado (DNS)
  const handleCheckStatus = async () => {
    setLoading(true);
    const result = await checkDomainStatus(domain);
    if (result.error) {
        setError(result.error);
    } else {
        setStatus({ 
            valid: result.valid, 
            status: result.status || "Pending" 
        });
        if (result.valid) {
            alert("¡Felicidades! El dominio está activo y conectado correctamente.");
        } else {
            alert("Aún no detectamos la configuración DNS. Puede tardar hasta 24h.");
        }
    }
    setLoading(false);
  };

  // --- RENDERIZADO ---

  // A) VISTA: NO HAY DOMINIO (Formulario de Añadir)
  if (!domain) {
    return (
      <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Dominio Personalizado</h3>
        <p className="text-sm text-gray-500 mb-4">
          Conecta tu propio dominio (ej. <code>tuempresa.com</code>) para profesionalizar tu marca.
        </p>
        
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="ej: minegocio.com"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toLowerCase())}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            disabled={loading}
          />
          <button
            onClick={handleAdd}
            disabled={loading || !inputValue}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? "Añadiendo..." : "Conectar Dominio"}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  // B) VISTA: DOMINIO AÑADIDO (Panel de Configuración y Status)
  return (
    <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Configuración de Dominio</h3>
          <p className="text-sm text-gray-500 mt-1">
            Tu sitio está accesible en: <a href={`https://${domain}`} target="_blank" className="text-blue-600 font-medium hover:underline">{domain}</a>
          </p>
        </div>
        
        <div className="flex items-center gap-2">
            {/* Badge de Estado */}
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                status?.valid 
                ? "bg-green-100 text-green-700 border-green-200" 
                : "bg-yellow-100 text-yellow-700 border-yellow-200"
            }`}>
                {status?.valid ? "Activo SSL ✅" : "Pendiente Configuración ⏳"}
            </span>
        </div>
      </div>

      {/* Instrucciones DNS (Solo si no está activo o si el usuario quiere verlas) */}
      {!status?.valid && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">⚠️ Acción Requerida: Configura tus DNS</h4>
            <p className="text-sm text-gray-600 mb-4">
                Entra a tu proveedor de dominio (GoDaddy, Namecheap, etc.) y agrega estos 2 registros:
            </p>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-gray-500 border-b">
                        <tr>
                            <th className="pb-2">Tipo</th>
                            <th className="pb-2">Nombre (Host)</th>
                            <th className="pb-2">Valor (Value)</th>
                            <th className="pb-2">TTL</th>
                        </tr>
                    </thead>
                    <tbody className="font-mono text-gray-800">
                        <tr className="border-b last:border-0">
                            <td className="py-2">A</td>
                            <td className="py-2">@</td>
                            <td className="py-2 select-all">76.76.21.21</td>
                            <td className="py-2">Automático</td>
                        </tr>
                        <tr>
                            <td className="py-2">CNAME</td>
                            <td className="py-2">www</td>
                            <td className="py-2 select-all">cname.vercel-dns.com</td>
                            <td className="py-2">Automático</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-gray-500 mt-3">
                *Nota: Los cambios pueden tardar hasta 48 horas en propagarse, aunque suelen ser rápidos.
            </p>
        </div>
      )}

      {/* Botones de Acción */}
      <div className="flex gap-3 pt-4 border-t border-gray-100">
        <button
            onClick={handleCheckStatus}
            disabled={loading}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
        >
            {loading ? "Verificando..." : "🔄 Verificar Conexión DNS"}
        </button>
        
        <button
            onClick={handleRemove}
            disabled={loading}
            className="ml-auto px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
        >
            Eliminar Dominio
        </button>
      </div>
      
      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
    </div>
  );
}