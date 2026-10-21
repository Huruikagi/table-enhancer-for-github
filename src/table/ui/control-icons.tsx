import type { VNode } from "preact";

export type ControlIconKind =
  | "copy"
  | "expand"
  | "filter"
  | "fit"
  | "freeze"
  | "reset"
  | "select"
  | "show"
  | "wrap";

const CONTROL_ICON_PATHS: Record<ControlIconKind, string> = {
  copy: "M7 6V3h10v10h-3M3 7h10v10H3z",
  expand: "M3 8V3h5M16 8V3h-5M3 12v5h5M16 12v5h-5",
  filter: "M3 4h14l-5.5 6.2V16l-3 1v-6.8z",
  fit: "M7 3H3v4M13 3h4v4M7 17H3v-4M13 17h4v-4M6 10h8",
  freeze:
    "M10 2v16M3.1 6l13.8 8M3.1 14l13.8-8M10 2 8 4m2-2 2 2m-2 14-2-2m2 2 2-2M3.1 6l2.7-.7M3.1 6l.7 2.7M16.9 14l-2.7.7m2.7-.7-.7-2.7M3.1 14l.7-2.7m-.7 2.7 2.7.7M16.9 6l-.7 2.7m.7-2.7-2.7-.7",
  reset: "M4.5 3v3.5H8M4.5 6.5A7 7 0 1 1 3 12",
  select: "M3 3h14v14H3zM6 10l3 3 5-6",
  show: "M2.5 10s3-5 7.5-5 7.5 5 7.5 5-3 5-7.5 5S2.5 10 2.5 10Zm7.5 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  wrap: "M3 5h9.5a4.5 4.5 0 0 1 0 9H8m0 0 3-3m-3 3 3 3M3 9h7",
};

export function ControlIcon({ kind }: { kind: ControlIconKind }): VNode {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20">
      <path d={CONTROL_ICON_PATHS[kind]} />
    </svg>
  );
}
