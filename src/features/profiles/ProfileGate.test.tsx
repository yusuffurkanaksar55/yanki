import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { tr } from "../../locales/tr/messages";
import { ProfileGate } from "./ProfileGate";
import {
  ProfileServiceError,
  type ProfileService,
  type UserProfile
} from "./profileService";

describe("ProfileGate", () => {
  it("renders children when the profile is active", async () => {
    renderProfileGate(createProfileServiceStub(createProfileStub()));

    expect(await screen.findByText("Ready")).toBeInTheDocument();
  });

  it("blocks access when the profile is invited but not active", async () => {
    renderProfileGate(
      createProfileServiceStub(
        createProfileStub({ onboarding_status: "INVITED" })
      )
    );

    expect(
      await screen.findByRole("heading", { name: tr.profile.inactive.title })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: tr.profile.inactive.acceptInvitation
      })
    ).toBeInTheDocument();
  });

  it("accepts an invitation through the profile service", async () => {
    const user = userEvent.setup();
    const service = createProfileServiceStub(
      createProfileStub({ onboarding_status: "INVITED" })
    );

    renderProfileGate(service);

    await user.click(
      await screen.findByRole("button", {
        name: tr.profile.inactive.acceptInvitation
      })
    );

    expect(service.acceptOwnInvitation).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Ready")).toBeInTheDocument();
  });

  it("shows a safe error when the profile cannot be read", async () => {
    renderProfileGate(
      createProfileServiceStub(
        new ProfileServiceError("PROFILE_READ_FAILED")
      )
    );

    expect(
      await screen.findByRole("heading", { name: tr.profile.blocked.title })
    ).toBeInTheDocument();
    expect(screen.getByText(tr.profile.feedback.PROFILE_READ_FAILED)).toBeInTheDocument();
  });
});

function renderProfileGate(service: ProfileService) {
  render(
    <ProfileGate
      service={service}
      userEmail="person@example.com"
      userId="user-id"
    >
      {() => <p>Ready</p>}
    </ProfileGate>
  );
}

function createProfileServiceStub(
  result: UserProfile | ProfileServiceError | null
): ProfileService {
  return {
    acceptOwnInvitation: vi.fn(async () => createProfileStub()),
    getOwnProfile: vi.fn(async () => {
      if (result instanceof ProfileServiceError) {
        throw result;
      }

      return result;
    })
  };
}

function createProfileStub(
  overrides: Partial<UserProfile> = {}
): UserProfile {
  return {
    user_id: "user-id",
    email: "person@example.com",
    display_name: "Person Example",
    onboarding_status: "ACTIVE",
    ...overrides
  };
}
