const SERVICE_FALLBACK_IMAGE = "/hero-bg.png";
const BARBER_FALLBACK_IMAGE = "/hero-bg.png";

export function getServiceFallbackImageByName(serviceName: string) {
  const key = serviceName.toLowerCase();
  if (key.includes("barba")) return "https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?q=80&w=900&auto=format&fit=crop";
  if (key.includes("corte")) return "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=900&auto=format&fit=crop";
  if (key.includes("premium")) return "https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=900&auto=format&fit=crop";
  if (key.includes("afeitado")) return "https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?q=80&w=900&auto=format&fit=crop";
  return "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=900&auto=format&fit=crop";
}

export function getBarberFallbackImageByName(fullName: string) {
  const name = fullName.toLowerCase();
  if (name.includes("carlos")) return "https://images.unsplash.com/photo-1618077360395-f3068be8e001?q=80&w=600&auto=format&fit=crop";
  if (name.includes("javier")) return "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop";
  if (name.includes("jefferson")) return "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop";
  if (name.includes("miguel")) return "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=600&auto=format&fit=crop";
  return "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop";
}

export function resolveServiceImage(serviceName: string, imageUrl?: string | null) {
  return imageUrl || getServiceFallbackImageByName(serviceName) || SERVICE_FALLBACK_IMAGE;
}

export function resolveBarberImage(fullName: string, imageUrl?: string | null) {
  return imageUrl || getBarberFallbackImageByName(fullName) || BARBER_FALLBACK_IMAGE;
}

export { BARBER_FALLBACK_IMAGE, SERVICE_FALLBACK_IMAGE };
