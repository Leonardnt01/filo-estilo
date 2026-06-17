import LoginPageClient from "@/components/login-page-client";
import { getPublicHomeData } from "@/lib/public-home";

export default async function LoginPage() {
  const homeData = await getPublicHomeData();

  return (
    <LoginPageClient
      footerSettings={homeData.site_settings?.public_footer ?? {}}
      footerBranchContact={homeData.branches?.[0] ?? null}
    />
  );
}
