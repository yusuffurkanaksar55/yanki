import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { tr } from "../../locales/tr/messages";
import { AssignmentInbox } from "./AssignmentInbox";
import type {
  EvaluationAssignment,
  EvaluationAssignmentService
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

    render(<AssignmentInbox service={{ listMyAssignments }} />);

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
});

function createService(
  assignments: readonly EvaluationAssignment[]
): EvaluationAssignmentService {
  return {
    listMyAssignments: vi.fn(async () => assignments)
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
