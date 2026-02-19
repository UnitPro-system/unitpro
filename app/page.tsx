import Link from "next/link";
import { CheckCircle, ArrowRight, ShieldCheck, LayoutDashboard, Star, Smartphone } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900 selection:bg-blue-100">
      
      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-zinc-100 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <ShieldCheck size={18} />
            </div>
            Unit Pro
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link 
              href="/register" 
              className="bg-zinc-900 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-zinc-800 transition-all hover:scale-105"
            >
              Empezar Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <header className="pt-32 pb-20 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-6 border border-blue-100">
          Software para Profesionales
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-[1.1] mb-6 text-zinc-900">
          Profesionaliza tu negocio y <span className="text-blue-600">deja de perder clientes.</span>
        </h1>
        <p className="text-xl text-zinc-500 mb-10 max-w-2xl mx-auto leading-relaxed">
          La plataforma todo en uno para técnicos y pymes. Consigue tu propia página web, gestiona tus clientes y mejora tu reputación en Google automáticamente.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/register" 
            className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-full font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 hover:-translate-y-1 flex items-center justify-center gap-2"
          >
            Crear mi cuenta ahora <ArrowRight size={20} />
          </Link>
          <Link 
            href="/login" 
            className="w-full sm:w-auto px-8 py-4 bg-white text-zinc-700 border border-zinc-200 rounded-full font-bold text-lg hover:bg-zinc-50 transition-all"
          >
            Ver Demo
          </Link>
        </div>
        <p className="mt-6 text-xs text-zinc-400">Prueba gratuita de 14 días. No requiere tarjeta de crédito.</p>
      </header>

      {/* --- MOCKUP VISUAL --- */}
      <section className="px-4 mb-24">
        <div className="max-w-5xl mx-auto bg-zinc-900 rounded-2xl p-2 shadow-2xl overflow-hidden ring-1 ring-zinc-900/10">
            <div className="bg-zinc-800 rounded-xl overflow-hidden relative aspect-video flex items-center justify-center border border-zinc-700">
                {/* Aquí podrías poner una captura real de tu dashboard luego */}
                <div className="text-center">
                    <LayoutDashboard className="mx-auto text-zinc-600 mb-4 w-16 h-16"/>
                    <p className="text-zinc-500 font-medium">Panel de Control Inteligente</p>
                </div>
            </div>
        </div>
      </section>

      {/* --- CARACTERÍSTICAS --- */}
      <section className="py-20 bg-zinc-50 border-y border-zinc-200">
        <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold tracking-tight mb-4">Todo lo que necesitas para crecer</h2>
                <p className="text-zinc-500">Deja de usar cuaderno y lápiz. Pásate a la era digital.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                <FeatureCard 
                    icon={<Smartphone className="text-blue-600" />}
                    title="Tu Web Profesional"
                    desc="Generamos automáticamente una Landing Page optimizada para celular donde tus clientes pueden ver tus servicios y pedir presupuesto."
                />
                <FeatureCard 
                    icon={<LayoutDashboard className="text-indigo-600" />}
                    title="Gestión de Clientes (CRM)"
                    desc="Nunca más pierdas un contacto. Todos los pedidos de presupuesto quedan guardados en tu panel privado para que hagas seguimiento."
                />
                <FeatureCard 
                    icon={<Star className="text-yellow-500" />}
                    title="Reputación Google"
                    desc="Nuestro sistema inteligente filtra las malas reseñas para que te lleguen a ti, y envía las 5 estrellas directo a Google Maps."
                />
            </div>
        </div>
      </section>

      {/* --- CTA FINAL --- */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-3xl mx-auto bg-blue-600 rounded-3xl p-12 text-white shadow-2xl shadow-blue-900/20 relative overflow-hidden">
            <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight">¿Listo para escalar tu negocio?</h2>
                <p className="text-blue-100 mb-8 text-lg">Únete a cientos de profesionales que ya están digitalizando sus servicios.</p>
                <Link 
                    href="/register" 
                    className="inline-block px-8 py-4 bg-white text-blue-600 rounded-full font-bold text-lg hover:bg-blue-50 transition-all hover:scale-105 shadow-lg"
                >
                    Comenzar Gratis
                </Link>
            </div>
            {/* Decoración de fondo */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-900 opacity-20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-white border-t border-zinc-100 py-12 text-center text-sm text-zinc-500">
        <p>© 2024 SaaS Pro. Todos los derechos reservados.</p>
        <div className="flex justify-center gap-6 mt-4">
            <Link href="#" className="hover:text-zinc-900">Términos</Link>
            <Link href="#" className="hover:text-zinc-900">Privacidad</Link>
            <Link href="#" className="hover:text-zinc-900">Contacto</Link>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: any) {
    return (
        <div className="bg-white p-8 rounded-2xl border border-zinc-100 hover:border-zinc-200 hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-300">
            <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center mb-6">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-3">{title}</h3>
            <p className="text-zinc-500 leading-relaxed">{desc}</p>
        </div>
    )
}