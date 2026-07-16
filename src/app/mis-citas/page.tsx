import type { Metadata } from "next";
import type { ComponentProps } from "react";

import MyAppointmentsPageClient from "@/components/my-appointments-page-client";
import { getMyAppointmentsPageData } from "@/lib/account-data";

type ClientProps = ComponentProps<typeof MyAppointmentsPageClient>;

export const metadata: Metadata = {
  title: "Mis Citas",
  description: "Consulta, gestiona y revisa el estado de tus citas reservadas en Filo Estilo.",
};

export default async function MyAppointmentsPage() {
  const data = await getMyAppointmentsPageData();

  return (
    <MyAppointmentsPageClient
      initialItems={data.items}
      initialServices={data.services as unknown as ClientProps["initialServices"]}
      initialBarbers={data.barbers as unknown as ClientProps["initialBarbers"]}
      initialBranches={data.branches as unknown as ClientProps["initialBranches"]}
      initialWaitlistEntries={data.waitlistEntries ?? []}
      footerBranchContact={data.footerBranchContact}
      initialError={data.error}
    />
  );
}
