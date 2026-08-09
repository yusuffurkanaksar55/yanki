import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { tr } from "../../locales/tr/messages";
import type { WorkspaceContext } from "../workspace/workspaceContextService";
import { ProjectCycleManagementPanel } from "./ProjectCycleManagementPanel";
import type { EvaluationTemplateService } from "./evaluationTemplateService";
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
        evaluationTemplateService={createEvaluationTemplateServiceStub()}
        service={service}
        workspaceContext={createWorkspaceContext()}
      />
    );

    expect(await screen.findByText("Existing Project")).toBeInTheDocument();
    expect(
      screen.getByLabelText(tr.administration.projects.form.organizationId)
    ).toHaveValue("organization-id");
    const creationForm = screen
      .getByText(tr.administration.projects.form.title)
      .closest("form");

    expect(creationForm).not.toBeNull();
    const creationFormRegion = within(creationForm as HTMLFormElement);

    await user.type(
      creationFormRegion.getByLabelText(
        tr.administration.projects.form.projectName
      ),
      "New Project"
    );
    await user.type(
      creationFormRegion.getByLabelText(
        tr.administration.projects.form.projectCode
      ),
      "NEW"
    );
    await user.type(
      creationFormRegion.getByLabelText(
        tr.administration.projects.form.projectCompletedOn
      ),
      "2026-07-19"
    );
    await user.type(
      creationFormRegion.getByLabelText(
        tr.administration.projects.form.evaluationName
      ),
      "New Project Evaluation"
    );
    await user.selectOptions(
      creationFormRegion.getByLabelText(
        tr.administration.projects.form.templateVersion
      ),
      "published-template-version-id"
    );
    await user.selectOptions(
      creationFormRegion.getByLabelText(
        tr.administration.projects.form.projectManagerUserId
      ),
      "manager-user-id"
    );
    await user.type(
      creationFormRegion.getByLabelText(tr.administration.projects.form.opensAt),
      "2026-07-19T09:00"
    );
    await user.type(
      creationFormRegion.getByLabelText(tr.administration.projects.form.closesAt),
      "2026-07-30T18:00"
    );
    await user.click(
      creationFormRegion.getByRole("button", {
        name: tr.administration.projects.form.submit
      })
    );

    expect(service.createProjectCycle).toHaveBeenCalledWith(
      expect.objectContaining({
        evaluationName: "New Project Evaluation",
        organizationId: "organization-id",
        projectCode: "NEW",
        projectCompletedOn: "2026-07-19",
        projectManagerUserId: "manager-user-id",
        projectName: "New Project",
        templateVersionId: "published-template-version-id"
      })
    );
    expect(
      await screen.findByText(tr.administration.projects.feedback.created)
    ).toBeInTheDocument();
    expect(screen.getByText("New Project")).toBeInTheDocument();
  }, 10_000);

  it("adds project members through the service", async () => {
    const user = userEvent.setup();
    const service = createProjectCycleServiceStub();

    render(
      <ProjectCycleManagementPanel
        evaluationTemplateService={createEvaluationTemplateServiceStub()}
        service={service}
        workspaceContext={createWorkspaceContext()}
      />
    );

    await screen.findByText("Existing Project");
    const projectArticle = screen
      .getByText("Existing Project")
      .closest("article");

    expect(projectArticle).not.toBeNull();

    const projectRegion = within(projectArticle as HTMLElement);
    await user.selectOptions(
      projectRegion.getByLabelText(tr.administration.projects.members.user),
      "member-user-id"
    );
    await user.selectOptions(
      projectRegion.getByLabelText(tr.administration.projects.members.kind),
      "OBSERVER"
    );
    await user.click(
      projectRegion.getByRole("button", {
        name: tr.administration.projects.members.add
      })
    );

    expect(service.addProjectMember).toHaveBeenCalledWith({
      membershipKind: "OBSERVER",
      projectId: "existing-project-id",
      userId: "member-user-id"
    });
    expect(
      await screen.findByText(tr.administration.projects.feedback.memberAdded)
    ).toBeInTheDocument();
    const memberList = projectRegion.getByRole("list");

    expect(
      within(memberList).getByText("Demo Member (member@example.com)")
    ).toBeInTheDocument();
  });

  it("generates evaluation assignments through the service", async () => {
    const user = userEvent.setup();
    const service = createProjectCycleServiceStub();

    render(
      <ProjectCycleManagementPanel
        evaluationTemplateService={createEvaluationTemplateServiceStub()}
        service={service}
        workspaceContext={createWorkspaceContext()}
      />
    );

    await screen.findByText("Existing Project");
    await user.click(
      screen.getByRole("button", {
        name: tr.administration.projects.assignments.generate
      })
    );

    expect(service.generateProjectAssignments).toHaveBeenCalledWith(
      "existing-project-id-cycle"
    );
    expect(
      await screen.findByText(
        tr.administration.projects.feedback.assignmentsGenerated
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText("6")).toHaveLength(2);
  });

  it("lets a scoped project manager update only project dates", async () => {
    const user = userEvent.setup();
    const service = createProjectCycleServiceStub();

    render(
      <ProjectCycleManagementPanel
        evaluationTemplateService={createEvaluationTemplateServiceStub()}
        service={service}
        workspaceContext={createProjectManagerWorkspaceContext()}
      />
    );

    await screen.findByText("Existing Project");
    expect(
      screen.queryByText(tr.administration.projects.form.title)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: tr.administration.projects.assignments.generate
      })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: tr.administration.projects.members.add
      })
    ).not.toBeInTheDocument();

    await user.clear(
      screen.getByLabelText(tr.administration.projects.dates.projectCompletedOn)
    );
    await user.type(
      screen.getByLabelText(tr.administration.projects.dates.projectCompletedOn),
      "2026-07-22"
    );
    await user.clear(
      screen.getByLabelText(tr.administration.projects.dates.closesAt)
    );
    await user.type(
      screen.getByLabelText(tr.administration.projects.dates.closesAt),
      "2026-08-05T18:00"
    );
    await user.click(
      screen.getByRole("button", {
        name: tr.administration.projects.dates.save
      })
    );

    expect(service.updateProjectDates).toHaveBeenCalledWith(
      expect.objectContaining({
        evaluationCycleId: "existing-project-id-cycle",
        projectCompletedOn: "2026-07-22",
        projectId: "existing-project-id"
      })
    );
    expect(
      await screen.findByText(tr.administration.projects.feedback.datesUpdated)
    ).toBeInTheDocument();
  });
});

