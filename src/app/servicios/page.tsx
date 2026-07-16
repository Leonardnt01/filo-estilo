import type { Metadata } from "next";
import type { ComponentProps } from "react";

import ServiciosPageClient from "@/components/servicios-page-client";
import { getPublicHomeData } from "@/lib/public-home";

type ClientProps = ComponentProps<typeof ServiciosPageClient>;

export const metadata: Metadata = {
  title: "Servicios",
  description: "Descubre nuestros servicios de barbería: cortes, afeitado, arreglo de barba y más.",
};

export default async function ServiciosPage() {
  const data = await getPublicHomeData();

  return (
    <ServiciosPageClient
      initialServices={(data.services ?? []) as unknown as ClientProps["initialServices"]}
      initialBranches={(data.branches ?? []) as unknown as ClientProps["initialBranches"]}
      footerSettings={data.site_settings?.public_footer ?? {}}
      footerBranchContact={data.branches?.[0] ?? null}
    />
  );
}
