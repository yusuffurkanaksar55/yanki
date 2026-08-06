import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { tr } from "../../locales/tr/messages";
import type { WorkspaceContext } from "../workspace/workspaceContextService";
import { EvaluationTemplateManagementPanel } from "./EvaluationTemplateManagementPanel";
import type {
  EvaluationTemplate,
  EvaluationTemplateService
} from "./evaluationTemplateService";

describe("EvaluationTemplateManagementPanel", () => {
  it("creates an editable template draft through the trusted service", async () => {
    const user = userEvent.setup();
    const service = createService([]);

    render(
      <EvaluationTemplateManagementPanel
        service={service}
        workspaceContext={createWorkspaceContext()}
      />
    );

    expect(await screen.findByText(tr.administration.templates.empty)).toBeInTheDocument();

    const form = screen
      .getByRole("heading", { name: tr.administration.templates.form.newTitle })
      .closest("form");

    expect(form).not.toBeNull();
    const formRegion = within(form as HTMLFormElement);

    await user.type(
      formRegion.getByLabelText(tr.administration.templates.form.name),
      "Proje Geri Bildirimi"
    );
    await user.type(
      formRegion.getByLabelText(`${tr.administration.templates.form.prompt} 1`),
      "İş birliği ne kadar etkiliydi?"
    );
    await user.click(
      formRegion.getByRole("button", {
        name: tr.administration.templates.form.save
      })
    );

    expect(service.saveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Proje Geri Bildirimi",
        organizationId: "organization-id",
        questions: [
          expect.objectContaining({
            prompt: "İş birliği ne kadar etkiliydi?",
            questionType: "RATING_1_TO_5"
          })
        ],
        templateId: null,
        templateVersionId: null
      })
    );
    expect(
      await screen.findByText(tr.administration.templates.feedback.saved)
    ).toBeInTheDocument();
  });

  it("publishes a draft and presents the returned version as immutable", async () => {
    const user = userEvent.setup();
    const draftTemplate = createTemplate("DRAFT");
    const service = createService([draftTemplate]);

    render(
      <EvaluationTemplateManagementPanel
        service={service}
        workspaceContext={createWorkspaceContext()}
      />
    );

    await screen.findByText(draftTemplate.name);
    await user.click(
      screen.getByRole("button", {
        name: tr.administration.templates.list.publish
      })
    );

    expect(service.publishVersion).toHaveBeenCalledWith("template-version-id");
    expect(
      await screen.findByText(tr.administration.templates.list.immutable)
    ).toBeInTheDocument();
    expect(
      screen.getByText(tr.administration.templates.feedback.published)
    ).toBeInTheDocument();
  });
});

function createService(
  templates: readonly EvaluationTemplate[]
): EvaluationTemplateService {
  return {
    cloneVersion: vi.fn(async () => createTemplate("DRAFT", 2)),
    listTemplates: vi.fn(async () => templates),
    publishVersion: vi.fn(async () => createTemplate("PUBLISHED")),
    saveDraft: vi.fn(async () => createTemplate("DRAFT"))
  };
}

function createTemplate(
  status: "DRAFT" | "PUBLISHED",
  versionNumber = 1
): EvaluationTemplate {
  return {
    description: "Proje değerlendirme soruları",
    id: "template-id",
    name: "Proje Geri Bildirimi",
    organizationId: "organization-id",
    status: "ACTIVE",
    versions: [
      {
        description: "Proje değerlendirme soruları",
        id: "template-version-id",
        name: "Proje Geri Bildirimi",
        publishedAt: status === "PUBLISHED"
          ? "2026-08-06T09:00:00.000Z"
          : null,
        questions: [
          {
            id: "question-id",
            isRequired: true,
            options: [],
            position: 1,
            prompt: "İş birliği ne kadar etkiliydi?",
            questionType: "RATING_1_TO_5"
          }
        ],
        status,
        versionNumber
      }
    ]
  };
}

function createWorkspaceContext(): WorkspaceContext {
  return {
    managers: [],
    memberships: [
      {
        isPrimary: true,
        membershipKind: "LEADER",
        organizationId: "organization-id",
        organizationName: "Yanki Demo Organization",
        unitId: "unit-id",
        unitName: "People Operations",
        unitType: "DEPARTMENT"
      }
    ],
    roles: [
      {
        roleCode: "SYSTEM_ADMIN",
        scopeId: "organization-id",
        scopeType: "ORGANIZATION"
      }
    ]
  };
}
