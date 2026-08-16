import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type TestInfo
} from "@playwright/test";
import { tr } from "../../src/locales/tr/messages";
import {
  invokeDirectSensitiveEndpointWithoutGatewayToken,
  invokeReportAs,
  provisionE2EFixture,
  readActiveUserIdByEmail,
  redeemLocalInvitationLink,
  waitForInvitationLink,
  type E2ECredentials
} from "./support/local-supabase";

test("invitation, evaluation, immediate reporting, and access boundaries", async ({
  browser
}, testInfo) => {
  const fixture = await provisionE2EFixture();
  const invitee = {
    displayName: `E2E Employee ${fixture.runId}`,
    email: `e2e-employee-${fixture.runId}@example.test`,
    password: "Yanki-E2E-Employee!2026"
  };
  const templateName = `E2E Feedback ${fixture.runId}`;
  const projectName = `E2E Project ${fixture.runId}`;
  const projectCode = `E2E-${fixture.runId}`.slice(0, 36);
  const cycleName = `E2E Evaluation ${fixture.runId}`;
  const ratingPrompt = `E2E collaboration rating ${fixture.runId}`;
  const textPrompt = `E2E development note ${fixture.runId}`;
  const rawTextMarker = `RAW-TEXT-MUST-STAY-HIDDEN-${fixture.runId}`;
  const contexts: BrowserContext[] = [];

  try {
    if (process.env.E2E_EXPECT_GATEWAY_REQUIRED === "true") {
      expect(await invokeDirectSensitiveEndpointWithoutGatewayToken()).toBe(403);
      console.log("[e2e] Direct sensitive endpoint bypass denied.");
    }

    const adminContext = await browser.newContext({
      viewport: { height: 1000, width: 1440 }
    });
    contexts.push(adminContext);
    const adminPage = await adminContext.newPage();
    collectPageErrors(adminPage);
    await signIn(adminPage, fixture.admin);
    console.log("[e2e] Administrator session ready.");
    await adminPage.getByRole("link", {
      name: tr.dashboard.administration.action
    }).click();
    await expect(adminPage.getByRole("heading", {
      name: tr.administration.title
    })).toBeVisible();

    await adminPage.getByRole("tab", {
      name: tr.administration.modules.hierarchy
    }).click();
    const hierarchyPanel = adminPage.getByRole("region", {
      name: tr.administration.hierarchy.sectionLabel
    });
    const organizationNameInput = hierarchyPanel.getByLabel(
      tr.administration.hierarchy.organizationSettings.name
    );
    await organizationNameInput.fill(`Yanki E2E Updated ${fixture.runId}`);
    await hierarchyPanel.getByRole("button", {
      name: tr.administration.hierarchy.organizationSettings.save
    }).click();
    await expect(hierarchyPanel.getByText(
      tr.administration.hierarchy.feedback.organizationNameSaved
    )).toBeVisible();
    await organizationNameInput.fill(`Yanki E2E ${fixture.runId}`);
    await hierarchyPanel.getByRole("button", {
      name: tr.administration.hierarchy.organizationSettings.save
    }).click();
    await expect(organizationNameInput).toHaveValue(`Yanki E2E ${fixture.runId}`);
    await assertAdministrationGeometry(adminPage, hierarchyPanel);
    await adminPage.screenshot({
      fullPage: true,
      path: testInfo.outputPath("admin-hierarchy-desktop.png")
    });
    await assertResponsiveLayout(adminPage, testInfo, "admin-hierarchy");
    await adminPage.setViewportSize({ height: 1000, width: 1440 });
    console.log("[e2e] Organization name and administration geometry verified.");

    await adminPage.getByRole("tab", {
      name: tr.administration.modules.users
    }).click();
    await expect(adminPage.getByRole("heading", {
      name: tr.administration.users.title
    })).toBeVisible();
    const invitationPanel = adminPage.getByRole("region", {
      name: tr.administration.users.sectionLabel
    });

    await invitationPanel.getByLabel(tr.administration.users.form.displayName)
      .fill(invitee.displayName);
    await invitationPanel.getByLabel(tr.administration.users.form.email)
      .fill(invitee.email);
    await expect(invitationPanel.getByRole("combobox", {
      name: tr.administration.users.form.role,
      exact: true
    })).toHaveValue("EMPLOYEE");
    await selectOptionContaining(
      invitationPanel.getByRole("combobox", {
        name: tr.administration.users.form.manager,
        exact: true
      }),
      fixture.subject.email
    );
    await invitationPanel.getByRole("button", {
      name: tr.administration.users.form.submit
    }).click();
    await expect(adminPage.getByText(
      tr.administration.users.feedback.created
    )).toBeVisible();
    await expect(adminPage.getByText(invitee.email)).toBeVisible();
    console.log("[e2e] Invitation created.");

    const invitationLink = await waitForInvitationLink(invitee.email);
    const invitationCallback = await redeemLocalInvitationLink(invitationLink);
    const employeeContext = await browser.newContext({
      viewport: { height: 900, width: 1280 }
    });
    contexts.push(employeeContext);
    const employeePage = await employeeContext.newPage();
    collectPageErrors(employeePage);
    await employeePage.goto(invitationCallback);
    await expect(employeePage.getByRole("heading", {
      name: tr.auth.passwordSetup.title
    })).toBeVisible();
    await employeePage.getByLabel(
      tr.auth.passwordSetup.passwordLabel,
      { exact: true }
    )
      .fill(invitee.password);
    await employeePage.getByLabel(
      tr.auth.passwordSetup.confirmationLabel,
      { exact: true }
    )
      .fill(invitee.password);
    await employeePage.getByRole("button", {
      name: tr.auth.passwordSetup.submitButton
    }).click();
    await expect(employeePage.getByRole("heading", {
      name: tr.profile.inactive.title
    })).toBeVisible();
    await employeePage.getByRole("button", {
      name: tr.profile.inactive.acceptInvitation
    }).click();
    await expect(employeePage.getByRole("heading", {
      name: tr.dashboard.title
    })).toBeVisible();
    console.log("[e2e] Invitation accepted.");
    const inviteeUserId = await readActiveUserIdByEmail(invitee.email);

    await createAndPublishTemplate(adminPage, {
      ratingPrompt,
      templateName,
      textPrompt
    }, testInfo);
    console.log("[e2e] Template published.");
    await createProjectAndAssignments(adminPage, {
      cycleName,
      inviteeEmail: invitee.email,
      inviteeUserId,
      projectCode,
      projectName,
      subjectUserId: fixture.subject.userId,
      templateName
    });
    console.log("[e2e] Project assignments generated.");

    await employeePage.goto("/#assignments");
    await employeePage.reload();
    await expect(employeePage.getByRole("heading", {
      name: cycleName
    })).toBeVisible();
    await employeePage.getByRole("button", {
      name: tr.assignments.actions.start
    }).click();
    const dialog = employeePage.getByRole("dialog", { name: cycleName });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "5", exact: true }).click();
    await dialog.getByRole("textbox").fill(rawTextMarker);
    await dialog.getByRole("button", {
      name: tr.assignments.submission.actions.submit
    }).click();
    await expect(employeePage.getByText(
      tr.assignments.submission.feedback.submitted
    )).toBeVisible();
    await expect(dialog).toHaveCount(0);
    console.log("[e2e] Encrypted evaluation submitted.");

    const reviewerContext = await browser.newContext({
      viewport: { height: 1000, width: 1440 }
    });
    contexts.push(reviewerContext);
    const reviewerPage = await reviewerContext.newPage();
    collectPageErrors(reviewerPage);
    await signIn(reviewerPage, fixture.reviewer);
    await reviewerPage.goto("/#reports");
    const reportSubject = reviewerPage.getByLabel(tr.reports.subjectLabel);
    const subjectOption = reportSubject.locator("option").filter({
      hasText: fixture.subject.displayName
    });
    await expect(subjectOption).toHaveCount(1);
    const subjectValue = await subjectOption.getAttribute("value");

    expect(subjectValue).not.toBeNull();
    await reportSubject.selectOption(subjectValue ?? "");
    const reportCycle = reviewerPage.getByLabel(tr.reports.cycleLabel);
    const cycleOption = reportCycle.locator("option").filter({
      hasText: cycleName
    });
    await expect(cycleOption).toHaveCount(1);
    const targetValue = await cycleOption.getAttribute("value");

    expect(targetValue).not.toBeNull();
    await expect(reportCycle).toHaveValue(targetValue ?? "");
    await expect(reviewerPage.getByRole("heading", {
      name: fixture.subject.displayName
    })).toBeVisible();
    await expect(reviewerPage.getByRole("region", {
      name: tr.reports.summary.sectionLabel
    })).toBeVisible();
    const ratingResult = reviewerPage.locator("article").filter({
      hasText: ratingPrompt
    });
    await expect(ratingResult.getByText("5", { exact: true }).first())
      .toBeVisible();
    await expect(reviewerPage.getByText(
      tr.reports.textComments.forSubjectTitle.replace(
        "{subject}",
        fixture.subject.displayName
      )
    )).toBeVisible();
    await expect(reviewerPage.getByText(rawTextMarker)).toBeVisible();
    await expect(reviewerPage.getByText(
      tr.reports.textComments.contextRisk
    )).toBeVisible();
    await reviewerPage.screenshot({
      fullPage: true,
      path: testInfo.outputPath("reviewer-report-desktop.png")
    });
    await assertResponsiveLayout(
      reviewerPage,
      testInfo,
      "reviewer-report"
    );
    console.log("[e2e] Immediate aggregate report and identity-separated comments verified.");

    const evaluationCycleId = (targetValue ?? "").split(":")[0];

    expect(evaluationCycleId).toBeTruthy();
    expect(await invokeReportAs(
      fixture.admin,
      evaluationCycleId,
      fixture.subject.userId
    )).toBe(403);
    expect(await invokeReportAs(
      fixture.subject,
      evaluationCycleId,
      fixture.subject.userId
    )).toBe(403);

    await adminPage.goto("/#dashboard");
    await expect(adminPage.getByRole("heading", {
      name: tr.reports.title
    })).toHaveCount(0);

    const subjectContext = await browser.newContext({
      viewport: { height: 900, width: 1280 }
    });
    contexts.push(subjectContext);
    const subjectPage = await subjectContext.newPage();
    collectPageErrors(subjectPage);
    await signIn(subjectPage, fixture.subject);
    await subjectPage.goto("/#reports");
    const subjectTargets = subjectPage.getByLabel(tr.reports.subjectLabel);
    await expect(subjectTargets).toBeVisible();
    await expect(subjectTargets.locator("option").filter({
      hasText: fixture.subject.displayName
    })).toHaveCount(0);
    console.log("[e2e] Administrator and self-access denials verified.");

    await assertResponsiveLayout(adminPage, testInfo, "admin-dashboard");
    await assertResponsiveLayout(employeePage, testInfo, "employee-dashboard");
    console.log("[e2e] Mobile overflow checks verified.");
  } finally {
    await Promise.allSettled(contexts.map((context) => context.close()));
  }
});

