import type { ComponentProps } from "react";

import SedeDetallePageClient from "@/components/sede-detalle-page-client";
import { getPublicCatalogData } from "@/lib/public-catalog";

type ClientProps = ComponentProps<typeof SedeDetallePageClient>;

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

  const byBranch = await getPublicCatalogData(branch.id as string);

  return (
    <SedeDetallePageClient
      branch={branch as unknown as ClientProps["branch"]}
      initialServices={(byBranch.services ?? []) as unknown as ClientProps["initialServices"]}
      initialBarbers={(byBranch.barbers ?? []) as unknown as ClientProps["initialBarbers"]}
      footerBranchContact={branch}
    />
  );
}
