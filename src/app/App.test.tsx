import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { tr } from "../locales/tr/messages";

describe("App", () => {
  it("renders the Turkish dashboard shell from centralized messages", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: tr.dashboard.title })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: tr.navigation.primaryAriaLabel })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: tr.dashboard.actions.newCycle })
    ).toBeInTheDocument();
    expect(screen.getByText(tr.dashboard.privacy.threshold)).toBeInTheDocument();
  });
});
