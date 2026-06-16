import HomePageClient from "@/components/home-page-client";
import { getPublicHomeData } from "@/lib/public-home";

export default async function Home() {
  const initialData = await getPublicHomeData();

  return <HomePageClient initialData={initialData} />;
}

