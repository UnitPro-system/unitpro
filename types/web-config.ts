// types/web-config.ts

export type TemplateTheme = 'modern' | 'minimal' | 'bold';

// --- BLOQUE: HERO (PORTADA) ---
export interface HeroSection {
  mostrar: boolean;
  titulo: string;
  subtitulo: string;
  ctaTexto: string;
  imagenUrl?: string; // URL de la imagen de fondo (desde Supabase Storage)
  
  layout?: 'split' | 'full';  // Define si es dividido o pantalla completa
  parallax?: boolean;         // Activa el efecto de movimiento
  overlayOpacity?: number;    // Opacidad del fondo oscuro (0-100)
}


export interface ServiceItem {
  titulo: string;
  desc: string;
  precio?: string;       
  duracion: number;      // En minutos,
  imagenUrl?: string;    
}

export interface ServicesSection {
  mostrar: boolean;
  titulo: string;
  items: ServiceItem[]; 
}


export interface ProjectItem {
  titulo: string;
  descripcion: string;
  imagenUrl: string; // Fundamental en un portfolio
  tags?: string[];   // Ej: ["React", "Diseño", "SEO"]
  linkVerMas?: string; // Link al proyecto real o Behance
}

export interface ProjectsSection {
  mostrar: boolean;
  titulo: string;
  subtitulo?: string;
  items: ProjectItem[];
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

export interface AboutSection {
  id: string;
  type: 'about';
  titulo: string;
  texto: string;
  imagenUrl?: string;
}

// 2. Sección "Galería / Nuestros Trabajos"
export interface GalleryItem {
  url: string;
  descripcion?: string;
}

export interface GallerySection {
  id: string;
  type: 'gallery';
  titulo: string;
  imagenes: GalleryItem[];
}

export interface WorkerItem {
  id: string;          // Identificador único (importante para la selección)
  nombre: string;
  cargo: string;
  imagenUrl?: string;
  paymentLink?: string; // ID del calendario de Google específico (opcional)
}

export interface TeamSection {
  mostrar: boolean;
  titulo: string;
  subtitulo?: string;
  items: WorkerItem[];
  availabilityMode?: 'global' | 'per_worker';
}
// Union Type para las secciones personalizadas
export type CustomSection = AboutSection | GallerySection;
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
export interface LocationSection {
  mostrar: boolean;
}
export interface BookingConfig {
  requestDeposit: boolean;     // ¿Pide seña?
  depositPercentage?: number;  // Porcentaje (ej: 50)
}
export interface EmailTemplate {
  enabled: boolean;
  subject: string;
  body: string; // Soporta HTML básico o texto plano
  bannerUrl?: string; // Imagen de cabecera
}

export interface NotificationConfig {
  confirmation: EmailTemplate;
  reminder: EmailTemplate;
  deposit?: EmailTemplate; // Para señas
}
// ------------------------------------
// LA CONFIGURACIÓN MAESTRA (WEB CONFIG)
// ------------------------------------
export interface WebConfig {
  template: TemplateTheme;
  logoUrl?: string; // URL del logo del negocio (desde Supabase Storage)
  
 
  appearance?: {
    font: string;
    radius: string;
  };

  colors: {
    primary: string;
    secondary?: string;
    text?: string;
    background?: string;
    accent?: string;
  };

  // Secciones de la Landing Page
  hero: HeroSection;
  proyectos?: ProjectsSection;
  servicios?: ServicesSection;
  equipo?: TeamSection;
  ubicacion?: LocationSection;
  testimonios?: TestimonialsSection; // Opcional
  footer?: FooterSection;            // Opcional
  customSections?: CustomSection[];
  sectionOrder?: string[];
  schedule?: WeeklySchedule;
  booking?: BookingConfig;
  notifications?: NotificationConfig;
}

export interface TimeRange {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

export type DailySchedule = {
  isOpen: boolean;
  // Reemplazamos 'start' y 'end' simples por un array de rangos
  ranges: TimeRange[]; 
};

export type WeeklySchedule = {
  [key: string]: DailySchedule; 
};