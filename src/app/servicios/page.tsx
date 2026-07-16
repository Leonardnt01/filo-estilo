import type { ComponentProps } from "react";

import ServiciosPageClient from "@/components/servicios-page-client";
import { getPublicHomeData } from "@/lib/public-home";

type ClientProps = ComponentProps<typeof ServiciosPageClient>;

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
