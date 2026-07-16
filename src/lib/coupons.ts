// Reward coupons ("Descuentos del Día") — low-cost perks a client unlocks after
// reaching a number of completed appointments. Shared by the profile popup, the
// coupons API and the booking redemption flow so the catalog stays in one place.

export type PromoDefinition = {
  key: string;
  title: string;
  description: string;
  perk: string;
  /** Heroicons-style line-art SVG path (stroked), on-brand, no emoji. */
  icon: string;
};

/**
 * Completed appointments a client needs before they can claim reward coupons.
 * TEMPORAL (demo): bajado a 2 para poder probar el flujo end-to-end.
 * Para producción, volver a 4.
 */
export const COUPON_ELIGIBILITY_THRESHOLD = 2;

/** How many days a claimed coupon stays valid. */
export const COUPON_VALIDITY_DAYS = 15;

/**
 * The 4 promos. Deliberately low-cost perks (a wash, a drink, brow trim, hot
 * towel) so the business gifts something the client loves without losing money.
 */
export const PROMO_CATALOG: PromoDefinition[] = [
  {
    key: "lavado",
    title: "Lavado de Cabello Premium",
    description: "Lavado con productos premium y masaje capilar relajante, de cortesía.",
    perk: "Gratis",
    icon: "M12 3.5c-2.9 4.1-5.6 6.7-5.6 9.9a5.6 5.6 0 0 0 11.2 0c0-3.2-2.7-5.8-5.6-9.9Z",
  },
  {
    key: "bebida",
    title: "Bebida de Cortesía",
    description: "Café, gaseosa o agua helada mientras te atendemos. Va por la casa.",
    perk: "Gratis",
    icon: "M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Zm11 1.5h2a2 2 0 0 1 0 4h-2M5.5 21h10",
  },
  {
    key: "cejas",
    title: "Perfilado de Cejas",
    description: "Definición y limpieza de cejas de regalo para rematar tu look.",
    perk: "Gratis",
    icon: "M2.5 12s3.6-6 9.5-6 9.5 6 9.5 6-3.6 6-9.5 6-9.5-6-9.5-6Zm9.5 2.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z",
  },
  {
    key: "toalla",
    title: "Ritual de Toalla Caliente",
    description: "Toalla caliente y masaje facial exprés como cierre de tu servicio.",
    perk: "Gratis",
    icon: "M15.36 5.21A8.25 8.25 0 0 1 12 21a8.25 8.25 0 0 1-5.96-13.95A8.29 8.29 0 0 0 9 9.6a8.98 8.98 0 0 1 3.36-6.87 8.21 8.21 0 0 0 3 2.48Z",
  },
];

export function getPromoByKey(key: string): PromoDefinition | null {
  return PROMO_CATALOG.find((p) => p.key === key) ?? null;
}

export type UserCoupon = {
  id: string;
  promo_key: string;
  title: string;
  description: string | null;
  status: "active" | "used" | "expired";
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

export type CouponEligibility = {
  completedCount: number;
  threshold: number;
  eligible: boolean;
  missing: number;
};
