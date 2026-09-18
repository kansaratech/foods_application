/* eslint-disable @typescript-eslint/no-empty-object-type */
import { IGlobalComponentProps } from "./global.interface";

export interface IFlashMessageComponentProps extends IGlobalComponentProps {
  message: string;
  // Every call site today reports a failure (invalid login, failed order
  // action, permission denied) — "error" is the sensible default so callers
  // that don't pass this still get a message that reads as an error, not a
  // brand-colored banner indistinguishable from normal chrome.
  type?: "error" | "success" | "info";
}
