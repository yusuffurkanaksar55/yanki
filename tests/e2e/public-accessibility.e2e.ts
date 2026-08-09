import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { tr } from "../../src/locales/tr/messages";

const wcagTags = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa"
];

test("public and authentication surfaces pass automated WCAG checks", async ({
  page
}, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", {
    level: 1,
    name: tr.app.name
  })).toBeVisible();
  await assertNoWcagViolations(page, testInfo, "public-desktop");

  await page.setViewportSize({ height: 844, width: 390 });
  await page.getByRole("button", {
    name: tr.marketing.navigation.openMenu
  }).click();
  await expect(page.getByRole("navigation", {
    name: tr.marketing.navigation.mobileAriaLabel
  })).toBeVisible();
  await assertNoWcagViolations(page, testInfo, "public-mobile-menu");

  await page.goto("/#login");
  await expect(page.getByRole("heading", {
    name: tr.auth.signIn.title
  })).toBeVisible();
  await assertNoWcagViolations(page, testInfo, "authentication-mobile");
});

test("primary public and sign-in workflows are keyboard operable", async ({
  page
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/");

  const publicHome = page.getByRole("link", {
    name: tr.marketing.navigation.home
  });
  const menuButton = page.getByRole("button", {
    name: tr.marketing.navigation.openMenu
  });

  await page.keyboard.press("Tab");
  await expect(publicHome).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(menuButton).toBeFocused();
  await page.keyboard.press("Enter");
  const closeMenuButton = page.getByRole("button", {
    name: tr.marketing.navigation.closeMenu
  });

  await expect(closeMenuButton).toHaveAttribute("aria-expanded", "true");
  await expect(closeMenuButton).toBeFocused();

  const mobileNavigation = page.getByRole("navigation", {
    name: tr.marketing.navigation.mobileAriaLabel
  });
  const howItWorks = mobileNavigation.getByRole("link", {
    name: tr.marketing.navigation.howItWorks
  });
  const signIn = mobileNavigation.getByRole("link", {
    name: tr.marketing.navigation.signIn
  });

  await page.keyboard.press("Tab");
  await expect(howItWorks).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(signIn).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", {
    name: tr.auth.signIn.title
  })).toBeVisible();
  const authHome = page.getByRole("link", {
    name: tr.marketing.navigation.home
  });
  const backToSite = page.getByRole("link", { name: tr.auth.backToSite });
  const email = page.getByLabel(tr.auth.form.emailLabel);
  const password = page.getByLabel(tr.auth.form.passwordLabel, { exact: true });
  const showPassword = page.getByRole("button", {
    name: tr.auth.form.showPassword
  });
  const submit = page.getByRole("button", {
    name: tr.auth.form.signInButton
  });

  await page.keyboard.press("Tab");
  await expect(authHome).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(backToSite).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(email).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(password).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(showPassword).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(password).toHaveAttribute("type", "text");
  await page.keyboard.press("Tab");
  await expect(submit).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toBeVisible();
});

async function assertNoWcagViolations(
  page: Page,
  testInfo: TestInfo,
  name: string
): Promise<void> {
  const result = await new AxeBuilder({ page })
    .withTags(wcagTags)
    .analyze();

  if (result.violations.length > 0) {
    await testInfo.attach(`${name}-axe.json`, {
      body: JSON.stringify(result.violations, null, 2),
      contentType: "application/json"
    });
  }

  expect(result.violations).toEqual([]);
}
