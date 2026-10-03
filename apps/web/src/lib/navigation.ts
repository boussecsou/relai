export const mailboxNames = [
  "inbox",
  "sent",
  "drafts",
  "queued",
  "scheduled",
  "sessions",
  "starred",
  "archived",
];
export function readLocation() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const view = params.get("view") || "inbox";
  return {
    view: mailboxNames.includes(view) ? view : "inbox",
    q: params.get("q") || "",
    tool: params.get("agent") || "",
    label: params.get("label") || "",
  };
}
export function writeLocation(
  view: string,
  q: string,
  tool: string,
  label: string,
  push: boolean,
) {
  const params = new URLSearchParams({ view });
  if (q) params.set("q", q);
  if (tool) params.set("agent", tool);
  if (label) params.set("label", label);
  const hash = "#" + params.toString();
  if (window.location.hash !== hash)
    window.history[push ? "pushState" : "replaceState"](null, "", hash);
}
