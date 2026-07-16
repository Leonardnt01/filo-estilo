import type { Metadata } from "next";
import type { ComponentProps } from "react";

import ReservarPageClient from "@/components/reservar-page-client";
import { getPublicCatalogData } from "@/lib/public-catalog";
import { getPublicHomeData } from "@/lib/public-home";

type ClientProps = ComponentProps<typeof ReservarPageClient>;

export const metadata: Metadata = {
  title: "Reservar Cita",
  description: "Reserva tu cita en línea: elige sede, servicio, barbero y horario en pocos pasos.",
};

export default async function ReservarPage() {
  const [catalogData, homeData] = await Promise.all([
    getPublicCatalogData(),
    getPublicHomeData(),
  ]);

  return (
    <ReservarPageClient
      initialBranches={catalogData.branches as unknown as ClientProps["initialBranches"]}
      initialServices={catalogData.services as unknown as ClientProps["initialServices"]}
      initialBarbers={catalogData.barbers as unknown as ClientProps["initialBarbers"]}
      footerSettings={homeData.site_settings.public_footer as Record<string, string>}
      footerBranchContact={homeData.branches[0] ?? null}
    />
  );
}
