"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  Play, 
  Building2, 
  Globe, 
  ShieldCheck, 
  BarChart, 
  Linkedin, 
  ChevronLeft, 
  ChevronRight,
  Menu,
  X
} from "lucide-react";

export default function CorporateLandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState("consultoria");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Manejo del scroll para el Navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Datos para las pestañas de servicios
  const services = [
    {
      id: "consultoria",
      title: "Consultoría Estratégica",
      icon: <Building2 className="w-6 h-6 mb-4 text-[#f59e0b]" />,
      content: "Alineamos su infraestructura tecnológica con sus objetivos comerciales globales. Nuestros consultores evalúan sus procesos actuales para diseñar hojas de ruta de transformación digital que garantizan escalabilidad y ventaja competitiva en mercados exigentes."
    },
    {
      id: "auditoria",
      title: "Auditoría de Sistemas",
      icon: <ShieldCheck className="w-6 h-6 mb-4 text-[#f59e0b]" />,
      content: "Evaluación exhaustiva de su ecosistema de TI para identificar vulnerabilidades de seguridad, ineficiencias operativas y brechas de cumplimiento. Entregamos reportes detallados nivel ejecutivo con planes de mitigación accionables."
    },
    {
      id: "analitica",
      title: "Analítica de Datos",
      icon: <BarChart className="w-6 h-6 mb-4 text-[#f59e0b]" />,
      content: "Transformamos volúmenes masivos de datos corporativos en inteligencia de negocios estructurada. Implementamos dashboards en tiempo real y modelos predictivos que empoderan a la junta directiva para la toma de decisiones críticas."
    },
    {
      id: "expansion",
      title: "Expansión Global",
      icon: <Globe className="w-6 h-6 mb-4 text-[#f59e0b]" />,
      content: "Facilitamos la integración tecnológica en fusiones, adquisiciones y aperturas en nuevos mercados. Aseguramos una transición sin fricciones unificando sistemas ERP, CRM y protocolos de seguridad a nivel internacional."
    }
  ];

  // Datos para el equipo
  const team = [
    { name: "Elena Rostova", role: "Chief Executive Officer", image: "ER" },
    { name: "Marcus Chen", role: "VP of Engineering", image: "MC" },
    { name: "Sarah Jenkins", role: "Director of Analytics", image: "SJ" },
    { name: "David Althaus", role: "Lead Auditor", image: "DA" }
  ];

  const nextSlide = () => setCurrentSlide((prev) => (prev === team.length - 1 ? 0 : prev + 1));
  const prevSlide = () => setCurrentSlide((prev) => (prev === 0 ? team.length - 1 : prev - 1));

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900 selection:bg-[#f59e0b]/30">
      
      {/* --- NAVBAR --- */}
      <nav 
        className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${
          scrolled 
            ? "bg-[#0a192f]/95 backdrop-blur-md border-zinc-800 shadow-lg py-4" 
            : "bg-[#0a192f] border-transparent py-6"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter text-white">
            <div className="w-8 h-8 bg-[#f59e0b] flex items-center justify-center text-[#0a192f]">
              <Building2 size={20} />
            </div>
            Unit<span className="text-[#f59e0b]">Pro</span> Enterprise
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-300">
            <Link href="#soluciones" className="hover:text-white transition-colors">Soluciones</Link>
            <Link href="#servicios" className="hover:text-white transition-colors">Servicios</Link>
            <Link href="#equipo" className="hover:text-white transition-colors">Nuestro Equipo</Link>
            <div className="h-4 w-px bg-zinc-700"></div>
            <Link href="/login" className="hover:text-white transition-colors">Portal de Clientes</Link>
            <Link 
              href="/demo" 
              className="bg-[#f59e0b] text-[#0a192f] px-6 py-2.5 rounded font-bold hover:bg-[#d97706] transition-colors"
            >
              Solicitar Demo
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <header className="relative pt-40 pb-32 px-6 bg-[#0a192f] overflow-hidden">
        {/* Subtle background gradient pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#112240] via-[#0a192f] to-[#0a192f] opacity-80"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay"></div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-8 text-white">
            Infraestructura Tecnológica para <br className="hidden md:block"/>
            <span className="text-[#f59e0b]">Líderes de la Industria.</span>
          </h1>
          <p className="text-xl text-zinc-400 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
            Soluciones de software corporativo y consultoría estratégica diseñadas para escalar operaciones, garantizar el cumplimiento y optimizar el rendimiento en entornos empresariales complejos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/demo" 
              className="w-full sm:w-auto px-8 py-4 bg-[#f59e0b] text-[#0a192f] rounded font-bold text-lg hover:bg-[#d97706] transition-all flex items-center justify-center gap-2"
            >
              Solicitar demo <ArrowRight size={20} />
            </Link>
            <button 
              className="w-full sm:w-auto px-8 py-4 bg-transparent text-white border border-zinc-600 rounded font-medium text-lg hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
            >
              <Play size={20} className="text-[#f59e0b]" /> Ver video
            </button>
          </div>
        </div>
      </header>

      {/* --- TRUST STRIP --- */}
      <section className="border-b border-zinc-200 bg-zinc-50 py-10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-6">Con la confianza de empresas Fortune 500</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-40 grayscale">
            {/* Logos simulados con texto para el ejemplo */}
            <span className="text-2xl font-black font-serif">AeroCorp</span>
            <span className="text-2xl font-bold tracking-tighter">GLOBAL<span className="font-light">FINANCE</span></span>
            <span className="text-2xl font-extrabold italic">NexusInd</span>
            <span className="text-2xl font-bold uppercase tracking-widest">Vertex</span>
            <span className="text-2xl font-medium">Quantum Logistics</span>
          </div>
        </div>
      </section>

      {/* --- SERVICIOS (TABS) --- */}
      <section id="servicios" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16 md:flex md:justify-between md:items-end">
            <div className="max-w-2xl">
              <h2 className="text-sm font-bold text-[#f59e0b] uppercase tracking-widest mb-3">Nuestros Servicios</h2>
              <h3 className="text-4xl font-bold text-[#0a192f] tracking-tight">Estrategias a la medida de su corporación.</h3>
            </div>
          </div>

          <div className="grid md:grid-cols-12 gap-12 min-h-[400px]">
            {/* Tab Navigation */}
            <div className="md:col-span-4 flex flex-col gap-2">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => setActiveTab(service.id)}
                  className={`text-left px-6 py-5 border-l-4 transition-all duration-200 font-semibold text-lg ${
                    activeTab === service.id
                      ? "border-[#f59e0b] bg-zinc-50 text-[#0a192f]"
                      : "border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                  }`}
                >
                  {service.title}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="md:col-span-8 bg-zinc-50 p-10 md:p-16 border border-zinc-100 flex flex-col justify-center">
              {services.map((service) => (
                <div 
                  key={service.id} 
                  className={`transition-opacity duration-500 ${activeTab === service.id ? "block opacity-100" : "hidden opacity-0"}`}
                >
                  {service.icon}
                  <h4 className="text-3xl font-bold text-[#0a192f] mb-6">{service.title}</h4>
                  <p className="text-lg text-zinc-600 leading-relaxed mb-8">
                    {service.content}
                  </p>
                  <Link href="#" className="inline-flex items-center gap-2 text-[#0a192f] font-bold hover:text-[#f59e0b] transition-colors">
                    Descubrir más <ArrowRight size={16} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- STATS (ANIMATED COUNTERS) --- */}
      <section className="py-24 bg-[#0a192f] text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 divide-x divide-zinc-800">
            <AnimatedCounter end={500} suffix="+" label="Clientes Empresariales" />
            <AnimatedCounter end={99.9} suffix="%" label="Tiempo de Actividad" isDecimal />
            <AnimatedCounter end={25} suffix="" label="Países Operando" />
            <AnimatedCounter end={2.4} suffix="B" label="Datos Procesados (TB)" isDecimal />
          </div>
        </div>
      </section>

      {/* --- TEAM SLIDER --- */}
      <section id="equipo" className="py-24 bg-zinc-50 border-t border-zinc-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-16">
            <div>
              <h2 className="text-sm font-bold text-[#f59e0b] uppercase tracking-widest mb-3">Liderazgo</h2>
              <h3 className="text-4xl font-bold text-[#0a192f] tracking-tight">El equipo detrás del éxito.</h3>
            </div>
            <div className="hidden md:flex gap-4">
              <button onClick={prevSlide} className="p-3 border border-zinc-300 hover:border-[#0a192f] hover:bg-[#0a192f] hover:text-white transition-all">
                <ChevronLeft size={24} />
              </button>
              <button onClick={nextSlide} className="p-3 border border-zinc-300 hover:border-[#0a192f] hover:bg-[#0a192f] hover:text-white transition-all">
                <ChevronRight size={24} />
              </button>
            </div>
          </div>

          <div className="overflow-hidden relative">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {team.map((member, index) => (
                <div key={index} className="min-w-full md:min-w-[50%] lg:min-w-[25%] px-4">
                  <div className="bg-white border border-zinc-200 p-8 h-full group hover:shadow-xl transition-all">
                    <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center text-2xl font-bold text-zinc-400 mb-6 group-hover:bg-[#0a192f] group-hover:text-white transition-colors">
                      {member.image}
                    </div>
                    <h4 className="text-xl font-bold text-[#0a192f] mb-1">{member.name}</h4>
                    <p className="text-zinc-500 text-sm mb-6">{member.role}</p>
                    <a href="#" className="text-zinc-400 hover:text-[#0077b5] transition-colors inline-block">
                      <Linkedin size={20} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Controles móviles */}
          <div className="flex md:hidden justify-center gap-4 mt-8">
            <button onClick={prevSlide} className="p-3 border border-zinc-300 hover:bg-zinc-100"><ChevronLeft size={24} /></button>
            <button onClick={nextSlide} className="p-3 border border-zinc-300 hover:bg-zinc-100"><ChevronRight size={24} /></button>
          </div>
        </div>
      </section>

      {/* --- MEGA FOOTER --- */}
      <footer className="bg-[#050c17] text-zinc-400 py-20 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter text-white mb-6">
                <div className="w-8 h-8 bg-[#f59e0b] flex items-center justify-center text-[#0a192f]">
                  <Building2 size={20} />
                </div>
                Unit<span className="text-[#f59e0b]">Pro</span>
              </div>
              <p className="text-sm leading-relaxed mb-6 max-w-sm">
                Proveyendo infraestructura tecnológica robusta y consultoría estratégica para empresas Fortune 500 alrededor del mundo desde 2010.
              </p>
              <div className="flex gap-4">
                <a href="#" className="hover:text-white transition-colors"><Linkedin size={20} /></a>
                <a href="#" className="hover:text-white transition-colors"><Globe size={20} /></a>
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">Empresa</h4>
              <ul className="space-y-4 text-sm">
                <li><Link href="#" className="hover:text-[#f59e0b] transition-colors">Acerca de Nosotros</Link></li>
                <li><Link href="#" className="hover:text-[#f59e0b] transition-colors">Liderazgo</Link></li>
                <li><Link href="#" className="hover:text-[#f59e0b] transition-colors">Inversores</Link></li>
                <li><Link href="#" className="hover:text-[#f59e0b] transition-colors">Carreras</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">Soluciones</h4>
              <ul className="space-y-4 text-sm">
                <li><Link href="#" className="hover:text-[#f59e0b] transition-colors">Consultoría</Link></li>
                <li><Link href="#" className="hover:text-[#f59e0b] transition-colors">Auditoría IT</Link></li>
                <li><Link href="#" className="hover:text-[#f59e0b] transition-colors">Transformación Cloud</Link></li>
                <li><Link href="#" className="hover:text-[#f59e0b] transition-colors">Ciberseguridad</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">Legal</h4>
              <ul className="space-y-4 text-sm">
                <li><Link href="#" className="hover:text-[#f59e0b] transition-colors">Privacidad</Link></li>
                <li><Link href="#" className="hover:text-[#f59e0b] transition-colors">Términos de Servicio</Link></li>
                <li><Link href="#" className="hover:text-[#f59e0b] transition-colors">Cumplimiento (Compliance)</Link></li>
                <li><Link href="#" className="hover:text-[#f59e0b] transition-colors">Contacto</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-800 text-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <p>© {new Date().getFullYear()} UnitPro Enterprise Systems. Todos los derechos reservados.</p>
            <p>Sede Global: Nueva York, NY.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Subcomponente para los contadores animados
function AnimatedCounter({ end, suffix, label, isDecimal = false }: { end: number, suffix: string, label: string, isDecimal?: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 2000; // 2 seconds

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // easeOutQuart
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setCount(easeProgress * end);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };

    window.requestAnimationFrame(step);
  }, [end]);

  return (
    <div className="text-center px-4">
      <div className="text-5xl font-bold text-[#f59e0b] mb-3 font-serif">
        {isDecimal ? count.toFixed(1) : Math.floor(count)}{suffix}
      </div>
      <div className="text-zinc-400 text-sm uppercase tracking-widest font-semibold">{label}</div>
    </div>
  );
}