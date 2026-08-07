import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { tr } from "../../locales/tr/messages";
import { EvaluationReportsPanel } from "./EvaluationReportsPanel";
import type {
  EvaluationReport,
  EvaluationReportService,
  EvaluationReportTarget
} from "./evaluationReportService";

describe("EvaluationReportsPanel", () => {
  it("renders only aggregate data and never renders decrypted text", async () => {
    const service = createService(createAvailableReport());
    const user = userEvent.setup();

    render(<EvaluationReportsPanel service={service} />);

    await screen.findByRole("option", { name: /Yıllık Değerlendirme/ });
    await user.click(
      screen.getByRole("button", { name: tr.reports.actions.load })
    );

    expect(await screen.findByText("4,25")).toBeInTheDocument();
    expect(screen.getByText("3 yanıt verildi", { exact: false })).toBeInTheDocument();
    expect(screen.queryByText("Gizli serbest metin")).not.toBeInTheDocument();
    expect(service.getReport).toHaveBeenCalledWith("cycle-id", "subject-id");
  });

  it("does not reveal the exact submission count below the threshold", async () => {
    const service = createService({
      ...createTarget(),
      questions: [],
      status: "WITHHELD",
      submissionCount: null
    });
    const user = userEvent.setup();

    render(<EvaluationReportsPanel service={service} />);

    await screen.findByRole("option", { name: /Yıllık Değerlendirme/ });
    await user.click(
      screen.getByRole("button", { name: tr.reports.actions.load })
    );

    expect(await screen.findByText(tr.reports.withheld.title)).toBeInTheDocument();
    expect(screen.getByText(tr.reports.withheld.countProtected)).toBeInTheDocument();
    expect(screen.queryByText(tr.reports.labels.submissions)).not.toBeInTheDocument();
  });
});

function createService(report: EvaluationReport): EvaluationReportService {
  return {
    getReport: vi.fn(async () => report),
    listTargets: vi.fn(async () => [createTarget()])
  };
}

function createTarget(): EvaluationReportTarget {
  return {
    anonymityThreshold: 4,
    closedAt: "2026-08-01T12:00:00.000Z",
    evaluationCycleId: "cycle-id",
    evaluationCycleName: "Yıllık Değerlendirme",
    organizationId: "organization-id",
    organizationName: "Yanki Test",
    projectCode: "YNK-1",
    projectId: "project-id",
    projectName: "Yanki",
    subjectDisplayName: "Takım Lideri",
    subjectEmail: "leader@example.com",
    subjectUserId: "subject-id",
    templateName: "Liderlik Geri Bildirimi",
    templateVersionId: "template-version-id",
    templateVersionNumber: 1
  };
}

function createAvailableReport(): EvaluationReport {
  return {
    ...createTarget(),
    questions: [
      {
        aggregation: {
          average: 4.25,
          distribution: [
            { count: 0, value: "1" },
            { count: 1, value: "4" },
            { count: 3, value: "5" }
          ],
          kind: "RATING"
        },
        answeredCount: 4,
        id: "rating-id",
        position: 1,
        prompt: "Liderlik etkisi",
        questionType: "RATING_1_TO_5"
      },
      {
        aggregation: {
          kind: "TEXT_WITHHELD",
          responseCount: 3
        },
        answeredCount: 3,
        id: "text-id",
        position: 2,
        prompt: "Gelişim önerisi",
        questionType: "LONG_TEXT"
      }
    ],
    status: "AVAILABLE",
    submissionCount: 4
  };
}
