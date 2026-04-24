/**
 * Open an external URL in the user's default browser.
 *
 * Tauri webviews block plain `<a target="_blank">` for security reasons; this
 * helper goes through the tauri-plugin-shell's `open` command (allowlisted in
 * src-tauri/capabilities/default.json for http/https URLs).
 *
 * Falls back to window.open() in dev (running in a normal browser via vite)
 * so the same code works whether you're in `pnpm dev` or `pnpm tauri dev`.
 */
import { open as tauriOpen } from "@tauri-apps/plugin-shell";

const isTauri =
  typeof window !== "undefined" &&
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Boolean((window as any).__TAURI_INTERNALS__);

export async function openExternal(url: string): Promise<void> {
  if (isTauri) {
    await tauriOpen(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
