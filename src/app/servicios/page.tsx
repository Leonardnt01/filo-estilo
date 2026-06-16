import ServiciosPageClient from "@/components/servicios-page-client";
import { getPublicHomeData } from "@/lib/public-home";

export default async function ServiciosPage() {
  const data = await getPublicHomeData();

  return (
    <ServiciosPageClient
      initialServices={data.services ?? []}
      initialBranches={data.branches ?? []}
      footerSettings={data.site_settings?.public_footer ?? {}}
    />
  );
}

