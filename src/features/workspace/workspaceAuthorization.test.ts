import { describe, expect, it } from "vitest";
import { canAccessEvaluationReports } from "./workspaceAuthorization";
import type { WorkspaceContext } from "./workspaceContextService";

describe("canAccessEvaluationReports", () => {
  it("allows only reviewer roles", () => {
    expect(canAccessEvaluationReports(createContext("TEAM_LEADER"))).toBe(true);
    expect(canAccessEvaluationReports(createContext("C_LEVEL_REVIEWER"))).toBe(true);
    expect(canAccessEvaluationReports(createContext("BOARD_REVIEWER"))).toBe(true);
    expect(canAccessEvaluationReports(createContext("EMPLOYEE"))).toBe(false);
    expect(canAccessEvaluationReports(createContext("PROJECT_MANAGER"))).toBe(false);
  });

  it("denies a reviewer account that also has an active system admin role", () => {
    const context = createContext("C_LEVEL_REVIEWER");

    expect(
      canAccessEvaluationReports({
        ...context,
        roles: [
          ...context.roles,
          { roleCode: "SYSTEM_ADMIN", scopeId: "org-id", scopeType: "ORGANIZATION" }
        ]
      })
    ).toBe(false);
  });
});

function createContext(roleCode: string): WorkspaceContext {
  return {
    managers: [],
    memberships: [],
    roles: [{ roleCode, scopeId: "org-id", scopeType: "ORGANIZATION" }]
  };
}