function createProjectCycleServiceStub(): ProjectCycleService {
  return {
    addProjectMember: vi.fn(async (draft) => ({
      ...createManagedProject("existing-project-id", "Existing Project"),
      members: [
        {
          displayName: "Demo Member",
          email: "member@example.com",
          endsAt: null,
          id: "membership-id",
          membershipKind: draft.membershipKind,
          startsAt: "2026-07-20T09:00:00.000Z",
          userId: draft.userId
        }
      ]
    })),
    createProjectCycle: vi.fn(async (draft: ProjectCycleDraft) =>
      createManagedProject("created-project-id", draft.projectName, draft)
    ),
    generateProjectAssignments: vi.fn(async (evaluationCycleId) => ({
      assignmentSummary: {
        cancelled: 0,
        completed: 0,
        pending: 6,
        total: 6
      },
      candidateCount: 6,
      createdCount: 6,
      evaluationCycleId,
      participantCount: 3,
      projectId: "existing-project-id",
      skippedDuplicateCount: 0
    })),
    listOrganizationMembers: vi.fn(async () => [
      {
        displayName: "Demo Manager",
        email: "manager@example.com",
        onboardingStatus: "ACTIVE",
        userId: "manager-user-id"
      },
      {
        displayName: "Demo Member",
        email: "member@example.com",
        onboardingStatus: "ACTIVE",
        userId: "member-user-id"
      }
    ]),
    listProjectCycles: vi.fn(async () => [
      createManagedProject("existing-project-id", "Existing Project")
    ]),
    updateProjectDates: vi.fn(async (draft) => ({
      ...createManagedProject("existing-project-id", "Existing Project"),
      completesOn: draft.projectCompletedOn,
      cycles: [
        {
          ...createManagedProject("existing-project-id", "Existing Project")
            .cycles[0],
          closesAt: draft.closesAt,
          projectCompletedOn: draft.projectCompletedOn
        }
      ]
    }))
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
        anonymityThreshold: 1,
        assignmentSummary: {
          cancelled: 0,
          completed: 0,
          pending: 0,
          total: 0
        },
        closesAt: draft.closesAt ?? "2026-07-30T15:00:00.000Z",
        id: `${id}-cycle`,
        name: draft.evaluationName ?? "Existing Evaluation",
        opensAt: draft.opensAt ?? "2026-07-19T06:00:00.000Z",
        projectCompletedOn: draft.projectCompletedOn ?? "2026-07-19",
        status: "OPEN",
        templateName: "Project Feedback",
        templateVersionId: draft.templateVersionId ?? "published-template-version-id",
        templateVersionNumber: 1
      }
    ],
    id,
    members: [],
    name,
    organizationId: draft.organizationId ?? "organization-id",
    projectManagerUserId: draft.projectManagerUserId ?? null,
    startsOn: null,
    status: "ACTIVE"
  };
}

function createEvaluationTemplateServiceStub(): EvaluationTemplateService {
  return {
    cloneVersion: vi.fn(),
    listTemplates: vi.fn(async () => [
      {
        description: "Project feedback template",
        id: "template-id",
        name: "Project Feedback",
        organizationId: "organization-id",
        status: "ACTIVE" as const,
        versions: [
          {
            description: "Project feedback template",
            id: "published-template-version-id",
            name: "Project Feedback",
            publishedAt: "2026-07-18T09:00:00.000Z",
            questions: [],
            status: "PUBLISHED" as const,
            versionNumber: 1
          }
        ]
      }
    ]),
    publishVersion: vi.fn(),
    saveDraft: vi.fn()
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

function createProjectManagerWorkspaceContext(): WorkspaceContext {
  return {
    managers: [],
    memberships: [],
    roles: [
      {
        roleCode: "PROJECT_MANAGER",
        scopeId: "existing-project-id",
        scopeType: "PROJECT"
      }
    ]
  };
}
