import type { Metadata } from "next";
import type { ComponentProps } from "react";

import PerfilPageClient from "@/components/perfil-page-client";
import { getProfilePageData } from "@/lib/account-data";

type ClientProps = ComponentProps<typeof PerfilPageClient>;

export const metadata: Metadata = {
  title: "Mi Perfil",
  description: "Gestiona los datos de tu cuenta y revisa tus beneficios en Filo Estilo.",
};

export default async function PerfilPage() {
  const data = await getProfilePageData();

  return (
    <PerfilPageClient
      initialProfile={data.profile}
      initialStats={data.stats}
      initialPromotions={data.promotions as unknown as ClientProps["initialPromotions"]}
      footerSettings={data.footerSettings}
      footerBranchContact={data.footerBranchContact}
      initialError={data.error}
    />
  );
}