async function signIn(page: Page, credentials: E2ECredentials): Promise<void> {
  await page.goto("/#login");
  await expect(page.getByRole("heading", { name: tr.auth.signIn.title }))
    .toBeVisible();
  await page.getByLabel(tr.auth.form.emailLabel).fill(credentials.email);
  await page.getByLabel(tr.auth.form.passwordLabel, { exact: true })
    .fill(credentials.password);
  await page.getByRole("button", { name: tr.auth.form.signInButton }).click();
  await expect(page.getByRole("heading", { name: tr.dashboard.title }))
    .toBeVisible();
}

async function assertAdministrationGeometry(
  page: Page,
  hierarchyPanel: ReturnType<Page["getByRole"]>
): Promise<void> {
  const moduleBoxes = await page.getByRole("tab").evaluateAll((tabs) =>
    tabs.map((tab) => {
      const box = tab.getBoundingClientRect();
      return { height: box.height, width: box.width };
    })
  );
  const roundedWidths = new Set(moduleBoxes.map((box) => Math.round(box.width)));
  const roundedHeights = new Set(moduleBoxes.map((box) => Math.round(box.height)));

  expect(roundedWidths.size).toBe(1);
  expect(roundedHeights.size).toBe(1);

  const panelBox = await hierarchyPanel.boundingBox();
  const firstColumnBox = await hierarchyPanel.getByRole("heading", {
    name: tr.administration.hierarchy.units.title
  }).boundingBox();

  expect(panelBox).not.toBeNull();
  expect(firstColumnBox).not.toBeNull();
  expect(Math.abs((firstColumnBox?.x ?? 0) - (panelBox?.x ?? 0)))
    .toBeLessThanOrEqual(1);
}

