/**
 * 実地調査（運営指導）準備用のモックデータ。
 * 利用者・職員・被保険者番号・記録内容はすべて架空。
 */
import { classify } from "./billing";
import { fromMin, toMin, weekdayOf, ymd } from "./format";
import { LEAVE_ITEMS, BODY_ITEMS, LIFE_ITEMS, OFFICE } from "./master";
import { draftReport } from "./report";
import type { CarePlan, CareRecord, CareReport, CareUser, Dataset, GoalRating, PlanService, Staff, Weekday } from "./types";

export const STAFF: Staff[] = [
  { id: "S01", name: "中村 真理", qualification: "介護福祉士", role: "サービス提供責任者" },
  { id: "S02", name: "小林 恵", qualification: "初任者研修", role: "訪問介護員" },
  { id: "S03", name: "加藤 健", qualification: "介護福祉士", role: "訪問介護員" },
  { id: "S04", name: "伊藤 由美", qualification: "実務者研修", role: "訪問介護員" },
  { id: "S05", name: "渡辺 翔", qualification: "初任者研修", role: "訪問介護員" },
];

export const USERS: CareUser[] = [
  {
    id: "U001", name: "山田 花子", kana: "ヤマダ ハナコ", sex: "女", birthDate: "1942-05-12", careLevel: "要介護2",
    certFrom: "2026-04-01", certTo: "2027-03-31", insuredNo: "0000000001", insurerNo: "27XXXX", burden: "1割",
    cmOffice: "いいかいご居宅介護支援", careManager: "担当A", contractDate: "2025-04-01", note: "独居。右膝OA。入浴は見守り〜一部介助。",
  },
  {
    id: "U002", name: "佐藤 一郎", kana: "サトウ イチロウ", sex: "男", birthDate: "1947-01-23", careLevel: "要介護3",
    certFrom: "2026-02-01", certTo: "2027-01-31", insuredNo: "0000000002", insurerNo: "27XXXX", burden: "1割",
    cmOffice: "いいかいご居宅介護支援", careManager: "担当B", contractDate: "2024-08-20", note: "脳梗塞後遺症（左片麻痺）。妻と二人暮らし。",
  },
  {
    id: "U003", name: "鈴木 和子", kana: "スズキ カズコ", sex: "女", birthDate: "1938-09-02", careLevel: "要介護1",
    certFrom: "2025-12-01", certTo: "2026-11-30", insuredNo: "0000000003", insurerNo: "27XXXX", burden: "2割",
    cmOffice: "いいかいご居宅介護支援", careManager: "担当A", contractDate: "2025-07-10", note: "独居。軽度認知症。買物・調理援助中心。",
  },
  {
    id: "U004", name: "高橋 進", kana: "タカハシ ススム", sex: "男", birthDate: "1935-03-30", careLevel: "要介護4",
    certFrom: "2026-03-01", certTo: "2027-02-28", insuredNo: "0000000004", insurerNo: "27XXXX", burden: "1割",
    cmOffice: "いいかいご居宅介護支援", careManager: "担当C", contractDate: "2025-11-01", note: "ほぼ臥床。長男同居（日中不在）。おむつ交換・体位変換。",
  },
  {
    id: "U005", name: "田中 美代子", kana: "タナカ ミヨコ", sex: "女", birthDate: "1950-11-15", careLevel: "要介護1",
    certFrom: "2026-06-01", certTo: "2027-05-31", insuredNo: "0000000005", insurerNo: "27XXXX", burden: "1割",
    cmOffice: "いいかいご居宅介護支援", careManager: "担当D", contractDate: "2026-05-25", note: "独居。腰椎圧迫骨折後。掃除・洗濯援助。",
  },
];

const svc = (weekday: Weekday, start: string, minutes: number, code: string, content: string, caution: string, bodyMinutes?: number): PlanService =>
  ({ weekday, start, minutes, code, content, caution, bodyMinutes });

