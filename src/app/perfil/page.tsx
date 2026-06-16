import PerfilPageClient from "@/components/perfil-page-client";
import { getProfilePageData } from "@/lib/account-data";

export default async function PerfilPage() {
  const data = await getProfilePageData();

  return (
    <PerfilPageClient
      initialProfile={data.profile}
      initialStats={data.stats}
      initialPromotions={data.promotions}
      initialError={data.error}
    />
  );
}

