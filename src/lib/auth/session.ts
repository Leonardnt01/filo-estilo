import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export type ProfileRole = "admin" | "client";
export type BranchRole = "owner" | "admin" | "barber";

export type BranchMembership = {
  branch_id: string;
  role: BranchRole;
};

const STAFF_ROLES: BranchRole[] = ["owner", "admin", "barber"];

export function isGlobalAdmin(role: ProfileRole | null) {
  return role === "admin";
}

export function getManageableBranchIds(
  role: ProfileRole | null,
  memberships: BranchMembership[],
) {
  if (isGlobalAdmin(role)) {
    return null;
  }

  return [...new Set(
    memberships
      .filter((m) => m.role === "owner" || m.role === "admin")
      .map((m) => m.branch_id),
  )];
}

export function canManageBranch(
  role: ProfileRole | null,
  memberships: BranchMembership[],
  branchId: string | null | undefined,
) {
  if (!branchId) return false;
  if (isGlobalAdmin(role)) return true;

  return memberships.some(
    (m) =>
      m.branch_id === branchId &&
      (m.role === "owner" || m.role === "admin"),
  );
}

export async function getBranchMemberships(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("branch_id, role, is_active")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error || !data) return [] as BranchMembership[];

  return data
    .filter((m) => STAFF_ROLES.includes(m.role as BranchRole))
    .map((m) => ({
      branch_id: m.branch_id as string,
      role: m.role as BranchRole,
    }));
}

export async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null as User | null,
      role: null as ProfileRole | null,
      memberships: [] as BranchMembership[],
      is_staff: false,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role =
    profile?.role === "admin" || profile?.role === "client"
      ? (profile.role as ProfileRole)
      : null;

  const memberships = await getBranchMemberships(user.id);
  const isStaff = memberships.length > 0 || role === "admin";

  return { user, role, memberships, is_staff: isStaff };
}
