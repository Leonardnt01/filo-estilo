import type { Metadata } from "next";
import type { ComponentProps } from "react";

import SedesPageClient from "@/components/sedes-page-client";
import { getPublicCatalogData } from "@/lib/public-catalog";

type ClientProps = ComponentProps<typeof SedesPageClient>;

export const metadata: Metadata = {
  title: "Nuestras Sedes",
  description: "Conoce nuestras sedes, ubicaciones y canales de contacto para reservar tu cita.",
};

export default async function SedesPage() {
  const data = await getPublicCatalogData();

  return (
    <SedesPageClient
      initialBranches={(data.branches ?? []) as unknown as ClientProps["initialBranches"]}
      footerBranchContact={data.branches?.[0] ?? null}
    />
  );
}
