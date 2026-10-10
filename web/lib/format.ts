import { WEEKDAYS } from "./master";
import type { Weekday } from "./types";

export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function fromMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function parseDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function weekdayOf(date: string): Weekday {
  return WEEKDAYS[parseDate(date).getDay()];
}

export function jpDate(date: string): string {
  const d = parseDate(date);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdayOf(date)}）`;
}

export function slashDate(date: string): string {
  return date.replaceAll("-", "/");
}

export function yen(n: number): string {
  return n.toLocaleString("ja-JP");
}

export function dateTime(iso: string): string {
  return iso.replace("T", " ").slice(0, 16).replaceAll("-", "/");
}

/** 日本時間の YYYY-MM-DDTHH:MM（端末のタイムゾーン設定に左右されない） */
export function localIso(d = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .format(d)
    .replace(" ", "T");
}
