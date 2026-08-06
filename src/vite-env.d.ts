/// <reference types="vite/client" />

interface Window {
  readonly __YANKI_CONFIG__?: {
    readonly supabaseUrl?: string;
    readonly supabaseAnonKey?: string;
  };
}
