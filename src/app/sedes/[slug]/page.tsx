import type { Metadata } from "next";
import type { ComponentProps } from "react";
import { notFound } from "next/navigation";

import SedeDetallePageClient from "@/components/sede-detalle-page-client";
import { getPublicCatalogData } from "@/lib/public-catalog";

type ClientProps = ComponentProps<typeof SedeDetallePageClient>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const catalog = await getPublicCatalogData();
  const branch = (catalog.branches ?? []).find((item) => item.slug === slug) ?? null;

  if (!branch) {
    return { title: "Sede no encontrada" };
  }

  return {
    title: branch.name,
    description: `Servicios, barberos y contacto de la sede ${branch.name} de Filo Estilo.`,
  };
}

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
