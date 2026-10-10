/**
 * 実地調査（運営指導）準備用のモックデータ。
 * 利用者・職員・被保険者番号・記録内容はすべて架空。
 */
import { classify } from "./billing";
import { fromMin, toMin, weekdayOf, ymd } from "./format";
import { LEAVE_ITEMS, BODY_ITEMS, LIFE_ITEMS } from "./master";
import type { CareRecord, CareUser, HistoryEntry, Staff } from "./types";

export const STAFF: Staff[] = [
  { id: "S01", name: "中村 真理", qualification: "介護福祉士", role: "サービス提供責任者" },
  { id: "S02", name: "小林 恵", qualification: "初任者研修", role: "訪問介護員" },
  { id: "S03", name: "加藤 健", qualification: "介護福祉士", role: "訪問介護員" },
  { id: "S04", name: "伊藤 由美", qualification: "実務者研修", role: "訪問介護員" },
  { id: "S05", name: "渡辺 翔", qualification: "初任者研修", role: "訪問介護員" },
];

export const USERS: CareUser[] = [
  {
    id: "U001", name: "山田 花子", kana: "ヤマダ ハナコ", sex: "女", age: 84, careLevel: "要介護2",
    insuredNo: "0000000001", careManager: "いいかいご居宅介護支援 担当A",
    plan: [
      { weekday: "月", code: "身体1生活1", start: "09:00", minutes: 60 },
      { weekday: "水", code: "身体2", start: "09:00", minutes: 45 },
      { weekday: "金", code: "身体1生活1", start: "09:00", minutes: 60 },
    ],
    note: "独居。右膝OA。入浴は見守り〜一部介助。", planCreated: "2026-09-20", planAgreed: "2026-09-25",
  },
  {
    id: "U002", name: "佐藤 一郎", kana: "サトウ イチロウ", sex: "男", age: 79, careLevel: "要介護3",
    insuredNo: "0000000002", careManager: "いいかいご居宅介護支援 担当B",
    plan: (["月", "火", "木", "土"] as const).map((w) => ({ weekday: w, code: "身体2", start: "10:30", minutes: 50 })),
    note: "脳梗塞後遺症（左片麻痺）。妻と二人暮らし。", planCreated: "2026-08-28", planAgreed: "2026-09-01",
  },
  {
    id: "U003", name: "鈴木 和子", kana: "スズキ カズコ", sex: "女", age: 88, careLevel: "要介護1",
    insuredNo: "0000000003", careManager: "いいかいご居宅介護支援 担当A",
    plan: [
      { weekday: "火", code: "生活3", start: "14:00", minutes: 60 },
      { weekday: "金", code: "生活3", start: "14:00", minutes: 60 },
    ],
    note: "独居。軽度認知症。買物・調理援助中心。", planCreated: "2026-07-15", planAgreed: "2026-07-18",
  },
  {
    id: "U004", name: "高橋 進", kana: "タカハシ ススム", sex: "男", age: 91, careLevel: "要介護4",
    insuredNo: "0000000004", careManager: "いいかいご居宅介護支援 担当C",
    plan: (["月", "水", "金"] as const).flatMap((w) => [
      { weekday: w, code: "身体1", start: "07:30", minutes: 25 },
      { weekday: w, code: "身体1", start: "17:30", minutes: 25 },
    ]),
    note: "ほぼ臥床。長男同居（日中不在）。おむつ交換・体位変換。", planCreated: "2026-09-10", planAgreed: "2026-09-12",
  },
  {
    id: "U005", name: "田中 美代子", kana: "タナカ ミヨコ", sex: "女", age: 76, careLevel: "要介護1",
    insuredNo: "0000000005", careManager: "いいかいご居宅介護支援 担当D",
    plan: [{ weekday: "木", code: "生活2", start: "13:00", minutes: 45 }],
    note: "独居。腰椎圧迫骨折後。掃除・洗濯援助。", planCreated: "2026-06-01", planAgreed: "2026-06-03",
  },
];

type Note = { text: string; body: string[]; life: string[]; when?: "am" | "pm"; report?: string; condition?: string };

