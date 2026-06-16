import MyAppointmentsPageClient from "@/components/my-appointments-page-client";
import { getMyAppointmentsPageData } from "@/lib/account-data";

export default async function MyAppointmentsPage() {
  const data = await getMyAppointmentsPageData();

  return (
    <MyAppointmentsPageClient
      initialItems={data.items}
      initialServices={data.services}
      initialBarbers={data.barbers}
      initialBranches={data.branches}
      initialError={data.error}
    />
  );
}
