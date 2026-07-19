import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { tr } from "../../locales/tr/messages";
import type { WorkspaceContext } from "../workspace/workspaceContextService";
import { ProjectCycleManagementPanel } from "./ProjectCycleManagementPanel";
import type {
  ManagedProject,
  ProjectCycleDraft,
  ProjectCycleService
} from "./projectCycleService";

describe("ProjectCycleManagementPanel", () => {
  it("loads projects and creates a project cycle through the service", async () => {
    const user = userEvent.setup();
    const service = createProjectCycleServiceStub();

    render(
      <ProjectCycleManagementPanel
        service={service}
        workspaceContext={createWorkspaceContext()}
      />
    );

    expect(await screen.findByText("Existing Project")).toBeInTheDocument();
    expect(
      screen.getByLabelText(tr.administration.projects.form.organizationId)
    ).toHaveValue("organization-id");

    await user.type(
      screen.getByLabelText(tr.administration.projects.form.projectName),
      "New Project"
    );
    await user.type(
      screen.getByLabelText(tr.administration.projects.form.projectCode),
      "NEW"
    );
    await user.type(
      screen.getByLabelText(tr.administration.projects.form.projectCompletedOn),
      "2026-07-19"
    );
    await user.type(
      screen.getByLabelText(tr.administration.projects.form.evaluationName),
      "New Project Evaluation"
    );
    await user.type(
      screen.getByLabelText(tr.administration.projects.form.opensAt),
      "2026-07-19T09:00"
    );
    await user.type(
      screen.getByLabelText(tr.administration.projects.form.closesAt),
      "2026-07-30T18:00"
    );
    await user.click(
      screen.getByRole("button", {
        name: tr.administration.projects.form.submit
      })
    );

    expect(service.createProjectCycle).toHaveBeenCalledWith(
      expect.objectContaining({
        evaluationName: "New Project Evaluation",
        organizationId: "organization-id",
        projectCode: "NEW",
        projectCompletedOn: "2026-07-19",
        projectName: "New Project"
      })
    );
    expect(
      await screen.findByText(tr.administration.projects.feedback.created)
    ).toBeInTheDocument();
    expect(screen.getByText("New Project")).toBeInTheDocument();
  });
});

function createProjectCycleServiceStub(): ProjectCycleService {
  return {
    createProjectCycle: vi.fn(async (draft: ProjectCycleDraft) =>
      createManagedProject("created-project-id", draft.projectName, draft)
    ),
    listProjectCycles: vi.fn(async () => [
      createManagedProject("existing-project-id", "Existing Project")
    ])
  };
}

function createManagedProject(
  id: string,
  name: string,
  draft: Partial<ProjectCycleDraft> = {}
): ManagedProject {
  return {
    code: draft.projectCode ?? "EXIST",
    completesOn: draft.projectCompletedOn ?? "2026-07-19",
    cycles: [
      {
        anonymityThreshold: 4,
        closesAt: draft.closesAt ?? "2026-07-30T15:00:00.000Z",
        id: `${id}-cycle`,
        name: draft.evaluationName ?? "Existing Evaluation",
        opensAt: draft.opensAt ?? "2026-07-19T06:00:00.000Z",
        projectCompletedOn: draft.projectCompletedOn ?? "2026-07-19",
        status: "OPEN"
      }
    ],
    id,
    name,
    organizationId: draft.organizationId ?? "organization-id",
    projectManagerUserId: draft.projectManagerUserId ?? null,
    startsOn: null,
    status: "ACTIVE"
  };
}

function createWorkspaceContext(): WorkspaceContext {
  return {
    roles: [
      {
        roleCode: "SYSTEM_ADMIN",
        scopeId: "organization-id",
        scopeType: "ORGANIZATION"
      }
    ],
    memberships: [
      {
        isPrimary: true,
        membershipKind: "MEMBER",
        organizationId: "organization-id",
        organizationName: "Yanki Demo Organization",
        unitId: "unit-id",
        unitName: "People Operations",
        unitType: "DEPARTMENT"
      }
    ],
    managers: []
  };
}
