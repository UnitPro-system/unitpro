'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { League_Spartan } from 'next/font/google';
import Link from 'next/link';
import { ArrowRight, Layers, Zap, Shield, Globe, ShieldCheck } from 'lucide-react';

// Importando League Spartan optimizada para Next.js
const leagueSpartan = League_Spartan({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'] 
});

export default function Home() {
  // Ref para trackear el scroll del contenedor Hero
  const heroContainerRef = useRef<HTMLDivElement>(null);
  
  // Hook useScroll para obtener el progreso del scroll
  const { scrollYProgress } = useScroll({
    target: heroContainerRef,
    offset: ["start start", "end start"]
  });

  // Física de scroll suave con useSpring
  const smoothScrollYProgress = useSpring(scrollYProgress, {
    stiffness: 50,
    damping: 20,
    restDelta: 0.001
  });

  // Transformaciones para el morphing de círculos a bandas
  // Círculo 1 (más grande, verde oscuro)
  const circle1Scale = useTransform(smoothScrollYProgress, [0, 0.5], [1, 15]);
  const circle1Radius = useTransform(smoothScrollYProgress, [0, 0.5], ['100%', '0%']);
  const circle1Width = useTransform(smoothScrollYProgress, [0, 0.5], ['100%', '100vw']);
  const circle1Height = useTransform(smoothScrollYProgress, [0, 0.5], ['100%', '18vh']);
  const circle1Y = useTransform(smoothScrollYProgress, [0, 0.5], ['0%', '-35vh']);

  // Círculo 2
  const circle2Scale = useTransform(smoothScrollYProgress, [0, 0.5], [1, 15]);
  const circle2Radius = useTransform(smoothScrollYProgress, [0, 0.5], ['100%', '0%']);
  const circle2Width = useTransform(smoothScrollYProgress, [0, 0.5], ['100%', '100vw']);
  const circle2Height = useTransform(smoothScrollYProgress, [0, 0.5], ['100%', '16vh']);
  const circle2Y = useTransform(smoothScrollYProgress, [0, 0.5], ['0%', '-12vh']);

  // Círculo 3
  const circle3Scale = useTransform(smoothScrollYProgress, [0, 0.5], [1, 15]);
  const circle3Radius = useTransform(smoothScrollYProgress, [0, 0.5], ['100%', '0%']);
  const circle3Width = useTransform(smoothScrollYProgress, [0, 0.5], ['100%', '100vw']);
  const circle3Height = useTransform(smoothScrollYProgress, [0, 0.5], ['100%', '14vh']);
  const circle3Y = useTransform(smoothScrollYProgress, [0, 0.5], ['0%', '10vh']);

  // Círculo 4 (más pequeño)
  const circle4Scale = useTransform(smoothScrollYProgress, [0, 0.5], [1, 15]);
  const circle4Radius = useTransform(smoothScrollYProgress, [0, 0.5], ['100%', '0%']);
  const circle4Width = useTransform(smoothScrollYProgress, [0, 0.5], ['100%', '100vw']);
  const circle4Height = useTransform(smoothScrollYProgress, [0, 0.5], ['100%', '12vh']);
  const circle4Y = useTransform(smoothScrollYProgress, [0, 0.5], ['0%', '30vh']);

  // Opacidad del texto principal (fade out al final del scroll)
  const textOpacity = useTransform(smoothScrollYProgress, [0.3, 0.6], [1, 0]);
  const textY = useTransform(smoothScrollYProgress, [0, 0.5], [0, -50]);

  // Variantes de animación para el reveal de abajo hacia arriba
  const fadeInUp = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <div className={`min-h-screen bg-[#eee9dd] text-neutral-900 overflow-x-hidden font-sans ${leagueSpartan.className} selection:bg-[#c9efa3]`}>
      
      {/* Textura de ruido de fondo */}
      <div 
        className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full bg-[#eee9dd]/80 backdrop-blur-md border-b border-neutral-300/50 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter">
            <div className="w-10 h-10 bg-[#4c6618] rounded-xl flex items-center justify-center text-[#eee9dd] shadow-lg shadow-[#4c6618]/20">
              <ShieldCheck size={22} />
            </div>
            UnitPro
          </div>
          <div className="flex items-center gap-6">
            <Link 
              href="/login" 
              className="text-base font-semibold text-neutral-600 hover:text-[#4c6618] transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link 
              href="/register" 
              className="bg-[#4c6618] text-[#eee9dd] px-6 py-2.5 rounded-full text-base font-bold hover:bg-[#3a4e12] transition-all hover:scale-105 shadow-md"
            >
              Empezar Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION CON SCROLLYTELLING --- */}
      <div 
        ref={heroContainerRef}
        className="relative h-[300vh]"
      >
        {/* Contenedor sticky que se mantiene fijo durante el scroll */}
        <div className="sticky top-0 h-screen overflow-hidden flex flex-col items-center justify-center">
          
          {/* Contenedor de los círculos/bandas con posición absoluta */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            
            {/* Círculo 1 (Más grande, verde oscuro) → Banda superior */}
            <motion.div 
              className="absolute bg-[#4c6618] shadow-2xl"
              style={{
                width: circle1Width,
                height: circle1Height,
                borderRadius: circle1Radius,
                scale: circle1Scale,
                y: circle1Y,
              }}
              initial={{ width: '16rem', height: '16rem', borderRadius: '100%' }}
            />
            
            {/* Círculo 2 → Banda segunda */}
            <motion.div 
              className="absolute bg-[#649237] shadow-xl"
              style={{
                width: circle2Width,
                height: circle2Height,
                borderRadius: circle2Radius,
                scale: circle2Scale,
                y: circle2Y,
              }}
              initial={{ width: '13rem', height: '13rem', borderRadius: '100%' }}
            />
            
            {/* Círculo 3 → Banda tercera */}
            <motion.div 
              className="absolute bg-[#8fab5d] shadow-lg"
              style={{
                width: circle3Width,
                height: circle3Height,
                borderRadius: circle3Radius,
                scale: circle3Scale,
                y: circle3Y,
              }}
              initial={{ width: '10rem', height: '10rem', borderRadius: '100%' }}
            />
            
            {/* Círculo 4 (Más chico) → Banda inferior */}
            <motion.div 
              className="absolute bg-[#c9efa3] shadow-md"
              style={{
                width: circle4Width,
                height: circle4Height,
                borderRadius: circle4Radius,
                scale: circle4Scale,
                y: circle4Y,
              }}
              initial={{ width: '7rem', height: '7rem', borderRadius: '100%' }}
            />
          </div>

          {/* Textos del Hero con Mix Blend Mode */}
          <motion.div
            style={{ opacity: textOpacity, y: textY }}
            className="relative z-50 flex flex-col items-center justify-center text-center px-6"
          >
            {/* Badge */}
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#c9efa3]/30 text-[#4c6618] text-sm font-bold uppercase tracking-widest mb-6 border border-[#8fab5d]/20 mix-blend-difference"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              Software Premium para Profesionales
            </motion.div>
            
            {/* Título principal con mix-blend-difference */}
            <motion.h1 
              className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter mb-6 leading-none mix-blend-difference text-white"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              UnitPro
            </motion.h1>
            
            {/* Subtítulo con mix-blend-difference */}
            <motion.p 
              className="text-xl md:text-3xl font-medium mb-10 tracking-tight max-w-2xl mx-auto leading-relaxed mix-blend-difference text-white/90"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              La plataforma definitiva para escalar tu negocio. Elegancia, eficiencia y control absoluto en un solo lugar.
            </motion.p>
            
            {/* Botones CTA */}
            <motion.div 
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.8 }}
            >
              <Link 
                href="/register" 
                className="w-full sm:w-auto px-8 py-4 bg-[#4c6618] hover:bg-[#3a4e12] transition-colors text-[#eee9dd] rounded-full font-bold text-xl tracking-tight flex items-center justify-center gap-2 group shadow-lg shadow-[#4c6618]/20"
              >
                Comenzar ahora
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/login" 
                className="w-full sm:w-auto px-8 py-4 bg-transparent border-2 border-neutral-300 hover:border-neutral-900 text-neutral-900 rounded-full font-bold text-xl tracking-tight transition-all flex items-center justify-center mix-blend-difference border-white/50 text-white hover:border-white"
              >
                Agendar Demo
              </Link>
            </motion.div>
            
            {/* Texto pequeño */}
            <motion.p 
              className="mt-8 text-sm font-medium text-neutral-500 mix-blend-difference text-white/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.6 }}
            >
              Prueba gratuita de 14 días. No requiere tarjeta de crédito.
            </motion.p>
          </motion.div>

          {/* Indicador de scroll */}
          <motion.div 
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
            style={{ opacity: textOpacity }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.6 }}
          >
            <span className="text-xs font-medium text-neutral-500 mix-blend-difference text-white/60 uppercase tracking-widest">Scroll</span>
            <motion.div 
              className="w-6 h-10 border-2 border-neutral-400 mix-blend-difference border-white/40 rounded-full flex justify-center pt-2"
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <motion.div className="w-1.5 h-1.5 bg-neutral-400 mix-blend-difference bg-white/60 rounded-full" />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* --- FEATURES SECTION --- */}
      <section className="py-24 px-6 md:px-12 lg:px-24 bg-white/40 border-y border-neutral-200/50">
        <div className="max-w-7xl mx-auto">
          
          <motion.div 
            className="text-center mb-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
          >
            <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-r from-[#4c6618] to-neutral-800">
              Características Premium
            </h2>
            <p className="text-xl md:text-2xl text-neutral-600 font-medium tracking-tight">
              Diseñado meticulosamente para equipos de alto rendimiento.
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
          >
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                variants={fadeInUp}
                className="bg-[#eee9dd]/50 border border-neutral-200/50 p-8 rounded-3xl hover:bg-white transition-colors duration-300 group shadow-sm hover:shadow-xl hover:shadow-neutral-200/50"
              >
                <div className="w-14 h-14 bg-[#c9efa3] text-[#4c6618] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold tracking-tight mb-3 text-neutral-900">
                  {feature.title}
                </h3>
                <p className="text-neutral-600 font-medium leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>

        </div>
      </section>

      {/* --- CTA FINAL --- */}
      <section className="py-32 px-6 text-center">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="max-w-5xl mx-auto bg-gradient-to-br from-[#4c6618] to-[#2a380d] rounded-[3rem] p-12 md:p-20 text-[#eee9dd] shadow-2xl shadow-[#4c6618]/30 relative overflow-hidden"
        >
            <div className="relative z-10">
                <h2 className="text-5xl md:text-6xl font-black mb-6 tracking-tighter">¿Listo para escalar tu negocio?</h2>
                <p className="text-[#c9efa3] mb-10 text-xl md:text-2xl font-medium tracking-tight">
                  Únete a cientos de profesionales que ya están digitalizando sus servicios con UnitPro.
                </p>
                <Link 
                    href="/register" 
                    className="inline-flex items-center gap-2 px-10 py-5 bg-[#eee9dd] text-[#4c6618] rounded-full font-bold text-xl hover:bg-white transition-all hover:scale-105 shadow-xl"
                >
                    Comenzar Gratis ahora <ArrowRight size={24} />
                </Link>
            </div>
            {/* Decoración de fondo del CTA */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#8fab5d] opacity-20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#c9efa3] opacity-10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        </motion.div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-white/40 border-t border-neutral-300/50 py-12 text-center text-base text-neutral-500 font-medium">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© 2024 UnitPro. Todos los derechos reservados.</p>
          <div className="flex justify-center gap-8">
              <Link href="#" className="hover:text-[#4c6618] transition-colors">Términos</Link>
              <Link href="#" className="hover:text-[#4c6618] transition-colors">Privacidad</Link>
              <Link href="#" className="hover:text-[#4c6618] transition-colors">Contacto</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Datos de ejemplo para las características
const features = [
  {
    title: "Tu Web Profesional",
    description: "Generamos automáticamente una Landing Page optimizada para celular donde tus clientes pueden ver tus servicios.",
    icon: <Globe className="w-7 h-7" />
  },
  {
    title: "Gestión Unificada (CRM)",
    description: "Nunca más pierdas un contacto. Controla todos los pedidos de presupuesto desde un panel centralizado e intuitivo.",
    icon: <Layers className="w-7 h-7" />
  },
  {
    title: "Velocidad Extrema",
    description: "Infraestructura optimizada para garantizar tiempos de respuesta en milisegundos para ti y tus clientes.",
    icon: <Zap className="w-7 h-7" />
  },
  {
    title: "Seguridad Grado Militar",
    description: "Tus datos protegidos con encriptación de extremo a extremo y copias automáticas diarias.",
    icon: <Shield className="w-7 h-7" />
  }
];