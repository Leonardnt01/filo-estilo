import HomePageInteractive from "@/components/home-page-interactive";
import HomePageStatic from "@/components/home-page-static";
import { getPublicHomeData } from "@/lib/public-home";

export default async function Home() {
  const initialData = await getPublicHomeData();

  return (
    <>
      <HomePageStatic initialData={initialData} />
      <HomePageInteractive initialData={initialData} />
    </>
  );
}

