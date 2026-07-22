import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { tr } from "../../locales/tr/messages";
import type { ProjectCycleService } from "./projectCycleService";
import type { WorkspaceContext } from "../workspace/workspaceContextService";
import { AdministrationPage } from "./AdministrationPage";

describe("AdministrationPage", () => {
  it("renders administration workflows for users with an administration role", () => {
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
    expect(
      screen.getByText(tr.administration.datePolicy.evaluationCloseLabel)
    ).toBeInTheDocument();
    expect(screen.getByText("Proje müdürü / Proje")).toBeInTheDocument();
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