export const PLANS: CarePlan[] = [
  {
    id: "P-U001-1", userId: "U001", createdAt: "2026-03-20", createdBy: "中村 真理", carePlanDate: "2026-03-18",
    agreedAt: "2026-03-25", deliveredAt: "2026-03-25", periodFrom: "2026-04-01", periodTo: "2026-09-30",
    wish: "本人：できるだけ自分でお風呂に入り、今の家で暮らし続けたい。",
    longGoal: "膝の痛みと付き合いながら、在宅で清潔な生活を続けられる。",
    shortGoals: ["見守りのもとで安全に入浴できる。", "掃除・洗濯の一部をヘルパーと一緒に行える。"],
    services: [
      svc("月", "09:00", 60, "身体1生活1", "入浴の見守り・一部介助（背部洗身）、更衣介助、居室掃除・洗濯", "浴槽出入りは手すり使用。膝の痛み訴え時は足浴に変更しサ責へ報告。", 25),
      svc("水", "09:00", 45, "身体2", "入浴の見守り・一部介助、更衣介助、服薬確認", "入浴前に体調確認（体温・血圧）。"),
      svc("金", "09:00", 60, "身体1生活1", "入浴の見守り・一部介助、居室掃除・洗濯（本人と一緒に）", "自立支援のため洗濯物干しは本人と共同で実施。", 25),
    ],
  },
  {
    id: "P-U001-2", userId: "U001", createdAt: "2026-09-22", createdBy: "中村 真理", carePlanDate: "2026-09-19",
    agreedAt: "2026-09-26", deliveredAt: "2026-09-26", periodFrom: "2026-10-01", periodTo: "2027-03-31",
    wish: "本人：できるだけ自分でお風呂に入り、今の家で暮らし続けたい。",
    longGoal: "膝の痛みと付き合いながら、在宅で清潔な生活を続けられる。",
    shortGoals: ["見守りのもとで安全に入浴できる。", "洗濯物干しを自分で行える。"],
    services: [
      svc("月", "09:00", 60, "身体1生活1", "入浴の見守り・一部介助、更衣介助、居室掃除・洗濯", "膝の痛み訴え時は足浴に変更しサ責へ報告。", 25),
      svc("水", "09:00", 45, "身体2", "入浴の見守り・一部介助、更衣介助、服薬確認", "入浴前に体調確認。"),
      svc("金", "09:00", 60, "身体1生活1", "入浴の見守り・一部介助、居室掃除・洗濯", "洗濯物干しは本人主体で見守り。", 25),
    ],
  },
  {
    id: "P-U002-1", userId: "U002", createdAt: "2026-07-25", createdBy: "中村 真理", carePlanDate: "2026-07-22",
    agreedAt: "2026-07-30", deliveredAt: "2026-07-30", periodFrom: "2026-08-01", periodTo: "2027-01-31",
    wish: "本人：トイレは自分で行きたい。妻：介護の負担を減らしたい。",
    longGoal: "安全に移乗・排泄ができ、夫婦で在宅生活を続けられる。",
    shortGoals: ["車椅子への移乗を介助のもとで安全に行える。", "週2回以上入浴し、皮膚トラブルを防ぐ。"],
    services: (["月", "火", "木", "土"] as const).map((w) =>
      svc(w, "10:30", 50, "身体2", "移乗介助、排泄介助、入浴介助（シャワーチェア使用）、更衣介助、服薬確認", "左片麻痺のため左側からの介助。仙骨部の皮膚状態を毎回確認。"),
    ),
  },
  {
    id: "P-U003-1", userId: "U003", createdAt: "2026-07-15", createdBy: "中村 真理", carePlanDate: "2026-07-12",
    agreedAt: "2026-07-18", deliveredAt: "2026-07-18", periodFrom: "2026-08-01", periodTo: "2027-01-31",
    wish: "本人：自分の家で好きなものを食べて暮らしたい。",
    longGoal: "栄養バランスのとれた食事を続け、独居生活を維持できる。",
    shortGoals: ["週2回、本人と献立を相談して買物・調理ができる。", "冷蔵庫内の食品管理ができる。"],
    services: [
      svc("火", "14:00", 60, "生活3", "買物（本人と献立相談）、調理、配膳、台所・居室の掃除", "預り金は出納帳に記入しレシートを保管。重複購入に注意。"),
      svc("金", "14:00", 60, "生活3", "買物、調理、配膳、台所・居室の掃除", "賞味期限切れ食品は本人了承のうえ処分。"),
    ],
  },
  {
    id: "P-U004-1", userId: "U004", createdAt: "2026-09-10", createdBy: "中村 真理", carePlanDate: "2026-09-08",
    agreedAt: "2026-09-12", deliveredAt: "2026-09-12", periodFrom: "2026-09-13", periodTo: "2027-02-28",
    wish: "長男：日中仕事で不在のため、朝夕の排泄と食事の介助をお願いしたい。",
    longGoal: "褥瘡を作らず、清潔で安楽に在宅生活を送れる。",
    shortGoals: ["定時のおむつ交換と体位変換で皮膚トラブルを防ぐ。", "朝食を8割以上摂取できる。"],
    services: (["月", "水", "金"] as const).flatMap((w) => [
      svc(w, "07:30", 25, "身体1", "おむつ交換・陰部洗浄、体位変換、朝食介助、服薬介助", "ミキサー食。むせ込みに注意し、ギャッジアップ30度以上で介助。"),
      svc(w, "17:30", 25, "身体1", "おむつ交換、体位変換、清拭", "背部・踵部の発赤を毎回確認し、連絡ノートに記入。"),
    ]),
  },
  {
    id: "P-U004-0", userId: "U004", createdAt: "2026-03-05", createdBy: "中村 真理", carePlanDate: "2026-03-03",
    agreedAt: "2026-03-07", deliveredAt: "2026-03-07", periodFrom: "2026-03-08", periodTo: "2026-09-12",
    wish: "長男：日中仕事で不在のため、朝夕の介助をお願いしたい。",
    longGoal: "清潔で安楽に在宅生活を送れる。",
    shortGoals: ["定時のおむつ交換で皮膚トラブルを防ぐ。"],
    services: (["月", "水", "金"] as const).flatMap((w) => [
      svc(w, "07:30", 25, "身体1", "おむつ交換、体位変換、朝食介助、服薬介助", "ミキサー食。むせ込みに注意。"),
      svc(w, "17:30", 25, "身体1", "おむつ交換、体位変換、清拭", "背部・踵部の発赤を確認。"),
    ]),
  },
  {
    id: "P-U005-1", userId: "U005", createdAt: "2026-05-27", createdBy: "中村 真理", carePlanDate: "2026-05-26",
    agreedAt: "2026-05-30", deliveredAt: "2026-05-30", periodFrom: "2026-06-01", periodTo: "2026-11-30",
    wish: "本人：腰に負担をかけずに家をきれいに保ちたい。",
    longGoal: "腰痛を悪化させず、清潔な住環境で独居生活を続けられる。",
    shortGoals: ["座ってできる家事（洗濯物たたみ）を自分で行える。"],
    services: [svc("木", "13:00", 40, "生活2", "居室・浴室の掃除、洗濯、ゴミ出し", "本人は座位で洗濯物たたみを実施（自立支援）。前かがみ動作を避ける。")],
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

export const PERIOD = { from: "2026-09-01", to: "2026-09-30" };

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
  const d = new Date(2026, 8, 1);
  const end = new Date(2026, 8, 30);
  for (; d <= end; d.setDate(d.getDate() + 1)) {
    const date = ymd(d);
    const wd = weekdayOf(date);
    for (const [ui, u] of USERS.entries()) {
      const plan = PLANS.find((x) => x.userId === u.id && x.periodFrom <= date && date <= x.periodTo);
      for (const p of plan?.services.filter((x) => x.weekday === wd) ?? []) {
        const drift = pick([0, 0, 0, 2, -2, 3]);
        const startMin = toMin(p.start) + drift;
        let minutes: number;
        if (p.code === "生活2") minutes = pick([40, 42, 44]);
        else if (p.minutes <= 30) minutes = pick([25, 26, 28, 29]);
        else minutes = p.minutes + pick([0, 0, 1, 2, -1]);
        const hasLife = p.code.includes("生活");
        const bodyMinutes = p.bodyMinutes !== undefined ? p.bodyMinutes + pick([0, 1, 2]) : undefined;
        const bill = classify(p.code, p.minutes, p.bodyMinutes)!;

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

  // 監査証跡のサンプル: 記載誤りを理由付きで訂正した記録（サ責確認時に訂正）
  const at = (r: CareRecord) => r.supervisorCheckedAt ?? r.createdAt;
  const r1 = records.filter((r) => r.userId === "U002")[2];
  r1.history.push({ at: at(r1), by: "S01", field: "終了時刻", before: fromMin(toMin(r1.end) + 30), after: r1.end, reason: "記入時の誤記。ヘルパー本人と利用者宅の連絡ノートで実時間を確認のうえ訂正" });
  const r2 = records.filter((r) => r.userId === "U004" && r.excretion !== "―")[5];
  r2.history.push({ at: at(r2), by: "S01", field: "排泄", before: r2.excretion === "尿○ 便○" ? "尿○ 便×" : "尿○ 便○", after: r2.excretion, reason: "ヘルパーへの聞き取りで記載誤りを確認" });
  const r3 = records.filter((r) => r.userId === "U005")[2];
  r3.history.push({ at: at(r3), by: "S04", field: "特記事項", before: "様子変わりなし。", after: r3.note, reason: "具体的な状態の記載が不足していたため、サ責の指導により追記" });
  return records;
}

const REPORT_TEXT: Record<string, { comments: string[]; issues: string; policy: string; rating: GoalRating[] }> = {
  U001: {
    comments: ["膝の痛みの訴えは時々あるが、入浴は見守りで継続できている。", "浴槽の出入りは手すり使用で安定。痛みのある日は足浴に変更して対応した。", "洗濯物干しを本人と一緒に行えている。"],
    issues: "右膝の痛みの訴えが月数回ある。", policy: "10月からの新計画に沿って、洗濯物干しを本人主体で行えるよう見守りを継続する。", rating: ["継続", "一部達成", "達成"],
  },
  U002: {
    comments: ["夫婦での在宅生活を継続できている。", "移乗は左側からの介助で安全に実施できている。転倒なし。", "週4回の入浴を実施。仙骨部の軽度発赤は早期に共有し、悪化していない。"],
    issues: "仙骨部の発赤（軽度）。体位変換の声かけを家族に依頼済み。", policy: "皮膚状態の観察を継続し、変化時は速やかに報告する。", rating: ["継続", "達成", "一部達成"],
  },
  U003: {
    comments: ["食事摂取は概ね良好。", "献立相談のうえ買物・調理を実施。", "重複購入がみられ、冷蔵庫内の管理には声かけが必要。"],
    issues: "同じ食品の重複購入（認知機能の低下の可能性）。", policy: "買物リストを本人と作成する手順を追加することを提案したい。", rating: ["継続", "達成", "一部達成"],
  },
  U004: {
    comments: ["9月13日から新計画に移行。褥瘡の発生なし。", "定時のおむつ交換・体位変換を実施し、皮膚トラブルなし。", "朝食は概ね8割摂取。"],
    issues: "夕方に傾眠傾向の日がある。", policy: "現行計画を継続し、傾眠・食事量の変化を長男と共有する。", rating: ["継続", "達成", "達成"],
  },
  U005: {
    comments: ["腰痛の悪化なく、清潔な住環境を保てている。", "座位での洗濯物たたみを毎回実施できている。"],
    issues: "粗大ゴミの出し方の相談あり（ケアマネへ伝達済み）。", policy: "現行計画を継続する。計画期間（11月末）の終了前に評価を行う。", rating: ["継続", "達成"],
  },
};

export function mockDataset(): Dataset {
  const records = generateRecords();
  const month = PERIOD.from.slice(0, 7);
  const reports: CareReport[] = USERS.map((u, i) => {
    const r = draftReport(u, month, PLANS, records, "中村 真理", `2026-10-0${2 + (i % 3)}T15:00`);
    const t = REPORT_TEXT[u.id];
    r.goalEvaluations = r.goalEvaluations.map((g, k) => ({ ...g, rating: t.rating[k] ?? "継続", comment: t.comments[k] ?? "" }));
    r.issues = t.issues;
    r.policy = t.policy;
    r.planChange = u.id === "U003" ? "要検討" : "不要";
    r.status = "確定";
    r.finalizedAt = `2026-10-0${2 + (i % 3)}T16:30`;
    r.sentAt = `2026-10-0${3 + (i % 3)}T10:00`;
    return r;
  });
  return {
    source: "mock",
    office: { ...OFFICE, name: "いいかいご訪問介護（モック）", officeNo: "27000000XX（モック）" },
    period: PERIOD,
    users: USERS,
    plans: PLANS,
    staff: STAFF,
    records,
    reports,
    selfCheck: {},
    importLogs: [],
  };
}
