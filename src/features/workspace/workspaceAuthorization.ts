import type { WorkspaceContext, WorkspaceRole } from "./workspaceContextService";

const administrationRoleCodes = [
  "SYSTEM_ADMIN",
  "PROJECT_MANAGER",
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
