import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { tr } from "../../locales/tr/messages";
import type { WorkspaceContext } from "../workspace/workspaceContextService";
import { UserInvitationManagementPanel } from "./UserInvitationManagementPanel";
import type {
  UserAdministrationService,
  UserInvitationDraft
} from "./userAdministrationService";

describe("UserInvitationManagementPanel", () => {
  it("loads administration options and creates an invitation", async () => {
    const user = userEvent.setup();
    const service = createUserAdministrationServiceStub();

    render(
      <UserInvitationManagementPanel
        service={service}
        workspaceContext={createWorkspaceContext()}
      />
    );

    expect(
      await screen.findByRole("heading", {
        name: tr.administration.users.title
      })
    ).toBeInTheDocument();
    expect(
      await screen.findByLabelText(tr.administration.users.form.organization)
    ).toHaveValue("organization-id");
    expect(
      screen.getByLabelText(tr.administration.users.form.unit)
    ).toHaveValue("unit-id");

    await user.type(
      screen.getByLabelText(tr.administration.users.form.displayName),
      "New Employee"
    );
    await user.type(
      screen.getByLabelText(tr.administration.users.form.email),
      "new.employee@example.com"
    );
    await user.selectOptions(
      screen.getByLabelText(tr.administration.users.form.role),
      "TEAM_LEADER"
    );
    await user.selectOptions(
      screen.getByLabelText(tr.administration.users.form.manager),
      "manager-id"
    );
    await user.click(
      screen.getByRole("button", {
        name: tr.administration.users.form.submit
      })
    );

    expect(service.createInvitation).toHaveBeenCalledWith({
      displayName: "New Employee",
      email: "new.employee@example.com",
      expiresInDays: 7,
      managerUserId: "manager-id",
      organizationId: "organization-id",
      roleCode: "TEAM_LEADER",
      unitId: "unit-id"
    });
    expect(
      await screen.findByText(tr.administration.users.feedback.created)
    ).toBeInTheDocument();
    expect(screen.getByText("new.employee@example.com")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: tr.administration.users.list.revoke
      })
    );

    expect(service.revokeInvitation).toHaveBeenCalledWith("invitation-id");
    expect(
      await screen.findByText(tr.administration.users.feedback.revoked)
    ).toBeInTheDocument();
  });

  it("does not render for users without a system administrator role", () => {
    const { container } = render(
      <UserInvitationManagementPanel
        service={createUserAdministrationServiceStub()}
        workspaceContext={{
          managers: [],
          memberships: [],
          roles: [
            {
              roleCode: "PROJECT_MANAGER",
              scopeId: "project-id",
              scopeType: "PROJECT"
            }
          ]
        }}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});

function createUserAdministrationServiceStub(): UserAdministrationService {
  return {
    createInvitation: vi.fn(async (draft: UserInvitationDraft) => ({
      createdAt: "2026-07-20T20:00:00.000Z",
      displayName: draft.displayName,
      email: draft.email,
      expiresAt: "2026-07-27T20:00:00.000Z",
      id: "invitation-id",
      organizationId: draft.organizationId,
      roleCode: draft.roleCode,
      scopeType: "TEAM",
      status: "PENDING" as const,
      unitId: draft.unitId
    })),
    listUserAdministration: vi.fn(async () => ({
      invitations: [],
      members: [
        {
          displayName: "Demo Manager",
          email: "manager@example.com",
          organizationId: "organization-id",
          userId: "manager-id"
        }
      ],
      organizations: [
        {
          id: "organization-id",
          name: "Demo Organization"
        }
      ],
      units: [
        {
          id: "unit-id",
          name: "Product Team",
          organizationId: "organization-id",
          unitType: "TEAM"
        }
      ]
    })),
    revokeInvitation: vi.fn(async (invitationId) => ({
      createdAt: "2026-07-20T20:00:00.000Z",
      displayName: "New Employee",
      email: "new.employee@example.com",
      expiresAt: "2026-07-27T20:00:00.000Z",
      id: invitationId,
      organizationId: "organization-id",
      roleCode: "TEAM_LEADER",
      scopeType: "TEAM",
      status: "REVOKED" as const,
      unitId: "unit-id"
    }))
  };
}

function createWorkspaceContext(): WorkspaceContext {
  return {
    managers: [],
    memberships: [],
    roles: [
      {
        roleCode: "SYSTEM_ADMIN",
        scopeId: "organization-id",
        scopeType: "ORGANIZATION"
      }
    ]
  };
}
