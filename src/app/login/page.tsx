import type { Metadata } from "next";
import LoginPageClient from "@/components/login-page-client";
import { getPublicHomeData } from "@/lib/public-home";

export const metadata: Metadata = {
  title: "Iniciar Sesión",
  description: "Ingresa a tu cuenta de Filo Estilo para gestionar tus reservas.",
};

export default async function LoginPage() {
  const homeData = await getPublicHomeData();

  return (
    <LoginPageClient
      footerSettings={homeData.site_settings?.public_footer ?? {}}
      footerBranchContact={homeData.branches?.[0] ?? null}
    />
  );
}
