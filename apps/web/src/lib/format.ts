export const date = (time: number) =>
  time
    ? new Intl.DateTimeFormat("en", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(time)
    : "Unknown date";
export const folder = (cwd: string) =>
  cwd.split("/").filter(Boolean).slice(-2).join("/") || "Unknown folder";
