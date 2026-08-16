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
  it("loads the latest person report and renders detailed aggregate data", async () => {
    const service = createService(createAvailableReport());
    const user = userEvent.setup();

    render(<EvaluationReportsPanel service={service} />);

    await screen.findByRole("option", { name: /Takım Lideri/ });
    expect(
      screen.getByRole("button", { name: tr.reports.actions.load })
    ).toBeDisabled();
    expect(service.getReport).not.toHaveBeenCalled();
    await user.selectOptions(
      screen.getByLabelText(tr.reports.subjectLabel),
      "subject-id"
    );

    expect(await screen.findByText("4,25")).toBeInTheDocument();
    expect(screen.getByText("85 / 100")).toBeInTheDocument();
    expect(screen.getByText(tr.reports.insights.strengths)).toBeInTheDocument();
    expect(screen.getByText(tr.reports.detail.title)).toBeInTheDocument();
    expect(screen.getByText("Takım Lideri için yazılan yorumlar")).toBeInTheDocument();
    expect(screen.getByText("Gizli serbest metin")).toBeInTheDocument();
    expect(screen.getByText(tr.reports.textComments.contextRisk)).toBeInTheDocument();
    expect(service.getReport).toHaveBeenCalledWith("cycle-id", "subject-id");
  });

  it("shows a clearly marked example report when a person has no responses", async () => {
    const service = createService({
      ...createTarget(),
      questions: [],
      status: "EMPTY",
      submissionCount: null
    });
    const user = userEvent.setup();

    render(<EvaluationReportsPanel service={service} />);

    await screen.findByRole("option", { name: /Takım Lideri/ });
    await user.selectOptions(
      screen.getByLabelText(tr.reports.subjectLabel),
      "subject-id"
    );
    expect(await screen.findByText(tr.reports.noResponses.title)).toBeInTheDocument();
    expect(screen.getByText(tr.reports.noResponses.description)).toBeInTheDocument();
    expect(screen.queryByText(tr.reports.labels.submissions)).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: tr.reports.actions.showExample })
    );

    expect(screen.getByText(tr.reports.example.noticeTitle)).toBeInTheDocument();
    expect(screen.getByText(tr.reports.example.subjectName)).toBeInTheDocument();
    expect(screen.getByText("81,33 / 100")).toBeInTheDocument();
    expect(service.getReport).toHaveBeenCalledTimes(1);
  });

  it("lists every evaluated person directly before cycle selection", async () => {
    const ahmetTarget = createTarget({
      evaluationCycleId: "ahmet-cycle-id",
      evaluationCycleName: "Proje Sonu Değerlendirmesi",
      subjectDisplayName: "Ahmet Yılmaz",
      subjectEmail: "ahmet@example.com",
      subjectUserId: "ahmet-id"
    });
    const service = createService(createAvailableReport(), [
      createTarget(),
      ahmetTarget
    ]);
    const user = userEvent.setup();

    render(<EvaluationReportsPanel service={service} />);

    await screen.findByRole("option", { name: /Takım Lideri/ });
    expect(screen.getByRole("option", { name: /Ahmet Yılmaz/ })).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    await user.selectOptions(
      screen.getByLabelText(tr.reports.subjectLabel),
      "ahmet-id"
    );
    expect(
      screen.getByRole("option", { name: /Proje Sonu Değerlendirmesi/ })
    ).toBeInTheDocument();
    expect(service.getReport).toHaveBeenCalledWith("ahmet-cycle-id", "ahmet-id");
  });
});

function createService(
  report: EvaluationReport,
  targets: readonly EvaluationReportTarget[] = [createTarget()]
): EvaluationReportService {
  return {
    getReport: vi.fn(async () => report),
    listTargets: vi.fn(async () => targets)
  };
}

function createTarget(
  overrides: Partial<EvaluationReportTarget> = {}
): EvaluationReportTarget {
  return {
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
    templateVersionNumber: 1,
    ...overrides
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
          comments: [
            "Gizli serbest metin",
            "İkinci gelişim yorumu",
            "Üçüncü gelişim yorumu"
          ],
          kind: "TEXT_COMMENTS"
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
