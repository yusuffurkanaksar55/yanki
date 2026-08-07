import type { WorkspaceContext, WorkspaceRole } from "./workspaceContextService";

const administrationRoleCodes = [
  "SYSTEM_ADMIN",
  "PROJECT_MANAGER",
  "C_LEVEL_REVIEWER",
  "BOARD_REVIEWER"
] as const;

const evaluationReportingRoleCodes = [
  "TEAM_LEADER",
  "C_LEVEL_REVIEWER",
  "BOARD_REVIEWER"
] as const;

export function canAccessAdministration(
  workspaceContext: WorkspaceContext | null | undefined
): boolean {
  return getAdministrationRoles(workspaceContext).length > 0;
}

export function getAdministrationRoles(
  workspaceContext: WorkspaceContext | null | undefined
): readonly WorkspaceRole[] {
  return (workspaceContext?.roles ?? []).filter((role) =>
    isAdministrationRole(role.roleCode)
  );
}

export function isAdministrationRole(roleCode: string): boolean {
  return administrationRoleCodes.some((code) => code === roleCode);
}

export function canAccessEvaluationReports(
  workspaceContext: WorkspaceContext | null | undefined
): boolean {
  const roles = workspaceContext?.roles ?? [];

  if (roles.some((role) => role.roleCode === "SYSTEM_ADMIN")) {
    return false;
  }

  return roles.some((role) =>
    evaluationReportingRoleCodes.some((code) => code === role.roleCode)
  );
}
