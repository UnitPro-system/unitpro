// types/web-config.ts

export type TemplateTheme = 'modern' | 'minimal' | 'bold';

// --- BLOQUE: HERO (PORTADA) ---
export interface HeroSection {
  mostrar: boolean;
  titulo: string;
  subtitulo: string;
  ctaTexto: string;
  imagenUrl?: string; // URL de la imagen de fondo (desde Supabase Storage)
}

// --- BLOQUE: BENEFICIOS (FEATURES) ---
export interface FeatureItem {
  titulo: string;
  desc: string;
  icono?: string; // Nombre del icono de lucide-react (opcional)
}

export interface FeaturesSection {
  mostrar: boolean;
  titulo: string;
  items: FeatureItem[];
}

// --- BLOQUE: TESTIMONIOS ---
export interface TestimonialItem {
  nombre: string;
  cargo?: string;
  comentario: string;
  avatarUrl?: string; // URL de la foto del cliente (opcional)
}

export interface TestimonialsSection {
  mostrar: boolean;
  titulo: string;
  items: TestimonialItem[];
}

// --- BLOQUE: FOOTER (PIE DE PÁGINA) ---
export interface FooterSection {
  mostrar: boolean;
  textoCopyright: string;
  redesSociales?: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    whatsapp?: string;
  };
}

// ------------------------------------
// LA CONFIGURACIÓN MAESTRA (WEB CONFIG)
// ------------------------------------
export interface WebConfig {
  template: TemplateTheme;
  logoUrl?: string; // URL del logo del negocio (desde Supabase Storage)
  
  colors: {
    primary: string;
    secondary?: string;
    background?: string;
  };

  // Secciones de la Landing Page
  hero: HeroSection;
  beneficios: FeaturesSection;
  testimonios?: TestimonialsSection; // Opcional (puede no existir en configuraciones viejas)
  footer?: FooterSection;            // Opcional
}