import { NextResponse } from "next/server";
import { getPublicCatalogData } from "@/lib/public-catalog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branch_id");
  try {
    const data = await getPublicCatalogData(branchId ?? undefined);
    return NextResponse.json(
      data,
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load catalog" },
      { status: 500 },
    );
  }
}
