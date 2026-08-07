import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { tr } from "../../locales/tr/messages";
import { AssignmentInbox } from "./AssignmentInbox";
import type {
  EvaluationAssignment,
  EvaluationAssignmentService,
  PreparedEvaluationSubmission
} from "./evaluationAssignmentService";

describe("AssignmentInbox", () => {
  it("shows only the assignments returned by the trusted service", async () => {
    const onSummaryChange = vi.fn();

    render(
      <AssignmentInbox
        onSummaryChange={onSummaryChange}
        service={createService([createAssignment()])}
      />
    );

    expect(
      await screen.findByRole("heading", { name: "Proje Değerlendirmesi" })
    ).toBeInTheDocument();
    expect(screen.getByText("Çalışan Bir")).toBeInTheDocument();
    expect(screen.getByText("Yanki Projesi (YNK-1)")).toBeInTheDocument();
    expect(screen.getByText(tr.assignments.status.available)).toBeInTheDocument();
    expect(onSummaryChange).toHaveBeenCalledWith({
      activeCycleCount: 1,
      pendingAssignmentCount: 1
    });
  });

  it("shows an empty state when the user has no assignment", async () => {
    render(<AssignmentInbox service={createService([])} />);

    expect(await screen.findByText(tr.assignments.empty.title)).toBeInTheDocument();
  });

  it("retries after a safe read error", async () => {
    const user = userEvent.setup();
    const listMyAssignments = vi
      .fn<() => Promise<readonly EvaluationAssignment[]>>()
      .mockRejectedValueOnce(new Error("database details"))
      .mockResolvedValueOnce([createAssignment()]);

    render(
      <AssignmentInbox
        service={{
          listMyAssignments,
          prepareSubmission: vi.fn(),
          submitEvaluation: vi.fn()
        }}
      />
    );

    expect(
      await screen.findByText(tr.assignments.feedback.readFailed)
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: tr.assignments.actions.retry })
    );

    await waitFor(() => expect(listMyAssignments).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole("heading", { name: "Proje Değerlendirmesi" })
    ).toBeInTheDocument();
  });

  it("prepares, validates, and submits an available evaluation", async () => {
    const user = userEvent.setup();
    const service = createService([createAssignment()]);

    render(<AssignmentInbox service={service} />);

    await user.click(
      await screen.findByRole("button", { name: tr.assignments.actions.start })
    );

    expect(service.prepareSubmission).toHaveBeenCalledWith("assignment-id");
    expect(
      await screen.findByRole("dialog", { name: "Proje Değerlendirmesi" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(tr.assignments.submission.privacy.description)
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: tr.assignments.submission.actions.submit
      })
    );
    expect(
      await screen.findByText(
        tr.assignments.submission.feedback.requiredAnswers
      )
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "5" }));
    await user.type(screen.getByRole("textbox"), "Yapıcı bir yorum");
    await user.click(
      screen.getByRole("button", {
        name: tr.assignments.submission.actions.submit
      })
    );

    await waitFor(() =>
      expect(service.submitEvaluation).toHaveBeenCalledWith(
        "anonymous-credential",
        [
          { questionId: "11111111-1111-4111-8111-111111111111", value: 5 },
          {
            questionId: "22222222-2222-4222-8222-222222222222",
            value: "Yapıcı bir yorum"
          }
        ]
      )
    );
    expect(
      await screen.findByText(tr.assignments.submission.feedback.submitted)
    ).toBeInTheDocument();
  });
});

function createService(
  assignments: readonly EvaluationAssignment[]
): EvaluationAssignmentService {
  return {
    listMyAssignments: vi.fn(async () => assignments),
    prepareSubmission: vi.fn(async () => createPreparedSubmission()),
    submitEvaluation: vi.fn(async () => undefined)
  };
}

function createAssignment(): EvaluationAssignment {
  return {
    assignmentKind: "PROJECT_PEER",
    assignmentStatus: "PENDING",
    availabilityStatus: "AVAILABLE",
    closesAt: "2026-08-30T14:00:00.000Z",
    cycleStatus: "OPEN",
    evaluationCycleId: "cycle-id",
    evaluationCycleName: "Proje Değerlendirmesi",
    id: "assignment-id",
    opensAt: "2026-08-01T09:00:00.000Z",
    organizationId: "organization-id",
    organizationName: "Yanki Demo Organization",
    projectCode: "YNK-1",
    projectId: "project-id",
    projectName: "Yanki Projesi",
    subjectDisplayName: "Çalışan Bir",
    subjectEmail: "employee@example.com",
    templateName: "Proje Geri Bildirimi",
    templateVersionId: "template-version-id",
    templateVersionNumber: 1
  };
}

function createPreparedSubmission(): PreparedEvaluationSubmission {
  return {
    credential: "anonymous-credential",
    evaluationCycleId: "cycle-id",
    evaluationCycleName: "Proje Değerlendirmesi",
    expiresAt: "2026-08-07T14:00:00.000Z",
    organizationId: "organization-id",
    organizationName: "Yanki Demo Organization",
    projectCode: "YNK-1",
    projectId: "project-id",
    projectName: "Yanki Projesi",
    questions: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        isRequired: true,
        options: [],
        position: 1,
        prompt: "Katkı düzeyi",
        questionType: "RATING_1_TO_5"
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        isRequired: true,
        options: [],
        position: 2,
        prompt: "Yorumunuz",
        questionType: "LONG_TEXT"
      }
    ],
    subjectDisplayName: "Çalışan Bir",
    subjectEmail: "employee@example.com",
    templateName: "Proje Geri Bildirimi",
    templateVersionId: "template-version-id",
    templateVersionNumber: 1
  };
}
