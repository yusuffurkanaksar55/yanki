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
  const customerName = `Yanki E2E Customer ${fixture.runId}`;
  const customerSlug = `yanki-e2e-customer-${fixture.runId}`;
  const customerAdministratorEmail =
    `e2e-customer-admin-${fixture.runId}@example.test`;
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

    await createPlatformTenant(adminPage, {
      administratorEmail: customerAdministratorEmail,
      administratorName: `E2E Customer Admin ${fixture.runId}`,
      organizationName: customerName,
      organizationSlug: customerSlug
    });
    await assertAdministrationModulesLayout(adminPage, testInfo);
    await adminPage.setViewportSize({ height: 1000, width: 1440 });
    console.log("[e2e] Customer onboarding and every administration module layout verified.");

    await adminPage.getByRole("tab", {
      name: tr.administration.modules.hierarchy
    }).click();
    const hierarchyPanel = adminPage.getByRole("region", {
      name: tr.administration.hierarchy.sectionLabel
    });
    await hierarchyPanel.getByRole("combobox", {
      name: tr.administration.hierarchy.organization,
      exact: true
    }).selectOption(fixture.organizationId);
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

    await invitationPanel.getByRole("combobox", {
      name: tr.administration.users.form.organization,
      exact: true
    }).selectOption(fixture.organizationId);
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
    await employeePage.setViewportSize({ height: 844, width: 390 });
    await assertCurrentPageLayout(employeePage, "assignment inbox mobile");
    await employeePage.getByRole("button", {
      name: tr.assignments.actions.start
    }).click();
    const dialog = employeePage.getByRole("dialog", { name: cycleName });
    await expect(dialog).toBeVisible();
    await assertCurrentPageLayout(employeePage, "evaluation dialog mobile");
    await dialog.getByRole("button", { name: "10", exact: true }).click();
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
    await expect(ratingResult.getByText("10", { exact: true }).first())
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
  const contentInset = (firstColumnBox?.x ?? 0) - (panelBox?.x ?? 0);

  expect(contentInset).toBeGreaterThanOrEqual(23);
  expect(contentInset).toBeLessThanOrEqual(26);
}

async function createPlatformTenant(
  page: Page,
  input: {
    readonly administratorEmail: string;
    readonly administratorName: string;
    readonly organizationName: string;
    readonly organizationSlug: string;
  }
): Promise<void> {
  await page.getByRole("tab", {
    name: tr.administration.modules.tenants
  }).click();
  const panel = page.getByRole("region", {
    name: tr.administration.tenants.sectionLabel
  });

  await expect(panel).toBeVisible();
  await panel.getByLabel(tr.administration.tenants.form.organizationName)
    .fill(input.organizationName);
  await expect(panel.getByLabel(
    tr.administration.tenants.form.organizationSlug
  )).toHaveValue(input.organizationSlug);
  await panel.getByLabel(tr.administration.tenants.form.administratorName)
    .fill(input.administratorName);
  await panel.getByLabel(tr.administration.tenants.form.administratorEmail)
    .fill(input.administratorEmail);
  await panel.getByRole("button", {
    name: tr.administration.tenants.form.submit
  }).click();

  await expect(page.getByText(tr.administration.tenants.feedback.created))
    .toBeVisible();
  await expect(panel.getByText(input.organizationName)).toBeVisible();
  await expect(panel.getByText(input.administratorEmail)).toBeVisible();
}

async function assertAdministrationModulesLayout(
  page: Page,
  testInfo: TestInfo
): Promise<void> {
  const modules = [
    {
      id: "tenants",
      label: tr.administration.modules.tenants,
      loadingText: tr.administration.tenants.loading
    },
    {
      id: "projects",
      label: tr.administration.modules.projects,
      loadingText: tr.administration.projects.list.loading
    },
    {
      id: "users",
      label: tr.administration.modules.users,
      loadingText: tr.administration.users.loading
    },
    {
      id: "hierarchy",
      label: tr.administration.modules.hierarchy,
      loadingText: tr.administration.hierarchy.loading
    },
    {
      id: "templates",
      label: tr.administration.modules.templates,
      loadingText: tr.administration.templates.loading
    },
    {
      id: "security",
      label: tr.administration.modules.security,
      loadingText: tr.administration.securityOperations.refreshing
    },
    {
      id: "retention",
      label: tr.administration.modules.retention,
      loadingText: tr.administration.retention.loading
    }
  ] as const;

  for (const module of modules) {
    await page.setViewportSize({ height: 1000, width: 1440 });
    const tab = page.getByRole("tab", { name: module.label });

    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText(module.loadingText, { exact: true }))
      .toHaveCount(0);
    await page.waitForTimeout(50);
    await assertCurrentPageLayout(page, `${module.id} desktop`);
    await page.screenshot({
      path: testInfo.outputPath(`admin-${module.id}-desktop.png`)
    });

    await page.setViewportSize({ height: 900, width: 1024 });
    await assertCurrentPageLayout(page, `${module.id} intermediate`);

    await page.setViewportSize({ height: 844, width: 390 });
    await assertCurrentPageLayout(page, `${module.id} mobile`);
    await page.screenshot({
      path: testInfo.outputPath(`admin-${module.id}-mobile.png`)
    });
  }
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
  await form.getByLabel(tr.administration.templates.form.questionType).first()
    .selectOption("RATING_1_TO_10");
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
  await page.setViewportSize({ height: 900, width: 1024 });
  await assertCurrentPageLayout(page, `${name} intermediate`);
  await page.setViewportSize({ height: 844, width: 390 });
  await assertCurrentPageLayout(page, `${name} mobile`);
  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath(`${name}-mobile.png`)
  });
}

async function assertCurrentPageLayout(page: Page, name: string): Promise<void> {
  await expect.poll(async () => page.evaluate(() =>
    document.documentElement.scrollWidth
      <= document.documentElement.clientWidth
  ), { message: `${name} has horizontal page overflow.` }).toBe(true);

  const clippedControls = await page.locator(
    "a, button, input, select, textarea"
  ).evaluateAll((elements) => {
    const viewportWidth = document.documentElement.clientWidth;

    return elements.flatMap((element) => {
      const box = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const isVisible = box.width > 0
        && box.height > 0
        && style.display !== "none"
        && style.visibility !== "hidden";

      if (
        !isVisible
        || (box.left >= -1 && box.right <= viewportWidth + 1)
      ) {
        return [];
      }

      return [{
        label: element.getAttribute("aria-label")
          ?? element.textContent?.trim().slice(0, 80)
          ?? element.tagName,
        left: Math.round(box.left),
        right: Math.round(box.right),
        tag: element.tagName,
        viewportWidth
      }];
    });
  });

  expect(clippedControls, `${name} has clipped interactive controls.`)
    .toEqual([]);
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
