import { FooterSection } from "@/types/web-config";

export function Footer({ data, negocioNombre }: { data: FooterSection, negocioNombre: string }) {
  if (!data.mostrar) return null;

  return (
    <footer className="bg-zinc-900 text-zinc-400 py-12 text-center">
      <div className="max-w-6xl mx-auto px-6">
        <h4 className="text-white font-bold text-lg mb-4">{negocioNombre}</h4>
        <p className="text-sm mb-6">{data.textoCopyright || `© ${new Date().getFullYear()} Todos los derechos reservados.`}</p>
        
        {/* Aquí podrías iterar las redes sociales si existen */}
        {data.redesSociales?.instagram && (
            <a href={data.redesSociales.instagram} target="_blank" className="text-xs hover:text-white mx-2">Instagram</a>
        )}
      </div>
    </footer>
  );
}