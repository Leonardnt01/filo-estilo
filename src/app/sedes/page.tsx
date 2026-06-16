import SedesPageClient from "@/components/sedes-page-client";
import { getPublicCatalogData } from "@/lib/public-catalog";

export default async function SedesPage() {
  const data = await getPublicCatalogData();

  return <SedesPageClient initialBranches={data.branches ?? []} />;
}
