import { User } from "lucide-react";
import { TestimonialsSection } from "@/types/web-config";

export function Testimonials({ data, primaryColor }: { data: TestimonialsSection, primaryColor: string }) {
  if (!data.mostrar) return null;

  return (
    <section className="py-20 bg-zinc-50">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-12 text-zinc-900">{data.titulo}</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {data.items.map((item, i) => (
            <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>
                  <User size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm text-zinc-900">{item.nombre}</p>
                  {item.cargo && <p className="text-xs text-zinc-500">{item.cargo}</p>}
                </div>
              </div>
              <p className="text-zinc-600 text-sm italic">"{item.comentario}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}