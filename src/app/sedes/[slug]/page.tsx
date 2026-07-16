import { notFound } from "next/navigation";

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

  // A slug that matches no branch is a real 404: return the branded not-found page
  // with the correct HTTP status instead of a 200 fallback view.
  if (!branch) {
    notFound();
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
