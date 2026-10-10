import { UNITS } from "./master";

export type Billing = { code: string; units: number } | null;

function bodyCode(min: number): keyof typeof UNITS | null {
  if (min < 20) return min > 0 ? "身体0" : null;
  if (min < 30) return "身体1";
  if (min < 60) return "身体2";
  if (min < 90) return "身体3";
  return "身体3"; // 90分以上は30分増ごとの加算があるがモックでは扱わない
}

function lifeAddCount(lifeMin: number): number {
  if (lifeMin >= 70) return 3;
  if (lifeMin >= 45) return 2;
  if (lifeMin >= 20) return 1;
  return 0;
}

/**
 * 計画区分の種別（身体 / 生活 / 身体+生活）と実提供時間から算定区分を求める。
 * 運営指導で「記録上の区分」と「実時間から求まる区分」を突き合わせるために使う。
 */
export function classify(planCode: string, minutes: number, bodyMinutes?: number): Billing {
  const hasBody = planCode.startsWith("身体");
  const hasLife = planCode.includes("生活");
  if (!hasBody && hasLife) {
    if (minutes < 20) return null;
    const code = minutes >= 45 ? "生活3" : "生活2";
    return { code, units: UNITS[code] };
  }
  if (hasBody && hasLife) {
    const bm = bodyMinutes ?? 0;
    const b = bodyCode(bm);
    if (!b) return null;
    const add = lifeAddCount(minutes - bm);
    return { code: add > 0 ? `${b}生活${add}` : b, units: UNITS[b] + UNITS.生活加算 * add };
  }
  const b = bodyCode(minutes);
  return b ? { code: b, units: UNITS[b] } : null;
}

export function yenOf(units: number, unitPrice: number): number {
  return Math.floor(units * unitPrice);
}

/** 区分コード（身体2 / 身体1生活2 / 生活3 など）から基本単位数を求める。不明なら null */
export function unitsOfCode(code: string): number | null {
  const b = code.match(/^身体([0-3])(?:生活([1-3]))?$/);
  if (b) return UNITS[`身体${b[1]}` as keyof typeof UNITS] + UNITS.生活加算 * Number(b[2] ?? 0);
  if (code === "生活2" || code === "生活3") return UNITS[code];
  return null;
}
