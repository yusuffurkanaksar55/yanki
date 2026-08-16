import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { tr } from "../../locales/tr/messages";
import type { WorkspaceContext } from "../workspace/workspaceContextService";
import type {
  HierarchyAdministrationData,
  HierarchyAdministrationService
} from "./hierarchyAdministrationService";
import { RoleHierarchyManagementPanel } from "./RoleHierarchyManagementPanel";

describe("RoleHierarchyManagementPanel", () => {
  it("creates units and updates member hierarchy through the trusted service", async () => {
    const user = userEvent.setup();
    const service = createServiceStub();

    render(
      <RoleHierarchyManagementPanel
        service={service}
        workspaceContext={createSystemAdminContext()}
      />
    );

    expect(await screen.findByLabelText(
      tr.administration.hierarchy.organization
    )).toHaveValue("organization-id");

    const organizationNameInput = screen.getByLabelText(
      tr.administration.hierarchy.organizationSettings.name
    );
    await user.clear(organizationNameInput);
    await user.type(organizationNameInput, "Yeni Şirket Adı");
    await user.click(screen.getByRole("button", {
      name: tr.administration.hierarchy.organizationSettings.save
    }));

    expect(service.updateOrganizationName).toHaveBeenCalledWith(
      "organization-id",
      "Yeni Şirket Adı"
    );

    await user.type(
      screen.getByLabelText(tr.administration.hierarchy.units.name),
      "Ürün Geliştirme"
    );
    await user.selectOptions(
      screen.getByLabelText(tr.administration.hierarchy.units.type),
      "DEPARTMENT"
    );
    await user.click(screen.getByRole("button", {
      name: tr.administration.hierarchy.units.submitCreate
    }));

    expect(service.saveUnit).toHaveBeenCalledWith({
      name: "Ürün Geliştirme",
      organizationId: "organization-id",
      parentUnitId: null,
      slug: "urun-gelistirme",
      status: "ACTIVE",
      unitId: null,
      unitType: "DEPARTMENT"
    });

    const peopleForm = screen.getByRole("heading", {
      name: tr.administration.hierarchy.people.title
    }).closest("form");

    expect(peopleForm).not.toBeNull();
    const people = within(peopleForm as HTMLFormElement);

    await user.selectOptions(
      people.getByLabelText(tr.administration.hierarchy.people.user),
      "employee-id"
    );
    await user.selectOptions(
      people.getByLabelText(tr.administration.hierarchy.people.primaryUnit),
      "unit-two-id"
    );
    await user.selectOptions(
      people.getByLabelText(tr.administration.hierarchy.people.membershipKind),
      "LEADER"
    );
    await user.selectOptions(
      people.getByLabelText(tr.administration.hierarchy.people.manager),
      "leader-id"
    );
    await user.click(people.getByRole("button", {
      name: tr.administration.hierarchy.people.submit
    }));

    expect(service.setUserContext).toHaveBeenCalledWith({
      managerUserId: "leader-id",
      membershipKind: "LEADER",
      organizationId: "organization-id",
      primaryUnitId: "unit-two-id",
      userId: "employee-id"
    });
  });

  it("assigns and ends scoped roles", async () => {
    const user = userEvent.setup();
    const service = createServiceStub();

    render(
      <RoleHierarchyManagementPanel
        service={service}
        workspaceContext={createSystemAdminContext()}
      />
    );

    const roleForm = (await screen.findByRole("heading", {
      name: tr.administration.hierarchy.roles.title
    })).closest("form");

    expect(roleForm).not.toBeNull();
    const roles = within(roleForm as HTMLFormElement);

    await user.selectOptions(
      roles.getByLabelText(tr.administration.hierarchy.roles.user),
      "employee-id"
    );
    await user.selectOptions(
      roles.getByLabelText(tr.administration.hierarchy.roles.role),
      "TEAM_LEADER"
    );
    await user.click(roles.getByRole("button", {
      name: tr.administration.hierarchy.roles.submit
    }));

    expect(service.assignRole).toHaveBeenCalledWith({
      organizationId: "organization-id",
      roleCode: "TEAM_LEADER",
      unitId: "unit-one-id",
      userId: "employee-id"
    });

    await user.click(roles.getByRole("button", {
      name: tr.administration.hierarchy.roles.end
    }));

    expect(service.endRole).toHaveBeenCalledWith(
      "organization-id",
      "employee-role-id"
    );
  });

  it("does not render for users without a system administrator role", () => {
    const { container } = render(
      <RoleHierarchyManagementPanel
        service={createServiceStub()}
        workspaceContext={{
          managers: [],
          memberships: [],
          roles: [{
            roleCode: "PROJECT_MANAGER",
            scopeId: "project-id",
            scopeType: "PROJECT"
          }]
        }}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});

const hierarchyData: HierarchyAdministrationData = {
  members: [
    {
      displayName: "Takım Lideri",
      email: "leader@example.com",
      managerUserId: null,
      membershipKind: "LEADER",
      organizationId: "organization-id",
      primaryUnitId: "unit-one-id",
      roles: [],
      userId: "leader-id"
    },
    {
      displayName: "Çalışan",
      email: "employee@example.com",
      managerUserId: "leader-id",
      membershipKind: "MEMBER",
      organizationId: "organization-id",
      primaryUnitId: "unit-one-id",
      roles: [{
        id: "employee-role-id",
        roleCode: "EMPLOYEE",
        scopeId: "unit-one-id",
        scopeType: "TEAM"
      }],
      userId: "employee-id"
    }
  ],
  organizations: [{ id: "organization-id", name: "Demo Şirketi" }],
  units: [
    {
      id: "unit-one-id",
      name: "Ürün Takımı",
      organizationId: "organization-id",
      parentUnitId: null,
      slug: "urun-takimi",
      status: "ACTIVE",
      unitType: "TEAM"
    },
    {
      id: "unit-two-id",
      name: "Operasyon",
      organizationId: "organization-id",
      parentUnitId: null,
      slug: "operasyon",
      status: "ACTIVE",
      unitType: "DEPARTMENT"
    }
  ]
};

function createServiceStub(): HierarchyAdministrationService {
  return {
    assignRole: vi.fn(async () => hierarchyData),
    endRole: vi.fn(async () => hierarchyData),
    list: vi.fn(async () => hierarchyData),
    saveUnit: vi.fn(async () => hierarchyData),
    setUserContext: vi.fn(async () => hierarchyData),
    updateOrganizationName: vi.fn(async (_organizationId, name) => ({
      ...hierarchyData,
      organizations: [{ id: "organization-id", name }]
    }))
  };
}

function createSystemAdminContext(): WorkspaceContext {
  return {
    managers: [],
    memberships: [],
    roles: [{
      roleCode: "SYSTEM_ADMIN",
      scopeId: "organization-id",
      scopeType: "ORGANIZATION"
    }]
  };
}