const NOTES: Record<string, Note[]> = {
  U001: [
    { text: "入浴前の体調確認問題なし。浴槽の出入りは手すり使用し見守り。洗身は背中のみ介助、他はご自身で実施。", body: ["入浴介助", "自立支援見守り"], life: ["掃除"] },
    { text: "右膝の痛み訴えあり（安静時はなし）。入浴は中止し部分浴（足浴）に変更、本人了承。サ責へ報告済み。", body: ["部分浴（足浴）"], life: ["洗濯"], report: "サービス提供責任者", condition: "要観察" },
    { text: "居室・トイレ掃除実施。洗濯物はご本人と一緒に干す（自立支援）。服薬カレンダー確認、昼分残なし。", body: ["服薬確認", "自立支援見守り"], life: ["掃除", "洗濯"] },
    { text: "入浴介助（洗身一部介助）。浴後に保湿剤塗布、皮膚状態良好。服薬確認、朝分残なし。", body: ["入浴介助", "服薬確認"], life: [] },
    { text: "顔色良好。デイの話を楽しそうにされる。入浴後の更衣はボタンのみ介助、整髪はご自身で。", body: ["入浴介助", "更衣介助", "整容"], life: [] },
  ],
  U002: [
    { text: "ベッドから車椅子へ移乗介助。左側に注意。トイレにて排泄介助、排尿あり・排便なし。", body: ["移乗介助", "排泄介助"], life: [] },
    { text: "自宅浴槽にてシャワーチェア使用し洗身介助。皮膚トラブルなし。奥様へ様子を伝達。", body: ["入浴介助", "更衣介助"], life: [], report: "家族" },
    { text: "排泄介助時、仙骨部に軽度発赤あり（約2cm）。奥様と共有し、サ責・ケアマネへ報告。", body: ["排泄介助", "移乗介助"], life: [], report: "サービス提供責任者・介護支援専門員・家族", condition: "要観察" },
    { text: "服薬確認済み。立位保持30秒可能、更衣時も手すりにつかまり協力あり。転倒なし。", body: ["服薬確認", "更衣介助"], life: [] },
  ],
  U003: [
    { text: "本人と献立相談のうえ近隣スーパーへ買物（預り金3,000円、レシート・釣銭確認済、出納帳記入）。", body: [], life: ["買物"] },
    { text: "煮物・味噌汁を調理し冷蔵保存。賞味期限切れの食品を本人了承のうえ処分。", body: [], life: ["調理"] },
    { text: "同じ話の繰り返しあるが穏やか。冷蔵庫内に同じ食品の重複購入あり、ケアマネへ情報提供。", body: [], life: ["調理", "配膳・下膳"], report: "介護支援専門員" },
    { text: "台所・居室の掃除。配膳し昼食摂取を確認（主食7割・副食全量）。", body: [], life: ["掃除", "配膳・下膳"] },
  ],
  U004: [
    { text: "おむつ交換（尿多量・便なし）。陰部洗浄実施。体位変換（右側臥位）。皮膚異常なし。", body: ["おむつ交換", "体位変換"], life: [] },
    { text: "朝食全介助、ミキサー食8割摂取。むせ込みなし。朝分の服薬介助、口腔内残留なし。", body: ["食事介助", "服薬確認"], life: [], when: "am" },
    { text: "全身清拭・更衣。背部・踵部に発赤なし。体位変換（左側臥位）。長男へ連絡ノート記入。", body: ["清拭", "体位変換"], life: [], report: "家族" },
    { text: "夕方訪問時、傾眠傾向強い。体温平熱、呼吸状態安定。おむつ交換実施。長男へ電話で報告、様子観察。", body: ["おむつ交換"], life: [], when: "pm", report: "家族・サービス提供責任者", condition: "要観察" },
  ],
  U005: [
    { text: "居室・浴室掃除。ご本人は椅子に座り洗濯物たたみを実施（自立支援）。腰痛の訴えなし。", body: [], life: ["掃除", "洗濯"] },
    { text: "洗濯・干し。ゴミ出し（可燃）。粗大ゴミ申込みの相談あり、ケアマネへ伝達。", body: [], life: ["洗濯", "ゴミ出し"], report: "介護支援専門員" },
    { text: "掃除機がけ・拭き掃除。歩行は杖使用で安定。表情明るい。", body: [], life: ["掃除"] },
  ],
};

const MENU: Record<string, { body: string[]; life: string[] }> = {
  U001: { body: ["入浴介助", "更衣介助", "整容", "服薬確認", "自立支援見守り"], life: ["掃除", "洗濯"] },
  U002: { body: ["排泄介助", "入浴介助", "移乗介助", "更衣介助", "服薬確認"], life: [] },
  U003: { body: [], life: ["買物", "調理", "配膳・下膳", "掃除"] },
  U004: { body: ["おむつ交換", "体位変換", "清拭", "食事介助", "服薬確認"], life: [] },
  U005: { body: [], life: ["掃除", "洗濯", "ゴミ出し"] },
};

/** 再現性のある乱数（mulberry32） */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PERIOD = { from: "2026-10-01", to: "2026-10-31" };

