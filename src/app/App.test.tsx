import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { tr } from "../locales/tr/messages";
import type {
  ManagedProject,
  ProjectCycleDraft,
  ProjectCycleService
} from "../features/administration/projectCycleService";
import type { AuthService } from "../features/authentication/authService";
import type { Session } from "@supabase/supabase-js";
import type {
  ProfileService,
  UserProfile
} from "../features/profiles/profileService";
import type {
  WorkspaceContext,
  WorkspaceContextService
} from "../features/workspace/workspaceContextService";

describe("App", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("renders the Turkish dashboard shell after an authenticated session is available", async () => {
    const profileService = createProfileServiceStub(createProfileStub());

    render(
      <App
        authService={createAuthServiceStub(createSessionStub())}
        profileService={profileService}
        workspaceContextService={createWorkspaceContextServiceStub(
          createWorkspaceContextStub()
        )}
      />
    );

    expect(
      await screen.findByRole("heading", { name: tr.dashboard.title })
    ).toBeInTheDocument();
    expect(profileService.getOwnProfile).toHaveBeenCalledWith("user-id");
    expect(
      screen.getByRole("navigation", { name: tr.navigation.primaryAriaLabel })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: tr.dashboard.actions.newCycle })
    ).toBeInTheDocument();
    expect(screen.getByText(tr.dashboard.privacy.threshold)).toBeInTheDocument();
    expect(screen.getByText("person@example.com")).toBeInTheDocument();
    expect(screen.getByText("Person Example")).toBeInTheDocument();
    expect(screen.getByText(tr.dashboard.workspace.title)).toBeInTheDocument();
    expect(screen.getByText(/Product Team/)).toBeInTheDocument();
    expect(screen.getByText("Demo CEO")).toBeInTheDocument();
    const administrationLink = screen.getByRole("link", {
      name: tr.navigation.administration
    });

    expect(administrationLink).toBeInTheDocument();
    expect(administrationLink).toHaveAttribute("href", "#administration");
  });

  it("renders the protected administration shell for an administration route", async () => {
    window.history.replaceState(null, "", "/#administration");

    render(
      <App
        authService={createAuthServiceStub(createSessionStub())}
        profileService={createProfileServiceStub(createProfileStub())}
        projectCycleService={createProjectCycleServiceStub()}
        workspaceContextService={createWorkspaceContextServiceStub(
          createWorkspaceContextStub()
        )}
      />
    );

    expect(
      await screen.findByRole("heading", { name: tr.administration.title })
    ).toBeInTheDocument();
    expect(
      screen.getByText(tr.administration.datePolicy.evaluationCloseLabel)
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(tr.administration.datePolicy.projectCompletionLabel)
        .length
    ).toBeGreaterThan(0);
  });

  it("blocks the administration route when the workspace has no administration role", async () => {
    window.history.replaceState(null, "", "/#administration");

    render(
      <App
        authService={createAuthServiceStub(createSessionStub())}
        profileService={createProfileServiceStub(createProfileStub())}
        projectCycleService={createProjectCycleServiceStub()}
        workspaceContextService={createWorkspaceContextServiceStub(
          createEmployeeWorkspaceContextStub()
        )}
      />
    );

    expect(
      await screen.findByRole("heading", {
        name: tr.administration.blocked.title
      })
    ).toBeInTheDocument();
  });

  it("shows invitation onboarding when an authenticated user has no profile yet", async () => {
    render(
      <App
        authService={createAuthServiceStub(createSessionStub())}
        profileService={createProfileServiceStub(null)}
      />
    );

    expect(
      await screen.findByRole("heading", { name: tr.profile.missing.title })
    ).toBeInTheDocument();
    expect(screen.getByText("person@example.com")).toBeInTheDocument();
  });

  it("renders the sign-in page when there is no active session", async () => {
    render(<App authService={createAuthServiceStub(null)} />);

    expect(
      await screen.findByRole("heading", { name: tr.auth.pageTitle })
    ).toBeInTheDocument();
  });
});

function createAuthServiceStub(session: Session | null): AuthService {
  return {
    getSession: vi.fn(async () => session),
    onAuthStateChange: vi.fn(() => ({
      unsubscribe: vi.fn()
    })),
    signInWithPassword: vi.fn(async () => undefined),
    requestPasswordReset: vi.fn(async () => undefined),
    signOut: vi.fn(async () => undefined)
  };
}

