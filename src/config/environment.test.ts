import { describe, expect, it } from "vitest";
import {
  EnvironmentConfigurationError,
  readPublicEnvironment
} from "./environment";

describe("readPublicEnvironment", () => {
  it("returns normalized public Supabase environment values", () => {
    expect(
      readPublicEnvironment({
        VITE_SUPABASE_URL: " https://example.supabase.co ",
        VITE_SUPABASE_ANON_KEY: " public-anon-key "
      })
    ).toEqual({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "public-anon-key"
    });
  });

  it("rejects missing public Supabase URL", () => {
    expect(() =>
      readPublicEnvironment({
        VITE_SUPABASE_ANON_KEY: "public-anon-key"
      })
    ).toThrow(EnvironmentConfigurationError);
  });

  it("rejects invalid public Supabase URL", () => {
    expect(() =>
      readPublicEnvironment({
        VITE_SUPABASE_URL: "not-a-url",
        VITE_SUPABASE_ANON_KEY: "public-anon-key"
      })
    ).toThrow(EnvironmentConfigurationError);
  });

  it("prefers a complete runtime configuration over build-time values", () => {
    expect(
      readPublicEnvironment(
        {
          VITE_SUPABASE_URL: "https://build.example.com",
          VITE_SUPABASE_ANON_KEY: "build-key"
        },
        {
          supabaseUrl: " https://customer.example.com ",
          supabaseAnonKey: " customer-public-key "
        }
      )
    ).toEqual({
      supabaseUrl: "https://customer.example.com",
      supabaseAnonKey: "customer-public-key"
    });
  });

  it("rejects a partial runtime configuration instead of mixing environments", () => {
    expect(() =>
      readPublicEnvironment(
        {
          VITE_SUPABASE_URL: "https://build.example.com",
          VITE_SUPABASE_ANON_KEY: "build-key"
        },
        {
          supabaseUrl: "https://customer.example.com"
        }
      )
    ).toThrow(EnvironmentConfigurationError);
  });
});
