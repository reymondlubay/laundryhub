import { describe, expect, it, vi } from "vitest";
import { USER_ROLE_ADMIN, USER_ROLE_EMPLOYEE } from "../constants/roles";

vi.mock("../services/authService", () => ({
  default: {
    getCurrentUser: vi.fn(),
  },
}));

import authService from "../services/authService";
import { canAccessRoute, isAdmin, isEmployee } from "./roleAccess";

describe("roleAccess", () => {
  it("isAdmin returns true for Admin role", () => {
    vi.mocked(authService.getCurrentUser).mockReturnValue({
      id: "1",
      role: USER_ROLE_ADMIN,
    } as never);
    expect(isAdmin()).toBe(true);
    expect(isEmployee()).toBe(false);
  });

  it("isEmployee returns true for Employee role", () => {
    vi.mocked(authService.getCurrentUser).mockReturnValue({
      id: "2",
      role: USER_ROLE_EMPLOYEE,
    } as never);
    expect(isEmployee()).toBe(true);
    expect(isAdmin()).toBe(false);
  });

  it("admin can access reports and settings", () => {
    vi.mocked(authService.getCurrentUser).mockReturnValue({
      id: "1",
      role: USER_ROLE_ADMIN,
    } as never);
    expect(canAccessRoute("/reports/sales")).toBe(true);
    expect(canAccessRoute("/settings/activity-log")).toBe(true);
  });

  it("employee is limited to allowed modules", () => {
    vi.mocked(authService.getCurrentUser).mockReturnValue({
      id: "2",
      role: USER_ROLE_EMPLOYEE,
    } as never);
    expect(canAccessRoute("/reports/transaction")).toBe(true);
    expect(canAccessRoute("/reports/sales")).toBe(false);
    expect(canAccessRoute("/settings/database")).toBe(true);
  });
});
