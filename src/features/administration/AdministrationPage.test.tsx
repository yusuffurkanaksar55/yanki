import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { tr } from "../../locales/tr/messages";
import type { ProjectCycleService } from "./projectCycleService";
import type { UserAdministrationService } from "./userAdministrationService";
import type { WorkspaceContext } from "../workspace/workspaceContextService";
import { AdministrationPage } from "./AdministrationPage";

describe("AdministrationPage", () => {
  it("renders focused administration modules for users with an administration role", () => {
    render(
      <AdministrationPage
        projectCycleService={createProjectCycleServiceStub()}
        workspaceContext={createAdminWorkspaceContext()}
      />
    );

    expect(
      screen.getByRole("heading", { name: tr.administration.title })
    ).toBeInTheDocument();
    const projectManagementRegion = screen.getByRole("region", {
      name: tr.administration.projects.sectionLabel
    });

    expect(
      within(projectManagementRegion).getByRole("heading", {
        name: tr.administration.projects.list.title
      })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: tr.administration.projects.form.title
      })
    ).not.toBeInTheDocument();
    expect(screen.getByText("Proje müdürü / Proje")).toBeInTheDocument();
  });

  it("switches between administration modules without stacking every panel", async () => {
    const user = userEvent.setup();

    render(
      <AdministrationPage
        projectCycleService={createProjectCycleServiceStub()}
        userAdministrationService={createUserAdministrationServiceStub()}
        workspaceContext={createSystemAdminWorkspaceContext()}
      />
    );

    expect(
      screen.getByRole("tab", { name: tr.administration.modules.security })
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("tab", { name: tr.administration.modules.users })
    );

    expect(
      screen.getByRole("region", { name: tr.administration.users.sectionLabel })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", {
        name: tr.administration.projects.sectionLabel
      })
    ).not.toBeInTheDocument();
  });

  it("keeps platform-wide security operations hidden from organization admins", () => {
    render(
      <AdministrationPage
        projectCycleService={createProjectCycleServiceStub()}
        workspaceContext={createOrganizationAdminWorkspaceContext()}
      />
    );

    expect(
      screen.getByRole("tab", { name: tr.administration.modules.users })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: tr.administration.modules.security })
    ).not.toBeInTheDocument();
  });

  it("blocks users without an administration role", () => {
    render(
      <AdministrationPage workspaceContext={createEmployeeWorkspaceContext()} />
    );

    expect(
      screen.getByRole("heading", { name: tr.administration.blocked.title })
    ).toBeInTheDocument();
  });
});

function createAdminWorkspaceContext(): WorkspaceContext {
  return {
    roles: [
      {
        roleCode: "PROJECT_MANAGER",
        scopeType: "PROJECT",
        scopeId: "project-id"
      }
    ],
    memberships: [],
    managers: []
  };
}

function createEmployeeWorkspaceContext(): WorkspaceContext {
  return {
    roles: [
      {
        roleCode: "EMPLOYEE",
        scopeType: "TEAM",
        scopeId: "team-id"
      }
    ],
    memberships: [],
    managers: []
  };
}

function createSystemAdminWorkspaceContext(): WorkspaceContext {
  return {
    roles: [
      {
        roleCode: "SYSTEM_ADMIN",
        scopeType: "PLATFORM",
        scopeId: null
      }
    ],
    memberships: [],
    managers: []
  };
}

function createOrganizationAdminWorkspaceContext(): WorkspaceContext {
  return {
    roles: [
      {
        roleCode: "SYSTEM_ADMIN",
        scopeType: "ORGANIZATION",
        scopeId: "organization-id"
      }
    ],
    memberships: [],
    managers: []
  };
}

function createProjectCycleServiceStub(): ProjectCycleService {
  return {
    addProjectMember: vi.fn(),
    createProjectCycle: vi.fn(),
    generateProjectAssignments: vi.fn(),
    listOrganizationMembers: vi.fn(async () => []),
    listProjectCycles: vi.fn(async () => []),
    updateProjectDates: vi.fn()
  };
}

function createUserAdministrationServiceStub(): UserAdministrationService {
  return {
    createInvitation: vi.fn(),
    listUserAdministration: vi.fn(async () => ({
      invitations: [],
      members: [],
      organizations: [],
      units: []
    })),
    revokeInvitation: vi.fn()
  };
}
