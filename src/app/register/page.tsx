import RegisterPageClient from "@/components/register-page-client";
import { getPublicHomeData } from "@/lib/public-home";

export default async function RegisterPage() {
  const homeData = await getPublicHomeData();

  return (
    <RegisterPageClient
      footerSettings={homeData.site_settings?.public_footer ?? {}}
      footerBranchContact={homeData.branches?.[0] ?? null}
    />
  );
}
