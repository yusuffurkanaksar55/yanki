import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { tr } from "../../locales/tr/messages";
import { EvaluationRetentionManagementPanel } from
  "./EvaluationRetentionManagementPanel";
import type {
  EvaluationRetentionPolicy,
  EvaluationRetentionService
} from "./evaluationRetentionService";

describe("EvaluationRetentionManagementPanel", () => {
  it("shows content-free policy state and the backup expiry boundary", async () => {
    const service = createService();

    render(<EvaluationRetentionManagementPanel service={service} />);

    expect(await screen.findByText("Retention Test Organization"))
      .toBeInTheDocument();
    expect(screen.getByText(tr.administration.retention.backupNotice))
      .toBeInTheDocument();
    expect(document.body.textContent).not.toContain("submissionCount");
    expect(document.body.textContent).not.toContain("evaluation content");
  });

  it("updates retention days, automation, and legal hold together", async () => {
    const user = userEvent.setup();
    const service = createService();

    render(<EvaluationRetentionManagementPanel service={service} />);

    const retentionInput = await screen.findByLabelText(
      tr.administration.retention.form.retentionDays
    );

    await user.clear(retentionInput);
    await user.type(retentionInput, "365");
    await user.click(screen.getByLabelText(
      new RegExp(tr.administration.retention.form.automaticPurge, "u")
    ));
    await user.click(screen.getByLabelText(
      new RegExp(tr.administration.retention.form.legalHold, "u")
    ));
    await user.click(screen.getByRole("button", {
      name: tr.administration.retention.form.save
    }));

    expect(service.updatePolicy).toHaveBeenCalledWith({
      automaticPurgeEnabled: true,
      legalHold: true,
      organizationId: "8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      retentionDays: 365
    });
    expect(await screen.findByText(
      tr.administration.retention.feedback.saved
    )).toBeInTheDocument();
  });
});

function createService(): EvaluationRetentionService {
  const policy: EvaluationRetentionPolicy = {
    automaticPurgeEnabled: false,
    lastPurgeCompletedAt: null,
    lastPurgeCutoffOn: null,
    legalHold: false,
    organizationId: "8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    organizationName: "Retention Test Organization",
    policyVersion: 1,
    retentionDays: 730,
    updatedAt: "2026-08-08T12:00:00Z"
  };

  return {
    listPolicies: vi.fn(async () => [policy]),
    updatePolicy: vi.fn(async (input) => ({
      ...policy,
      ...input,
      policyVersion: 2
    }))
  };
}
