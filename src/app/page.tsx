import type { ComponentProps } from "react";

import HomePageInteractive from "@/components/home-page-interactive";
import HomePageStatic from "@/components/home-page-static";
import { getPublicHomeData } from "@/lib/public-home";

type StaticProps = ComponentProps<typeof HomePageStatic>;
type InteractiveProps = ComponentProps<typeof HomePageInteractive>;

export default async function Home() {
  const initialData = await getPublicHomeData();

  return (
    <>
      <HomePageStatic initialData={initialData as unknown as StaticProps["initialData"]} />
      <HomePageInteractive initialData={initialData as unknown as InteractiveProps["initialData"]} />
    </>
  );
}