async function createAndPublishTemplate(
  page: Page,
  input: {
    readonly ratingPrompt: string;
    readonly templateName: string;
    readonly textPrompt: string;
  },
  testInfo: TestInfo
): Promise<void> {
  await page.getByRole("tab", {
    name: tr.administration.modules.templates
  }).click();
  const form = page.locator("form").filter({
    has: page.getByRole("heading", {
      name: tr.administration.templates.form.newTitle
    })
  });

  await expect(form).toBeVisible();
  await form.getByLabel(tr.administration.templates.form.name)
    .fill(input.templateName);
  await form.getByLabel(`${tr.administration.templates.form.prompt} 1`)
    .fill(input.ratingPrompt);
  await form.getByRole("button", {
    name: tr.administration.templates.form.addQuestion
  }).click();
  await form.getByLabel(`${tr.administration.templates.form.prompt} 2`)
    .fill(input.textPrompt);
  const secondQuestionType = form
    .getByLabel(tr.administration.templates.form.questionType)
    .nth(1);
  await secondQuestionType.selectOption("SINGLE_SELECT");
  await form.getByLabel("Seçenek 1").fill("Geliştirilmeli");
  await form.getByLabel("Seçenek 2").fill("İyi");
  await form.getByRole("button", {
    name: tr.administration.templates.form.addOption
  }).click();
  await form.getByLabel("Seçenek 3").fill("Çok iyi");
  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath("template-option-editor-desktop.png")
  });
  await secondQuestionType.selectOption("LONG_TEXT");
  await expect(form.getByLabel("Seçenek 1")).toHaveCount(0);
  await form.getByRole("button", {
    name: tr.administration.templates.form.save
  }).click();
  await expect(page.getByText(tr.administration.templates.feedback.saved))
    .toBeVisible();
  const templateArticle = page.locator("article").filter({
    hasText: input.templateName
  });

  await templateArticle.getByRole("button", {
    name: tr.administration.templates.list.publish
  }).click();
  await expect(page.getByText(
    tr.administration.templates.feedback.published
  )).toBeVisible();
}

