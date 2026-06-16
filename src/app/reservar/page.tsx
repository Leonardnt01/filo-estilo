import ReservarPageClient from "@/components/reservar-page-client";
import { getPublicCatalogData } from "@/lib/public-catalog";
import { getPublicHomeData } from "@/lib/public-home";

export default async function ReservarPage() {
  const [catalogData, homeData] = await Promise.all([
    getPublicCatalogData(),
    getPublicHomeData(),
  ]);

  return (
    <ReservarPageClient
      initialBranches={catalogData.branches}
      initialServices={catalogData.services}
      initialBarbers={catalogData.barbers}
      footerSettings={homeData.site_settings.public_footer as Record<string, string>}
      footerBranchContact={homeData.branches[0] ?? null}
    />
  );
}
