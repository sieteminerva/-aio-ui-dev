/**
 * The one placeholder block a route shows when it has nothing else to show.
 *
 * Loading, empty and error share one markup so the page does not jump when the data
 * arrives, and so "nothing happened" is never a blank screen. A route swaps the whole
 * block out — it never stacks two.
 */
import { node } from "./dom";

export type StateKind = "loading" | "empty" | "error";

export interface iStateOptions {
  /** One short line: what is happening right now. */
  title: string;
  /** Optional second line: what to do, or what went wrong. */
  detail?: string;
}

export function stateBlock(kind: StateKind, { title, detail }: iStateOptions): HTMLElement {
  const block = node("div", `state state-${kind}`);
  block.setAttribute("role", kind === "error" ? "alert" : "status");
  if (kind === "loading") block.append(node("span", "state-spinner"));
  block.append(node("p", "state-title", title));
  if (detail) block.append(node("p", "state-detail", detail));
  return block;
}
