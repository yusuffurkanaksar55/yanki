import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { tr } from "../../locales/tr/messages";
import { WorkspaceContextGate } from "./WorkspaceContextGate";
import {
  WorkspaceContextServiceError,
  type WorkspaceContext,
  type WorkspaceContextService
} from "./workspaceContextService";

describe("WorkspaceContextGate", () => {
  it("renders children when the workspace context is loaded", async () => {
    render(
      <WorkspaceContextGate service={createWorkspaceContextServiceStub()}>
        {({ workspaceContext }) => (
          <p>{workspaceContext.memberships[0]?.unitName}</p>
        )}
      </WorkspaceContextGate>
    );

    expect(await screen.findByText("Product Team")).toBeInTheDocument();
  });

  it("shows a safe Turkish error when workspace context cannot be read", async () => {
    render(
      <WorkspaceContextGate
        service={createWorkspaceContextServiceStub(
          new WorkspaceContextServiceError("WORKSPACE_CONTEXT_READ_FAILED")
        )}
      >
        {() => <p>Ready</p>}
      </WorkspaceContextGate>
    );

    expect(
      await screen.findByRole("heading", { name: tr.workspace.blocked.title })
    ).toBeInTheDocument();
    expect(
      screen.getByText(tr.workspace.feedback.WORKSPACE_CONTEXT_READ_FAILED)
    ).toBeInTheDocument();
  });
});

function createWorkspaceContextServiceStub(
  result: WorkspaceContext | WorkspaceContextServiceError = createWorkspaceContextStub()
): WorkspaceContextService {
  return {
    getMyWorkspaceContext: vi.fn(async () => {
      if (result instanceof WorkspaceContextServiceError) {
        throw result;
      }

      return result;
    })
  };
}

function createWorkspaceContextStub(): WorkspaceContext {
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
