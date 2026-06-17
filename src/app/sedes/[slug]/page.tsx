import SedeDetallePageClient from "@/components/sede-detalle-page-client";
import { getPublicCatalogData } from "@/lib/public-catalog";

export default async function SedeDetallePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const catalog = await getPublicCatalogData();
  const branch = (catalog.branches ?? []).find((item) => item.slug === slug) ?? null;

  if (!branch) {
    return (
      <SedeDetallePageClient
        branch={null}
        initialServices={[]}
        initialBarbers={[]}
        footerBranchContact={catalog.branches?.[0] ?? null}
      />
    );
  }

  const byBranch = await getPublicCatalogData(branch.id);

  return (
    <SedeDetallePageClient
      branch={branch}
      initialServices={byBranch.services ?? []}
      initialBarbers={byBranch.barbers ?? []}
      footerBranchContact={branch}
    />
  );
}