export function generateRecords(): CareRecord[] {
  const rand = rng(20261010);
  const pick = <T,>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  const sample = <T,>(xs: T[], k: number): T[] => {
    const a = [...xs];
    const out: T[] = [];
    while (out.length < k && a.length) out.push(a.splice(Math.floor(rand() * a.length), 1)[0]);
    return out;
  };

  const records: CareRecord[] = [];
  let seq = 1;
  const d = new Date(2026, 9, 1);
  const end = new Date(2026, 9, 31);
  for (; d <= end; d.setDate(d.getDate() + 1)) {
    const date = ymd(d);
    const wd = weekdayOf(date);
    for (const [ui, u] of USERS.entries()) {
      for (const p of u.plan.filter((x) => x.weekday === wd)) {
        const drift = pick([0, 0, 0, 2, -2, 3]);
        const startMin = toMin(p.start) + drift;
        let minutes: number;
        if (p.code === "生活2") minutes = pick([40, 42, 44]);
        else if (p.minutes <= 30) minutes = pick([25, 26, 28, 29]);
        else minutes = p.minutes + pick([0, 0, 1, 2, -1]);
        const hasLife = p.code.includes("生活");
        const bodyMinutes = p.code.startsWith("身体") && hasLife ? pick([25, 26, 27]) : undefined;
        const bill = classify(p.code, minutes, bodyMinutes)!;

        const ampm = startMin < 12 * 60 ? "am" : "pm";
        const cand = NOTES[u.id].filter(
          (n) => (!n.when || n.when === ampm) && (hasLife ? n.life.length > 0 || n.body.length === 0 : n.life.length === 0),
        );
        const note = pick(cand);
        const menu = MENU[u.id];
        const extraB = menu.body.filter((i) => !note.body.includes(i));
        const extraL = hasLife ? menu.life.filter((i) => !note.life.includes(i)) : [];
        const body = [...new Set([...note.body, ...sample(extraB, int(0, 2))])].sort((a, b) => BODY_ITEMS.indexOf(a) - BODY_ITEMS.indexOf(b));
        const life = [...new Set([...note.life, ...sample(extraL, int(0, 1))])].sort((a, b) => LIFE_ITEMS.indexOf(a) - LIFE_ITEMS.indexOf(b));
        const staff = u.id === "U001" ? STAFF[d.getDate() % 2 ? 0 : 1] : STAFF[(ui + d.getDate()) % STAFF.length];

        const endStr = fromMin(startMin + minutes);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        records.push({
          no: `T${String(seq++).padStart(4, "0")}`,
          date,
          userId: u.id,
          planCode: p.code,
          start: fromMin(startMin),
          end: endStr,
          minutes,
          bodyMinutes,
          billingCode: bill.code,
          units: bill.units,
          body,
          life,
          staffId: staff.id,
          helpers: 1,
          vitals: { temp: Math.round((36 + rand() * 0.9) * 10) / 10, bp: `${int(112, 148)}/${int(62, 88)}`, pulse: int(62, 86) },
          condition: note.condition ?? "良好",
          meal: ["U003", "U004"].includes(u.id) ? pick(["全量", "8割", "7割"]) : "―",
          excretion: ["U002", "U004"].includes(u.id) ? pick(["尿○ 便×", "尿○ 便○", "尿○ 便×"]) : "―",
          note: note.text,
          reported: !!note.report,
          reportTo: note.report ?? "",
          leaveCheck: [...LEAVE_ITEMS],
          userConfirmed: true,
          confirmedAt: `${date}T${endStr}`,
          supervisorCheckedBy: "S01",
          supervisorCheckedAt: `${ymd(next)}T09:${String(int(10, 50)).padStart(2, "0")}`,
          createdAt: `${date}T${fromMin(startMin + minutes + int(5, 40))}`,
          history: [],
        });
      }
    }
  }

  // 監査証跡のサンプル: 記載誤りを理由付きで訂正した記録
  const fix = (no: string, h: HistoryEntry) => records.find((r) => r.no === no)?.history.push(h);
  fix("T0012", { at: "2026-10-06T09:35", by: "S01", field: "終了時刻", before: "11:50", after: "11:20", reason: "記入時の誤記。ヘルパー本人と利用者宅の連絡ノートで実時間を確認のうえ訂正" });
  fix("T0027", { at: "2026-10-13T10:02", by: "S01", field: "排泄", before: "尿○ 便○", after: "尿○ 便×", reason: "ヘルパーへの聞き取りで記載誤りを確認" });
  fix("T0045", { at: "2026-10-21T16:20", by: "S04", field: "特記事項", before: "様子変わりなし。", after: "", reason: "具体的な状態の記載が不足していたため、サ責の指導により追記" });
  const t45 = records.find((r) => r.no === "T0045");
  if (t45) t45.history[0].after = t45.note;
  return records;
}
