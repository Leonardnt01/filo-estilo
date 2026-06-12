import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import {
  canManageBranch,
  getManageableBranchIds,
  isGlobalAdmin,
  type BranchMembership,
} from "../../../src/lib/auth/session";

describe("session auth helpers", () => {
  it("detecta si el rol es admin global", () => {
    expect(isGlobalAdmin("admin")).toBe(true);
    expect(isGlobalAdmin("client")).toBe(false);
    expect(isGlobalAdmin(null)).toBe(false);
  });

  it("devuelve null para las sedes gestionables si es admin global", () => {
    const memberships: BranchMembership[] = [
      { branch_id: "branch-1", role: "admin" },
      { branch_id: "branch-2", role: "owner" },
    ];

    expect(getManageableBranchIds("admin", memberships)).toBeNull();
  });

  it("devuelve solo sedes owner/admin sin duplicados", () => {
    const memberships: BranchMembership[] = [
      { branch_id: "branch-1", role: "admin" },
      { branch_id: "branch-1", role: "owner" },
      { branch_id: "branch-2", role: "barber" },
      { branch_id: "branch-3", role: "owner" },
    ];

    expect(getManageableBranchIds("client", memberships)).toEqual([
      "branch-1",
      "branch-3",
    ]);
  });

  it("permite gestionar una sede si tiene membresia admin u owner", () => {
    const memberships: BranchMembership[] = [
      { branch_id: "branch-1", role: "barber" },
      { branch_id: "branch-2", role: "admin" },
    ];

    expect(canManageBranch("client", memberships, "branch-2")).toBe(true);
    expect(canManageBranch("client", memberships, "branch-1")).toBe(false);
  });

  it("devuelve arreglo vacio cuando el usuario no administra ninguna sede", () => {
    const memberships: BranchMembership[] = [
      { branch_id: "branch-1", role: "barber" },
      { branch_id: "branch-2", role: "barber" },
    ];

    expect(getManageableBranchIds("client", memberships)).toEqual([]);
  });

  it("permite cualquier sede si el usuario es admin global", () => {
    expect(canManageBranch("admin", [], "branch-x")).toBe(true);
  });

  it("rechaza branchId vacio o indefinido", () => {
    const memberships: BranchMembership[] = [
      { branch_id: "branch-1", role: "owner" },
    ];

    expect(canManageBranch("client", memberships, null)).toBe(false);
    expect(canManageBranch("client", memberships, undefined)).toBe(false);
  });
});