async function createProjectAndAssignments(
  page: Page,
  input: {
    readonly cycleName: string;
    readonly inviteeEmail: string;
    readonly inviteeUserId: string;
    readonly projectCode: string;
    readonly projectName: string;
    readonly subjectUserId: string;
    readonly templateName: string;
  }
): Promise<void> {
  await page.getByRole("tab", {
    name: tr.administration.modules.projects
  }).click();
  const form = page.locator("form").filter({
    has: page.getByRole("heading", {
      name: tr.administration.projects.form.title
    })
  });
  const now = new Date();

  await expect(form).toBeVisible();
  await form.getByLabel(tr.administration.projects.form.projectName)
    .fill(input.projectName);
  await form.getByLabel(tr.administration.projects.form.projectCode)
    .fill(input.projectCode);
  await form.getByLabel(tr.administration.projects.form.projectCompletedOn)
    .fill(toDateInputValue(now));
  await form.getByLabel(tr.administration.projects.form.evaluationName)
    .fill(input.cycleName);
  await selectOptionContaining(
    form.getByLabel(tr.administration.projects.form.templateVersion),
    input.templateName
  );
  await form.getByLabel(
    tr.administration.projects.form.projectManagerUserId
  ).selectOption(input.subjectUserId);
  await form.getByLabel(tr.administration.projects.form.opensAt)
    .fill(toDateTimeInputValue(new Date(now.getTime() - 60_000)));
  await form.getByLabel(tr.administration.projects.form.closesAt)
    .fill(toDateTimeInputValue(new Date(now.getTime() + 60 * 60_000)));
  await form.getByRole("button", {
    name: tr.administration.projects.form.submit
  }).click();
  await expect(page.getByText(tr.administration.projects.feedback.created))
    .toBeVisible();
  const projectArticle = page.locator("article").filter({
    hasText: input.projectName
  });

  await projectArticle.getByRole("button", {
    name: `${input.projectName}: ${tr.administration.projects.list.showDetails}`
  }).click();

  await selectOptionContaining(
    projectArticle.getByLabel(tr.administration.projects.members.user),
    input.inviteeEmail
  );
  await expect(projectArticle.getByLabel(
    tr.administration.projects.members.user
  )).toHaveValue(input.inviteeUserId);
  await projectArticle.getByRole("button", {
    name: tr.administration.projects.members.add
  }).click();
  await expect(page.getByText(
    tr.administration.projects.feedback.memberAdded
  )).toBeVisible();
  await projectArticle.getByRole("button", {
    name: tr.administration.projects.assignments.generate
  }).click();
  await expect(page.getByText(
    tr.administration.projects.feedback.assignmentsGenerated
  )).toBeVisible();
}

async function selectOptionContaining(
  select: ReturnType<Page["locator"]>,
  text: string
): Promise<void> {
  const option = select.locator("option").filter({ hasText: text });

  await expect(option).toHaveCount(1);
  const value = await option.getAttribute("value");

  expect(value).not.toBeNull();
  await select.selectOption(value ?? "");
}

async function assertResponsiveLayout(
  page: Page,
  testInfo: TestInfo,
  name: string
): Promise<void> {
  await page.setViewportSize({ height: 844, width: 390 });
  await expect.poll(async () => page.evaluate(() =>
    document.documentElement.scrollWidth
      <= document.documentElement.clientWidth
  )).toBe(true);
  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath(`${name}-mobile.png`)
  });
}

function collectPageErrors(page: Page): void {
  page.on("pageerror", (error) => {
    throw error;
  });
}

function toDateInputValue(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function toDateTimeInputValue(date: Date): string {
  return `${toDateInputValue(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
