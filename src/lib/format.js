const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const monthDay = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const fullDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** "3:45 PM" for today, "Yesterday", "Sep 15" this year, else "Sep 15, 2025". */
export function formatDate(timestamp) {
  const date = new Date(timestamp);
  const today = startOfDay(Date.now());
  const day = startOfDay(date);

  if (day === today) return time.format(date);
  if (day === today - 86_400_000) return "Yesterday";
  if (date.getFullYear() === new Date().getFullYear()) return monthDay.format(date);
  return fullDate.format(date);
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const isImage = (type) => typeof type === "string" && type.startsWith("image/");
export const isPdf = (type) => type === "application/pdf";

/** First non-empty line of a note body, used as a preview in lists. */
export function preview(text) {
  const line = (text || "")
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean);
  return line || "No additional text";
}
