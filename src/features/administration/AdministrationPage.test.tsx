import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { tr } from "../../locales/tr/messages";
import type { WorkspaceContext } from "../workspace/workspaceContextService";
import { AdministrationPage } from "./AdministrationPage";

describe("AdministrationPage", () => {
  it("renders administration workflows for users with an administration role", () => {
    render(<AdministrationPage workspaceContext={createAdminWorkspaceContext()} />);

    expect(
      screen.getByRole("heading", { name: tr.administration.title })
    ).toBeInTheDocument();
    expect(
      screen.getByText(tr.administration.workflows[2].title)
    ).toBeInTheDocument();
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
