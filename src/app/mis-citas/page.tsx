import type { Metadata } from "next";
import MyAppointmentsPageClient from "@/components/my-appointments-page-client";
import { getMyAppointmentsPageData } from "@/lib/account-data";

export const metadata: Metadata = {
  title: "Mis Citas",
  description: "Consulta, gestiona y revisa el estado de tus citas reservadas en Filo Estilo.",
};

export default async function MyAppointmentsPage() {
  const data = await getMyAppointmentsPageData();

  return (
    <MyAppointmentsPageClient
      initialItems={data.items}
      initialServices={data.services}
      initialBarbers={data.barbers}
      initialBranches={data.branches}
      initialWaitlistEntries={data.waitlistEntries ?? []}
      footerBranchContact={data.footerBranchContact}
      initialError={data.error}
    />
  );
}
