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
  // --- CONFIGURACIÓN SCROLLYTELLING HERO ---

  // Ref para el contenedor alto que trackea el scroll
  const heroRef = useRef(null);

  // 1. Trackear el scroll en la sección Hero
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end end"] // Empieza al inicio del viewport, termina cuando el final del contenedor llega al final del viewport
  });

  // 2. Física de Scroll Suave (Soft Scroll)
  // Aplicamos un spring para dar inercia y suavidad al valor crudo del scroll
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 25,
    restDelta: 0.001
  });

  // Definimos el rango de la animación: del 0% al 50% del scroll de la sección
  const animationRange = [0, 0.5];

  // 3. Morphing de Círculos a Bandas
  // Transformación compartida para el borde
  const borderRadiusTransform = useTransform(smoothProgress, animationRange, ["100%", "0%"]);
  
  // Dimensiones objetivo para cuando se convierten en bandas
  const targetWidth = "120vw"; // Un poco más ancho que la pantalla para asegurar cobertura
  const targetHeight = "35vh"; // Altura de las bandas resultantes

  // Banda 1 (Más oscura, exterior) - Se mueve hacia arriba
  const width1 = useTransform(smoothProgress, animationRange, ["32rem", targetWidth]);
  const height1 = useTransform(smoothProgress, animationRange, ["32rem", targetHeight]);
  const y1 = useTransform(smoothProgress, animationRange, [0, "-35vh"]);
  
  // Banda 2 - Se mueve ligeramente hacia arriba
  const width2 = useTransform(smoothProgress, animationRange, ["24rem", targetWidth]);
  const height2 = useTransform(smoothProgress, animationRange, ["24rem", targetHeight]);
  const y2 = useTransform(smoothProgress, animationRange, [0, "-12vh"]);

  // Banda 3 - Se mueve ligeramente hacia abajo
  const width3 = useTransform(smoothProgress, animationRange, ["16rem", targetWidth]);
  const height3 = useTransform(smoothProgress, animationRange, ["16rem", targetHeight]);
  const y3 = useTransform(smoothProgress, animationRange, [0, "12vh"]);

  // Banda 4 (Más clara, interior) - Se mueve hacia abajo
  const width4 = useTransform(smoothProgress, animationRange, ["8rem", targetWidth]);
  const height4 = useTransform(smoothProgress, animationRange, ["8rem", targetHeight]);
  const y4 = useTransform(smoothProgress, animationRange, [0, "35vh"]);


  // Variantes de animación para el contenido estático (Features, Footer)
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
      
      {/* 5. Textura de Ruido Orgánico (Toque final premium) */}
      <div className="fixed inset-0 z-[100] pointer-events-none opacity-[0.04] mix-blend-overlay"
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      {/* --- NAVBAR (Sin Modificar) --- */}
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

      {/* --- HERO SECTION REFACTORIZADA (Scrollytelling) --- */}
      {/* 1. Estructura Sticky: Contenedor muy alto para scroll */}
      <section ref={heroRef} className="relative h-[300vh]">
        
        {/* Contenedor Sticky que mantiene el contenido en pantalla */}
        <div className="sticky top-0 h-screen overflow-hidden flex flex-col items-center justify-center text-center px-6 md:px-12 lg:px-24">
            
            {/* Elementos de Fondo Animados (Las Bandas) */}
            {/* Usamos posición absoluta y transform: translate(-50%, -50%) para centrarlos perfectamente antes de que empiecen a moverse */}
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                 {/* Banda 1 (Más oscura) */}
                <motion.div 
                    style={{ 
                        width: width1, 
                        height: height1, 
                        borderRadius: borderRadiusTransform, 
                        y: y1,
                        x: "-50%",
                        top: "50%",
                        left: "50%"
                    }}
                    className="absolute bg-[#4c6618] shadow-2xl"
                />
                 {/* Banda 2 */}
                <motion.div 
                    style={{ 
                        width: width2, 
                        height: height2, 
                        borderRadius: borderRadiusTransform, 
                        y: y2,
                        x: "-50%",
                        top: "50%",
                        left: "50%"
                    }}
                    className="absolute bg-[#649237] shadow-xl"
                />
                 {/* Banda 3 */}
                <motion.div 
                    style={{ 
                        width: width3, 
                        height: height3, 
                        borderRadius: borderRadiusTransform, 
                        y: y3,
                        x: "-50%",
                        top: "50%",
                        left: "50%"
                    }}
                    className="absolute bg-[#8fab5d] shadow-lg"
                />
                 {/* Banda 4 (Más clara) */}
                <motion.div 
                    style={{ 
                        width: width4, 
                        height: height4, 
                        borderRadius: borderRadiusTransform, 
                        y: y4,
                        x: "-50%",
                        top: "50%",
                        left: "50%"
                    }}
                    className="absolute bg-[#c9efa3] shadow-md"
                />
            </div>

          {/* Textos del Hero con Interacción Premium */}
          {/* 4. Z-index altísimo y mix-blend-mode: difference */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="max-w-4xl mx-auto relative z-40 mix-blend-difference text-[#eee9dd]"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-2 border-[#eee9dd]/30 text-sm font-bold uppercase tracking-widest mb-6 backdrop-blur-sm">
              Software Premium para Profesionales
            </div>
            {/* Nota: Se eliminó el bg-clip-text gradient para que el mix-blend-mode funcione correctamente con el color sólido claro */}
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter mb-6 leading-none pb-2">
              UnitPro
            </h1>
            <p className="text-xl md:text-3xl font-medium mb-10 tracking-tight max-w-2xl mx-auto leading-relaxed text-[#eee9dd]/90">
              La plataforma definitiva para escalar tu negocio. Elegancia, eficiencia y control absoluto en un solo lugar.
            </p>
            
            {/* Botones (Necesitan un wrapper sin mix-blend-mode para mantener sus colores originales si se desea, o dejarlos invertirse también) */}
            {/* En este diseño premium, dejar que los botones también interactúen con el fondo se ve bien, pero los envolveré en un div normal para 'resetear' el blend mode si fuera necesario. Aquí los dejo dentro para el efecto completo. */}
             <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
               <Link href="/register" className="w-full sm:w-auto px-8 py-4 bg-[#eee9dd] text-[#4c6618] hover:bg-white transition-colors rounded-full font-bold text-xl tracking-tight flex items-center justify-center gap-2 group shadow-lg shadow-white/10">
                 Comenzar ahora
                 <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
               </Link>
               <Link href="/login" className="w-full sm:w-auto px-8 py-4 bg-transparent border-2 border-[#eee9dd] hover:bg-[#eee9dd]/10 text-[#eee9dd] rounded-full font-bold text-xl tracking-tight transition-all flex items-center justify-center">
                 Agendar Demo
               </Link>
             </div>
            <p className="mt-8 text-sm font-medium opacity-70">Prueba gratuita de 14 días. No requiere tarjeta de crédito.</p>
          </motion.div>
        </div>
      </section>

      {/* --- FEATURES SECTION (Sin Modificar) --- */}
      <section className="py-24 px-6 md:px-12 lg:px-24 bg-white/40 border-y border-neutral-200/50 relative z-20">
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

      {/* --- CTA FINAL (Sin Modificar) --- */}
      <section className="py-32 px-6 text-center relative z-20">
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

      {/* --- FOOTER (Sin Modificar) --- */}
      <footer className="bg-white/40 border-t border-neutral-300/50 py-12 text-center text-base text-neutral-500 font-medium relative z-20">
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