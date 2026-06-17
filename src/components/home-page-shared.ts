export type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
};

export type Branch = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  maps_url: string | null;
  is_featured?: boolean;
};

export type FeaturedService = {
  id: string;
  branch_id: string | null;
  service_id: string | null;
  title: string;
  image_url: string | null;
  sort_order: number;
};

export type Testimonial = {
  id: string;
  branch_id: string | null;
  name: string;
  title: string | null;
  result: string | null;
  quote: string;
  image_url: string | null;
  sort_order: number;
};

export type HomeStory = {
  name: string;
  result: string;
  quote: string;
  image: string;
};

export type HomeValueCard = {
  title: string;
  desc: string;
};

export type HomeExperiencePoint = {
  title: string;
  text: string;
};

export type PublicHomeSettings = {
  hero_badge?: string;
  hero_title_line_1?: string;
  hero_title_highlight?: string;
  hero_title_line_2?: string;
  hero_subtitle?: string;
  who_we_are_text?: string;
  contact_title?: string;
  contact_subtitle?: string;
  central_phone_label?: string;
  central_phone_schedule?: string;
  whatsapp_label?: string;
  whatsapp_help_text?: string;
  floating_whatsapp?: string;
  who_image_1?: string;
  who_image_2?: string;
  experience_image?: string;
  service_slide_images?: string[];
  fallback_testimonials?: HomeStory[];
  value_cards?: HomeValueCard[];
  experience_points?: HomeExperiencePoint[];
};

export type FooterSettings = {
  brand_name?: string;
  instagram?: string;
  facebook?: string;
  whatsapp?: string;
  phone?: string;
  address?: string;
};

export type HomePageData = {
  branches?: Branch[];
  services?: Service[];
  featured_services?: FeaturedService[];
  testimonials?: Testimonial[];
  site_settings?: {
    public_footer?: FooterSettings;
    public_home?: PublicHomeSettings;
  };
};

const BLOCKED_IMAGE_HOSTS = ["vecteezy.com"];

export function isSafeImageUrl(url: string | null | undefined) {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return !BLOCKED_IMAGE_HOSTS.some((host) => parsed.hostname.includes(host));
  } catch {
    return false;
  }
}

export const FALLBACK_BRANCH_CONTACTS = [
  {
    id: "principal",
    name: "Sede Principal",
    address: "Direccion por actualizar",
    phone: "+51 000 000 000",
    whatsapp: "+51 000 000 000",
    mapsUrl: "https://maps.google.com",
    waUrl: "https://wa.me/51999999999",
  },
] as const;

export const DEFAULT_HOME_SETTINGS: Required<PublicHomeSettings> = {
  hero_badge: "Barberia Premium",
  hero_title_line_1: "Donde el estilo",
  hero_title_highlight: "define",
  hero_title_line_2: "tu personalidad",
  hero_subtitle: "Cortes profesionales, atencion personalizada y experiencia de nivel en cada sede.",
  who_we_are_text:
    "En Filo Estilo fusionamos la maestria tecnica con una vision moderna de la imagen. Nuestro compromiso es ofrecerte una experiencia premium donde la precision artesanal y la asesoria personalizada se unen para potenciar tu identidad unica.",
  contact_title: "Agenda, consulta o escribenos",
  contact_subtitle: "Te ayudamos a elegir sede, servicio y horario ideal. Respuesta rapida por WhatsApp o llamada.",
  central_phone_label: "Central telefonica",
  central_phone_schedule: "Atencion Lun - Sab 9:00 a.m. - 8:00 p.m.",
  whatsapp_label: "WhatsApp",
  whatsapp_help_text: "Reservas y consultas inmediatas",
  floating_whatsapp: "+51 999 999 999",
  who_image_1: "/hero-bg.png",
  who_image_2: "/hero-bg.png",
  experience_image: "/hero-bg.png",
  service_slide_images: ["/hero-bg.png"],
  fallback_testimonials: [
    {
      name: "Cliente",
      result: "Resultado premium",
      quote: "Excelente experiencia, muy recomendado.",
      image: "/hero-bg.png",
    },
  ],
  value_cards: [
    { title: "Humanidad", desc: "Atencion cercana para que te sientas comodo desde que llegas." },
    { title: "Diferenciacion", desc: "Tecnicas actuales y propuesta de estilo personalizada." },
    { title: "Transparencia", desc: "Precios claros y recomendaciones honestas." },
    { title: "Empatia", desc: "Escuchamos lo que buscas y lo llevamos a un look real." },
  ],
  experience_points: [
    { title: "Asesoria de Visagismo", text: "Disenamos tu look basandonos en tu estructura facial y estilo personal." },
    { title: "Maestria Tecnica", text: "Especialistas capacitados en las tendencias mas vanguardistas del mundo." },
    { title: "Productos Premium", text: "Utilizamos marcas lideres para garantizar un acabado de nivel superior." },
    { title: "Gestion de Tiempo", text: "Sistema de reserva online agil y atencion personalizada por WhatsApp." },
  ],
};
