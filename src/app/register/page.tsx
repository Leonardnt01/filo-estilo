import type { Metadata } from "next";
import RegisterPageClient from "@/components/register-page-client";
import { getPublicHomeData } from "@/lib/public-home";

export const metadata: Metadata = {
  title: "Crear Cuenta",
  description: "Crea tu cuenta en Filo Estilo y reserva tus citas de forma rápida y sencilla.",
};

export default async function RegisterPage() {
  const homeData = await getPublicHomeData();

  return (
    <RegisterPageClient
      footerSettings={homeData.site_settings?.public_footer ?? {}}
      footerBranchContact={homeData.branches?.[0] ?? null}
    />
  );
}
