import { NextResponse, type NextRequest } from "next/server";

import { logSecurityEvent } from "@/lib/security/audit-log";
import { updateSession } from "@/lib/supabase/middleware";

function unauthorizedApiResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getRequestIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);
  const ip = getRequestIp(request);

  const isAdminPage = request.nextUrl.pathname.startsWith("/admin");
  const isAdminApi = request.nextUrl.pathname.startsWith("/api/admin");

  if (!isAdminPage && !isAdminApi) {
    return response;
  }

  if (!user) {
    if (isAdminApi) {
      logSecurityEvent({
        event: "admin.access.denied_unauthenticated",
        level: "warn",
        route: request.nextUrl.pathname,
        method: request.method,
        ip,
        status: 401,
      });

      return unauthorizedApiResponse("Not authenticated", 401);
    }

    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const { data: staffMembership } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .in("role", ["owner", "admin"])
    .limit(1)
    .maybeSingle();

  const canAccessAdmin = profile?.role === "admin" || !!staffMembership;

  if (error || !canAccessAdmin) {
    if (isAdminApi) {
      logSecurityEvent({
        event: "admin.access.denied_forbidden",
        level: "warn",
        route: request.nextUrl.pathname,
        method: request.method,
        ip,
        userId: user.id,
        status: 403,
      });

      return unauthorizedApiResponse("Forbidden: admin role required", 403);
    }

    const forbiddenUrl = new URL("/", request.url);
    forbiddenUrl.searchParams.set("error", "forbidden");
    return NextResponse.redirect(forbiddenUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
