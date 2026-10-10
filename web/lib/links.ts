import type { Finding } from "./checks";

export function targetHref(f: Finding): string {
  if (f.kind === "record") return `/records/${f.target}`;
  if (f.kind === "plan") return `/plans/${f.target}`;
  if (f.kind === "report") return `/reports/${f.target}`;
  return `/users/${f.target}`;
}