function createWorkspaceContextServiceStub(
  workspaceContext: WorkspaceContext
): WorkspaceContextService {
  return {
    getMyWorkspaceContext: vi.fn(async () => workspaceContext)
  };
}

function createProjectCycleServiceStub(): ProjectCycleService {
  return {
    addProjectMember: vi.fn(async () =>
      createManagedProjectStub({
        closesAt: "2026-07-30T15:00:00.000Z",
        evaluationName: "Evaluation",
        opensAt: "2026-07-20T09:00:00.000Z",
        organizationId: "organization-id",
        projectCode: null,
        projectCompletedOn: null,
        projectManagerUserId: null,
        projectName: "Project"
      })
    ),
    createProjectCycle: vi.fn(async (draft: ProjectCycleDraft) =>
      createManagedProjectStub(draft)
    ),
    generateProjectAssignments: vi.fn(async (evaluationCycleId) => ({
      assignmentSummary: {
        cancelled: 0,
        completed: 0,
        pending: 0,
        total: 0
      },
      candidateCount: 0,
      createdCount: 0,
      evaluationCycleId,
      participantCount: 0,
      projectId: "project-id",
      skippedDuplicateCount: 0
    })),
    listOrganizationMembers: vi.fn(async () => []),
    listProjectCycles: vi.fn(async () => []),
    updateProjectDates: vi.fn()
  };
}

function createManagedProjectStub(draft: ProjectCycleDraft): ManagedProject {
  return {
    code: draft.projectCode,
    completesOn: draft.projectCompletedOn,
    cycles: [
      {
        anonymityThreshold: 4,
        assignmentSummary: {
          cancelled: 0,
          completed: 0,
          pending: 0,
          total: 0
        },
        closesAt: draft.closesAt,
        id: "cycle-id",
        name: draft.evaluationName,
        opensAt: draft.opensAt,
        projectCompletedOn: draft.projectCompletedOn,
        status: "OPEN"
      }
    ],
    id: "project-id",
    members: [],
    name: draft.projectName,
    organizationId: draft.organizationId,
    projectManagerUserId: draft.projectManagerUserId,
    startsOn: null,
    status: "ACTIVE"
  };
}

function createWorkspaceContextStub(): WorkspaceContext {
  return {
    roles: [
      {
        roleCode: "TEAM_LEADER",
        scopeType: "TEAM",
        scopeId: "team-id"
      },
      {
        roleCode: "PROJECT_MANAGER",
        scopeType: "PROJECT",
        scopeId: "project-id"
      }
    ],
    memberships: [
      {
        organizationId: "organization-id",
        organizationName: "Yanki Demo Organization",
        unitId: "team-id",
        unitName: "Product Team",
        unitType: "TEAM",
        membershipKind: "LEADER",
        isPrimary: true
      }
    ],
    managers: [
      {
        managerUserId: "ceo-id",
        managerDisplayName: "Demo CEO",
        managerEmail: "ceo@example.com",
        relationshipType: "DIRECT_MANAGER"
      }
    ]
  };
}

function createEmployeeWorkspaceContextStub(): WorkspaceContext {
  return {
    roles: [
      {
        roleCode: "EMPLOYEE",
        scopeType: "TEAM",
        scopeId: "team-id"
      }
    ],
    memberships: [
      {
        organizationId: "organization-id",
        organizationName: "Yanki Demo Organization",
        unitId: "team-id",
        unitName: "Product Team",
        unitType: "TEAM",
        membershipKind: "MEMBER",
        isPrimary: true
      }
    ],
    managers: []
  };
}

function createSessionStub(): Session {
  return {
    user: {
      id: "user-id",
      email: "person@example.com"
    }
  } as Session;
}

function createProfileServiceStub(profile: UserProfile | null): ProfileService {
  return {
    acceptOwnInvitation: vi.fn(async () => createProfileStub()),
    getOwnProfile: vi.fn(async () => profile)
  };
}

function createProfileStub(
  overrides: Partial<UserProfile> = {}
): UserProfile {
  return {
    user_id: "user-id",
    email: "person@example.com",
    display_name: "Person Example",
    onboarding_status: "ACTIVE",
    ...overrides
  };
}
