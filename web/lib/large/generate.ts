/**
 * 大規模モック（18名・2026年10月）の生成。
 * 訪問介護計画 → 訪問予定 → シフト（担当割り当て）→ サービス提供記録・介護報告書 の順に作る。
 * 特記事項は利用者像・時間帯・サービス内容・担当職員の文体を組み合わせ、すべて異なる文章にする。
 */
import { classify, unitsWithTime } from "../billing";
import { fromMin, toMin, weekdayOf } from "../format";
import { BODY_ITEMS, LEAVE_ITEMS, LIFE_ITEMS, OFFICE } from "../master";
import { draftReport } from "../report";
import { generateShift, visitsOf } from "../shift";
import type { CarePlan, CareRecord, CareReport, CareUser, Dataset, GoalRating, Staff, Weekday } from "../types";
import { PROFILES, type EventDef, type F, type Profile, type SlotDef } from "./profiles";

export const LARGE_MONTH = "2026-10";

/* ---------- 職員（架空） ---------- */

type Range = { from: string; to: string };
const days = (ws: string, ranges: Range[]) => Object.fromEntries([...ws].map((w) => [w, ranges])) as Staff["availability"];
const R = (from: string, to: string): Range => ({ from, to });

const STAFF_DEF: [string, string, Staff["role"], Staff["employment"], Staff["availability"], number][] = [
  ["青木 由紀", "介護福祉士", "サービス提供責任者", "常勤", days("月火水木金", [R("08:30", "17:30")]), 20],
  ["井上 誠", "介護福祉士", "サービス提供責任者", "常勤", days("火水木金土", [R("08:30", "17:30")]), 20],
  ["上野 真弓", "介護福祉士", "サービス提供責任者", "常勤", days("月水木金日", [R("08:30", "17:30")]), 20],
  ["江口 さやか", "介護福祉士", "訪問介護員", "常勤", days("月火水木金土日", [R("05:30", "12:30")]), 30],
  ["大野 健太", "実務者研修", "訪問介護員", "常勤", days("月火水木金土日", [R("05:30", "12:30")]), 30],
  ["金子 和美", "初任者研修", "訪問介護員", "非常勤", days("月火水木金土", [R("06:30", "12:30")]), 25],
  ["菊池 美穂", "初任者研修", "訪問介護員", "非常勤", days("火水木金土日", [R("06:30", "12:30")]), 25],
  ["久保 隼人", "介護福祉士", "訪問介護員", "常勤", days("月火水木金土日", [R("00:00", "06:30"), R("21:30", "24:00")]), 30],
  ["小島 亜紀", "実務者研修", "訪問介護員", "非常勤", days("月火水木金土日", [R("00:00", "06:30"), R("21:30", "24:00")]), 30],
  ["近藤 拓也", "介護福祉士", "訪問介護員", "非常勤", days("月火水木金土日", [R("00:00", "06:30"), R("21:30", "24:00")]), 25],
  ["佐野 優子", "介護福祉士", "訪問介護員", "常勤", days("月火水木金土日", [R("08:00", "17:30")]), 35],
  ["柴田 恵美", "実務者研修", "訪問介護員", "常勤", days("月火水木金土日", [R("08:00", "17:30")]), 35],
  ["杉本 亮", "初任者研修", "訪問介護員", "非常勤", days("月火水木金", [R("09:00", "17:00")]), 25],
  ["高木 奈緒", "初任者研修", "訪問介護員", "非常勤", days("水木金土日", [R("09:00", "17:00")]), 25],
  ["千葉 聡子", "実務者研修", "訪問介護員", "非常勤", days("月火木土日", [R("10:00", "17:30")]), 25],
  ["土屋 裕介", "介護福祉士", "訪問介護員", "常勤", days("月火水木金土日", [R("16:00", "22:30")]), 30],
  ["中川 早苗", "実務者研修", "訪問介護員", "常勤", days("月火水木金土日", [R("16:00", "22:30")]), 30],
  ["成田 麻衣", "初任者研修", "訪問介護員", "非常勤", days("月火水木金土日", [R("16:00", "22:30")]), 25],
  ["西川 直子", "初任者研修", "訪問介護員", "非常勤", days("月水金土日", [R("16:00", "22:30")]), 25],
  ["橋本 浩", "介護福祉士", "訪問介護員", "常勤", days("月火水木金土日", [R("07:00", "21:00")]), 35],
  ["福田 理恵", "実務者研修", "訪問介護員", "常勤", days("月火水木金土日", [R("07:00", "21:00")]), 35],
  ["本田 勇気", "初任者研修", "訪問介護員", "非常勤", days("月火水木金土日", [R("07:00", "21:00")]), 30],
];

export const LARGE_STAFF: Staff[] = STAFF_DEF.map(([name, qualification, role, employment, availability, h], i) => ({
  id: `X${String(i + 1).padStart(2, "0")}`, name, qualification, role, employment, availability, maxWeeklyMinutes: h * 60,
}));

/** 職員ごとの記録の書き癖：0 である調／1 です・ます調／2 体言止め／3 本人の言葉を引用／4 箇条書き */
const styleOf = (staffId: string) => (staffId.startsWith("X0") && Number(staffId.slice(1)) <= 3 ? 0 : (Number(staffId.slice(1)) * 7) % 5);

/* ---------- 乱数 ---------- */

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

/* ---------- 文の部品 ---------- */

type Band = "deep" | "early" | "morning" | "noon" | "afternoon" | "evening" | "night";
function bandOf(start: string): Band {
  const t = toMin(start);
  if (t < 5 * 60 + 30 || t >= 22 * 60) return "deep";
  if (t < 9 * 60) return "early";
  if (t < 11 * 60 + 30) return "morning";
  if (t < 13 * 60 + 30) return "noon";
  if (t < 17 * 60) return "afternoon";
  if (t < 19 * 60 + 30) return "evening";
  return "night";
}

const OPEN: Record<Band, F[]> = {
  deep: [
    ["静かに眠っておられ、声かけで目を開けられた", "静かに眠っておられ、声をかけると目を開けられました", "入眠中、声かけで開眼"],
    ["眠りが浅い様子で、すぐに目を覚まされた", "眠りが浅かったようで、すぐに目を覚まされました", "浅眠、訪問時すぐ覚醒"],
    ["室内は暗く、足元灯をつけて対応した", "お部屋が暗かったので、足元灯をつけて対応しました", "足元灯点灯し対応"],
    ["寝息を立てておられたため、小声で声かけしてから介助した", "寝息を立てておられたので、小さな声でお声がけしてから介助しました", "入眠中、小声で声かけ後に介助"],
    ["目を開けて天井を見ておられた", "目を開けて天井を見ておられました", "訪問時開眼、覚醒状態"],
    ["布団を少しはだけた状態で眠っておられた", "布団が少しはだけた状態で眠っておられました", "布団はだけた状態で入眠中"],
  ],
  early: [
    ["起床の声かけにすぐ目を開けられた", "起床の声かけに、すぐ目を開けられました", "声かけで覚醒良好"],
    ["すでに目を覚ましてベッドで待っておられた", "もう目を覚まして、ベッドで待っておられました", "訪問時すでに覚醒"],
    ["カーテンを開けると眩しそうにされた", "カーテンを開けると、眩しそうにされていました", "カーテン開放、眩しそう"],
    ["朝の冷え込みで手先が冷たかった", "朝の冷え込みで、手先が冷たくなっていました", "朝の冷え込み、手指冷感"],
    ["少し眠そうだったが、受け答えははっきりしていた", "少し眠そうでしたが、受け答えははっきりしていました", "やや傾眠、受け答え明瞭"],
    ["外はまだ薄暗く、照明をつけてから声をかけた", "外はまだ薄暗く、明かりをつけてからお声がけしました", "外薄暗く照明点灯後に声かけ"],
  ],
  morning: [
    ["テレビの情報番組を見ながら待っておられた", "テレビの情報番組を見ながら待っておられました", "テレビ視聴中に訪問"],
    ["玄関の鍵を開けて待っていてくださった", "玄関の鍵を開けて待っていてくださいました", "玄関開錠済みで待機"],
    ["新聞を読みながらくつろいでおられた", "新聞を読みながら、くつろいでおられました", "新聞閲覧中"],
    ["窓際で日向ぼっこをしておられた", "窓際で日向ぼっこをしておられました", "窓際で日光浴中"],
    ["朝食を終えて一息ついたところだった", "朝ご飯を終えて、ひと息ついたところでした", "朝食後の休憩中"],
  ],
  noon: [
    ["昼食前で少しお腹が空いた様子だった", "お昼前で、少しお腹が空いたご様子でした", "昼食前、空腹の訴えあり"],
    ["午前中は横になって過ごしていたとのこと", "午前中は横になって過ごしていたそうです", "午前中は臥床で過ごしたとのこと"],
    ["ラジオの音楽を聞きながら待っておられた", "ラジオの音楽を聞きながら待っておられました", "ラジオ聴取中に訪問"],
    ["昼のニュースを熱心に見ておられた", "お昼のニュースを熱心に見ておられました", "昼のニュース視聴中"],
  ],
  afternoon: [
    ["昼食後の休憩を終えたところだった", "お昼ご飯のあとの休憩を終えたところでした", "昼食後休憩明け"],
    ["午後の日差しが入り、室内は暖かかった", "午後の日差しが入り、お部屋は暖かでした", "午後の日差しで室内暖か"],
    ["うたた寝から目覚めたところだった", "うたた寝から目を覚まされたところでした", "うたた寝から覚醒直後"],
    ["来訪を待ちわびていた様子で笑顔で迎えられた", "訪問を待っておられた様子で、笑顔で迎えてくださいました", "笑顔で出迎えあり"],
  ],
  evening: [
    ["夕方で薄暗くなってきたため照明をつけた", "夕方で薄暗くなってきたので、明かりをつけました", "夕刻、照明点灯"],
    ["夕食の時間を気にしておられた", "夕ご飯の時間を気にしておられました", "夕食時間を気にする発言あり"],
    ["夕方のニュースを見ながら待っておられた", "夕方のニュースを見ながら待っておられました", "夕方のニュース視聴中"],
    ["日が短くなったと話しておられた", "日が短くなったねと話しておられました", "日没の早さの話題"],
  ],
  night: [
    ["パジャマに着替えてテレビを見ながら待っておられた", "パジャマに着替えて、テレビを見ながら待っておられました", "就寝準備済みで待機"],
    ["眠そうに目をこすっておられた", "眠そうに目をこすっておられました", "眠気あり"],
    ["夕食を終えて落ち着いた様子だった", "夕食を済ませて、落ち着いたご様子でした", "夕食後で落ち着いた様子"],
    ["部屋の明かりを落としてくつろいでおられた", "お部屋の明かりを落として、くつろいでおられました", "照明を落とし休息中"],
  ],
};

/** 会話が難しく臥床中心の方の書き出し（日中・夜間） */
const OPEN_BED: { day: F[]; night: F[] } = {
  day: [
    ["ベッド上で穏やかに過ごしておられた", "ベッドの上で穏やかに過ごしておられました", "ベッド上で穏やかに臥床"],
    ["テレビの音を聞きながら横になっておられた", "テレビの音を聞きながら横になっておられました", "テレビの音を聞きながら臥床"],
    ["目を閉じて休んでおられ、声かけで開眼された", "目を閉じて休んでおられ、声をかけると目を開けられました", "閉眼で休息中、声かけで開眼"],
    ["家族がそばについておられた", "ご家族がそばについておられました", "家族付き添い中"],
  ],
  night: [
    ["部屋の明かりを落として休んでおられた", "お部屋の明かりを落として休んでおられました", "減灯下で休息中"],
    ["うとうとされており、静かに声をかけた", "うとうとされていたので、静かにお声がけしました", "傾眠中、静かに声かけ"],
    ["家族が見守る中、穏やかに過ごしておられた", "ご家族が見守る中、穏やかに過ごしておられました", "家族見守り下で穏やか"],
  ],
};

const PHRASE: Record<string, string[]> = {
  起床介助: ["起床介助", "ベッドからの起き上がり介助", "起床と端座位の介助"],
  就寝介助: ["就寝介助", "ベッドへの臥床介助", "就寝の準備と臥床の介助"],
  おむつ交換: ["おむつ交換（尿{amt}）", "パッド交換（尿{amt}）", "おむつ交換と陰部清拭（尿{amt}）"],
  排泄介助: ["トイレでの排泄介助", "トイレ誘導と排泄介助", "排泄介助（尿{amt}）"],
  食事介助: ["{meal}の介助", "{meal}の介助と見守り", "{meal}の一部介助"],
  入浴介助: ["入浴介助", "シャワー浴の介助", "洗身・洗髪の介助"],
  "部分浴（足浴）": ["足浴", "足浴と足先の観察"],
  清拭: ["全身清拭", "温タオルでの清拭", "部分清拭"],
  整容: ["洗面と整髪", "整容（洗顔・整髪）", "歯みがきと洗面の介助"],
  更衣介助: ["更衣介助", "着替えの介助", "衣類の着脱介助"],
  体位変換: ["体位変換（{side}側臥位）", "体位変換", "クッションでの体位調整"],
  移乗介助: ["車椅子への移乗介助", "ベッドと車椅子の移乗介助", "移乗介助"],
  移動介助: ["室内移動の付き添い", "居間までの移動介助", "歩行の見守り"],
  服薬確認: ["服薬確認", "服薬の声かけと確認", "お薬カレンダーでの服薬確認"],
  自立支援見守り: ["できる動作の見守り", "本人ができる部分は任せての見守り"],
  掃除: ["居室の掃除機かけ", "台所とトイレの掃除", "拭き掃除"],
  洗濯: ["洗濯と物干し", "洗濯物の取り込みとたたみ"],
  調理: ["夕食の調理", "おかず2品の調理", "作り置きのおかずの調理"],
  "配膳・下膳": ["配膳と下膳", "食事の配膳"],
  買物: ["近所のスーパーへの買物", "日用品の買物"],
  ベッドメイク: ["シーツ交換", "ベッドメイク"],
  衣類整理: ["衣類の整理", "衣替えの手伝い"],
  ゴミ出し: ["ゴミ出し", "ゴミの分別とゴミ出し"],
};

/** 観察の文。day＝日中のみ、talk＝会話ができる方のみ、once＝同じ利用者に月1回まで */
type Obs = { f: F; day?: boolean; night?: boolean; talk?: boolean; once?: boolean; care?: boolean; g?: string };
const OBS: Obs[] = [
  { f: ["皮膚の発赤や傷はなかった", "皮膚に赤みや傷はありませんでした", "皮膚異常なし"], care: true , g: "skin" },
  { f: ["仙骨部・踵部に発赤はない", "お尻やかかとに赤みはありませんでした", "仙骨部・踵部発赤なし"], care: true , g: "skin" },
  { f: ["皮膚の乾燥が目立つため保湿剤を塗布した", "肌が乾燥していたので保湿クリームを塗りました", "皮膚乾燥→保湿剤塗布"], care: true , g: "skin" },
  { f: ["表情は穏やかで会話も弾んだ", "表情は穏やかで、お話も弾みました", "表情穏やか、会話良好"], talk: true, day: true , g: "mood" },
  { f: ["口数はやや少なめだった", "口数は少し少なめでした", "口数やや少なめ"], talk: true , g: "mood" },
  { f: ["冗談を言って笑っておられた", "冗談を言って笑っておられました", "冗談あり、笑顔"], talk: true, day: true , g: "mood" },
  { f: ["昨夜はよく眠れたとのこと", "昨夜はよく眠れたそうです", "昨夜良眠とのこと"], talk: true, day: true , g: "sleep" },
  { f: ["夜中に一度目が覚めたと話された", "夜中に一度目が覚めたとおっしゃいました", "中途覚醒1回の訴え"], talk: true, day: true , g: "sleep" },
  { f: ["朝晩が冷えてきたので掛け布団を1枚足した", "朝晩冷えてきたので、掛け布団を1枚足しました", "冷え込み→掛け布団追加"], once: true },
  { f: ["衣替えの時期のため長袖を用意した", "衣替えの時期なので、長袖を用意しました", "長袖へ衣替え"], once: true, day: true },
  { f: ["窓から見える柿の実の話をされた", "窓から見える柿の実のお話をされました", "窓外の柿の話題"], once: true, talk: true, day: true },
  { f: ["インフルエンザ予防接種の予定を確認した", "インフルエンザの予防接種の予定を確認しました", "インフル予防接種の予定確認"], once: true, day: true },
  { f: ["連絡ノートに前回からの様子が書かれていた", "連絡ノートに前回からの様子が書かれていました", "連絡ノートで前回以降の様子確認"] },
  { f: ["ベッド周りを整え、転倒の危険になる物を片付けた", "ベッドのまわりを整え、つまずきそうな物を片付けました", "ベッド周囲整理、転倒予防"] },
  { f: ["郵便物を一緒に確認した", "郵便物を一緒に確認しました", "郵便物を一緒に確認"], talk: true, day: true },
  { f: ["水分補給のためお茶を手の届く所に置いた", "お茶を手の届くところに置きました", "飲水しやすい位置にお茶を設置"], talk: true },
  { f: ["爪が伸びていたため、次回の入浴後に切ることを提案した", "爪が伸びていたので、次のお風呂のあとに切りましょうとお伝えしました", "爪伸長→次回入浴後に爪切り予定"], once: true, talk: true, day: true },
  { f: ["テレビの野球中継の話題で盛り上がった", "テレビの野球の話で盛り上がりました", "野球中継の話題で会話"], once: true, talk: true },
  { f: ["ゴミの日を一緒に確認した", "ゴミの日を一緒に確認しました", "ゴミの日を確認"], talk: true, day: true },
  { f: ["今日の天気と気温を伝えると、服装を自分で選ばれた", "今日の天気と気温をお伝えすると、ご自分で服を選ばれました", "天気を伝え、服装は本人が選択"], talk: true, day: true },
  { f: ["秋祭りの太鼓の音が聞こえると懐かしそうにされた", "秋祭りの太鼓の音が聞こえると、懐かしそうにされていました", "秋祭りの太鼓の音に懐かしむ様子"], once: true, day: true },
  { f: ["湯たんぽを使うか尋ねると、まだ要らないとのこと", "湯たんぽを使うかお聞きすると、まだ要らないそうです", "湯たんぽ不要とのこと"], once: true, talk: true, night: true },
  { f: ["手指の色はよく、末梢の冷えはない", "手の指の色はよく、冷えもありませんでした", "末梢冷感なし"] },
  { f: ["咳や鼻水などの風邪症状はない", "咳や鼻水などの風邪の症状はありません", "感冒症状なし"] },
  { f: ["呼吸は穏やかで、苦しそうな様子はない", "呼吸は穏やかで、苦しそうな様子はありませんでした", "呼吸穏やか"], g: "breath" },
  { f: ["シーツのしわを伸ばし、寝具を整えた", "シーツのしわを伸ばして、寝具を整えました", "寝具を整える"] },
  { f: ["室内の空気がこもっていたため短時間換気した", "お部屋の空気がこもっていたので、少し換気しました", "短時間換気"], day: true },
  { f: ["掛け物を整えて保温した", "掛け物を整えて、冷えないようにしました", "掛け物調整し保温"] },
  { f: ["口腔内の乾燥はなく、唇の荒れもない", "口の中は乾いておらず、唇も荒れていませんでした", "口腔内乾燥なし"] },
  { f: ["尿の色は普段どおりで混濁はない", "尿の色はいつもどおりで、濁りもありませんでした", "尿色正常、混濁なし"], care: true },
  { f: ["体位を整えると表情が和らいだ", "姿勢を整えると、表情がやわらぎました", "体位調整後、表情和らぐ"], care: true },
  { f: ["室温と湿度を確認し、加湿器の水を補充した", "室温と湿度を確認し、加湿器にお水を足しました", "室温・湿度確認、加湿器給水"] },
  { f: ["呼吸は規則的で、顔色もよい", "呼吸は規則的で、顔色もよかったです", "呼吸規則的、顔色良好"], g: "breath" },
  { f: ["眠気が強く、すぐに入眠された", "眠気が強く、すぐに眠られました", "すぐ入眠"], night: true , g: "sleep" },
  { f: ["寝つきはよい様子だった", "寝つきはよさそうでした", "寝つき良好"], night: true , g: "sleep" },
];

const CLOSE: Obs[] = [
  { f: ["火の元と戸締りを確認して退室した", "火の元と戸締りを確認して退室しました", "火元・施錠確認し退室"] },
  { f: ["携帯電話を手の届く所に置いて退室した", "携帯電話を手の届くところに置いて退室しました", "携帯電話を手元に置き退室"], talk: true },
  { f: ["次回の訪問時間を伝えて退室した", "次の訪問時間をお伝えして退室しました", "次回訪問時間を伝達"], talk: true },
  { f: ["連絡ノートに本日の様子を記入した", "連絡ノートに今日の様子を書きました", "連絡ノート記入"] },
  { f: ["エアコンの設定温度を確認して退室した", "エアコンの温度を確認して退室しました", "エアコン設定確認し退室"] },
  { f: ["照明を落とし、足元灯をつけて退室した", "明かりを落として足元灯をつけ、退室しました", "減灯・足元灯点灯し退室"], night: true },
  { f: ["ベッド柵と枕元のリモコンの位置を確認した", "ベッド柵と枕元のリモコンの位置を確認しました", "ベッド柵・リモコン位置確認"] },
];

const QUOTES = [
  "ありがとう、助かるわ", "今日はええ天気やな", "もうちょっと寝ときたいわ", "腰がちょっと痛いねん", "ご飯おいしかったで",
  "昨日は孫が来てくれてん", "寒なってきたなあ", "あんたの顔見たら安心するわ", "もう歳やからなあ", "テレビで野球見とってん",
  "早よ寝たいわ", "お風呂気持ちよかった", "今日は何日やったかな", "息子が電話くれてん", "また明日も来てな",
  "トイレが近いねん", "この服あったかいわ", "秋は食べ物がおいしいなあ", "夜は静かでええわ", "毎日ご苦労さんやな",
  "今日は調子ええで", "ちょっと肩がこってるねん", "柿が好きやねん", "栗ご飯が食べたいわ", "もうすぐ年末やなあ",
];

const NIGHT_QUOTES = ["ありがとう、助かるわ", "早よ寝たいわ", "夜は静かでええわ", "トイレが近いねん", "あんたの顔見たら安心するわ", "毎日ご苦労さんやな", "寒なってきたなあ", "もうちょっと寝ときたいわ"];

const AMT = ["少量", "中等量", "多量"];
const MEAL_AMT = ["全量", "9割", "8割", "8割", "7割"];

/* ---------- 生成 ---------- */

type NoteState = { followQueue: Map<string, { day: number; f: F }[]> };

function slotOf(p: Profile, start: string, code: string): SlotDef {
  return p.slots.find((s) => s.start === start && s.code === code)!;
}

export function buildPlans(): CarePlan[] {
  return PROFILES.map((p) => ({
    id: `P-${p.id}-1`, userId: p.id, createdAt: "2026-09-24", createdBy: "青木 由紀", carePlanDate: "2026-09-22",
    agreedAt: "2026-09-28", deliveredAt: "2026-09-28", periodFrom: "2026-10-01", periodTo: "2027-03-31",
    wish: p.wish, longGoal: p.longGoal, shortGoals: p.shortGoals,
    services: p.slots.flatMap((s) => [...s.weekdays].map((w) => ({
      weekday: w as Weekday, start: s.start, minutes: s.minutes, code: s.code, bodyMinutes: s.bodyMinutes, content: s.content, caution: s.caution,
    }))),
  }));
}

export function buildUsers(): CareUser[] {
  return PROFILES.map((p) => ({
    id: p.id, name: p.name, kana: p.kana, sex: p.sex, birthDate: p.birthDate, careLevel: p.careLevel, certFrom: p.certFrom, certTo: p.certTo,
    insuredNo: p.insuredNo, insurerNo: "271007", burden: p.burden, cmOffice: p.cmOffice, careManager: p.careManager, contractDate: p.contractDate,
    limitUnits: p.limit, note: p.summary,
  }));
}

export function generateLargeRecords(users: CareUser[], plans: CarePlan[], staff: Staff[]): CareRecord[] {
  const visits = visitsOf(plans, users, LARGE_MONTH);
  const { assignments, unassigned } = generateShift(visits, staff, users, { buffer: 10 });
  if (unassigned.length) throw new Error(`担当が決まらない訪問がある：${unassigned.length}件 ${unassigned[0].key} ${unassigned[0].reason}`);

  const rand = rng(20261031);
  const pick = <T,>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  const profileById = new Map(PROFILES.map((p) => [p.id, p]));
  const used = new Set<string>();
  const state: NoteState = { followQueue: new Map() };
  const firstOfDay = new Set<string>();
  const onceByUser = new Map(PROFILES.map((p) => [p.id, new Set<string>()]));
  const records: CareRecord[] = [];
  let seq = 1;

  for (const v of visits) {
    const p = profileById.get(v.userId)!;
    const slot = slotOf(p, v.start, v.code);
    const staffId = assignments[v.key].staffId!;
    const style = styleOf(staffId);
    const day = Number(v.date.slice(8));
    const dayKey = `${p.id}|${day}`;
    const isFirst = !firstOfDay.has(dayKey);
    firstOfDay.add(dayKey);

    // その日の出来事（イベント）と、その後の経過
    const ev: EventDef | undefined = p.events.find((e) => e.day === day && (e.at ? e.at === v.start : isFirst));
    if (ev) state.followQueue.set(p.id, ev.follow.map((f, i) => ({ day: day + 2 * (i + 1), f })));
    const queue = state.followQueue.get(p.id) ?? [];
    const follow = !ev && queue.length && queue[0].day <= day ? queue.shift()!.f : undefined;

    // サービス内容
    const optCount = v.code === "身体0" ? int(0, 1) : int(1, 2);
    const opts = [...slot.opt].sort(() => rand() - 0.5).slice(0, optCount);
    let items = [...new Set([...slot.core, ...opts])];
    if (ev?.body) items = [...new Set([...ev.body, ...items.filter((i) => LIFE_ITEMS.includes(i))])];
    const body = items.filter((i) => BODY_ITEMS.includes(i)).sort((a, b) => BODY_ITEMS.indexOf(a) - BODY_ITEMS.indexOf(b));
    const life = items.filter((i) => LIFE_ITEMS.includes(i)).sort((a, b) => LIFE_ITEMS.indexOf(a) - LIFE_ITEMS.indexOf(b));
    const meal = body.includes("食事介助") ? (ev?.meal ?? pick(MEAL_AMT)) : "―";
    const excretion = body.includes("おむつ交換") || body.includes("排泄介助") ? (rand() < 0.3 ? "尿○ 便○" : "尿○ 便×") : "―";
    const temp = ev?.temp ?? Math.round((36 + rand() * 0.9) * 10) / 10;

    // 特記事項
    let note = "";
    for (let attempt = 0; attempt < 40; attempt++) {
      note = composeNote({ onceUsed: onceByUser.get(p.id)!, p, slot, v, style, items: [...body, ...life], ev, follow, meal, excretion, temp, pick, int, rand, extra: attempt >= 20 });
      if (!used.has(note)) break;
    }
    if (used.has(note)) note = note.replace(/。$/, `（${v.start}訪問）。`);
    used.add(note);
    for (const o of OBS) if (o.once && o.f.some((x) => note.includes(x))) onceByUser.get(p.id)!.add(o.f[0]);

    const delay = int(5, 30);
    const startMin = toMin(v.start) + (rand() < 0.2 ? int(1, 2) : 0);
    const endMin = startMin + v.minutes;
    const bill = classify(v.code, v.minutes, slot.bodyMinutes)!;
    const next = new Date(2026, 9, day + 1);
    const nextYmd = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
    records.push({
      no: `R${String(seq++).padStart(5, "0")}`,
      date: v.date, userId: p.id, planCode: v.code, start: fromMin(startMin), end: fromMin(endMin), minutes: v.minutes,
      bodyMinutes: slot.bodyMinutes, billingCode: bill.code, units: unitsWithTime(bill.units, v.start),
      body, life, staffId, helpers: 1,
      vitals: { temp, bp: `${int(108, 148)}/${int(60, 88)}`, pulse: int(60, 88) },
      condition: ev ? ev.condition : "良好", meal, excretion, note,
      reported: !!ev, reportTo: ev?.report ?? "", leaveCheck: [...LEAVE_ITEMS],
      userConfirmed: true, confirmedAt: `${v.date}T${fromMin(endMin)}`,
      supervisorCheckedBy: "X01", supervisorCheckedAt: `${nextYmd}T${fromMin(9 * 60 + int(5, 55))}`,
      createdAt: `${v.date}T${fromMin(Math.min(endMin + delay, 23 * 60 + 59))}`, history: [],
    });
  }
  return records;
}

type Ctx = {
  onceUsed: Set<string>;
  p: Profile; slot: SlotDef; v: { start: string; date: string }; style: number; items: string[];
  ev?: EventDef; follow?: F; meal: string; excretion: string; temp: number;
  pick: <T>(xs: T[]) => T; int: (a: number, b: number) => number; rand: () => number; extra: boolean;
};

function composeNote(c: Ctx): string {
  const { style, pick, int, rand } = c;
  const form = (f: F) => (style === 0 ? f[0] : style === 1 || style === 3 ? f[1] : f[2]);
  const fill = (s: string) =>
    s.replace("{amt}", pick(AMT)).replace("{side}", pick(["右", "左"])).replace("{meal}", c.slot.meal ?? "食事");

  // 行ったこと
  const acts = c.items.map((i) => fill(pick(PHRASE[i] ?? [i])));
  const actList = acts.join("、");
  const action: F = [
    `${actList}を${pick(["行った", "実施した"])}`,
    `${actList}を${pick(["行いました", "しました"])}`,
    `${actList}${pick(["実施", "済"])}`,
  ];

  // 観察
  const dyn: F[] = [];
  if (c.meal !== "―") {
    const mn = c.slot.meal ?? "食事";
    dyn.push([`${mn}は${c.meal}摂取、むせ込みなし`, `${mn}は${c.meal}召し上がり、むせ込みはありませんでした`, `${mn}${c.meal}摂取、むせなし`]);
  }
  if (c.excretion !== "―") {
    const bm = c.excretion.includes("便○") ? pick(["普通便あり", "軟便少量あり", "有形便あり"]) : "排便なし";
    dyn.push([`排尿あり、${bm}`, `おしっこが出ていて、${bm.replace("あり", "がありました").replace("なし", "はありませんでした")}`, `排尿あり／${bm}`]);
  }
  if (!c.ev?.temp && rand() < 0.35) dyn.push([`体温${c.temp.toFixed(1)}℃で平熱`, `体温は${c.temp.toFixed(1)}℃で平熱でした`, `体温${c.temp.toFixed(1)}℃`]);
  if (rand() < 0.3) {
    const w = int(2, 6) * 50;
    dyn.push(c.p.verbal ? [`お茶を${w}ml飲まれた`, `お茶を${w}mlほど飲まれました`, `水分${w}ml摂取`] : [`とろみ茶${w}mlを介助で摂取`, `とろみをつけたお茶を${w}mlほど介助で飲まれました`, `とろみ茶${w}ml介助摂取`]);
  }
  if (rand() < 0.2) { const r = int(20, 26); dyn.push([`室温${r}℃、換気を行った`, `室温は${r}℃で、換気をしました`, `室温${r}℃、換気`]); }
  const band = bandOf(c.v.start);
  const isNight = band === "night" || band === "deep";
  const physical = c.items.some((i) => ["おむつ交換", "清拭", "入浴介助", "更衣介助", "体位変換", "部分浴（足浴）"].includes(i));
  const fits = (o: Obs) => (!o.care || physical) && (!o.talk || c.p.verbal) && (!o.day || !isNight) && (!o.night || isNight) && (!o.once || !c.onceUsed.has(o.f[0]));
  // 出来事のあった訪問では睡眠の話題を入れない（夜間の転倒・不眠などと矛盾するため）
  const clash = (o: Obs) => !!c.ev && (o.g === "sleep" || o.g === "mood" || /風邪|尿の色/.test(o.f[0]));
  const generic = OBS.filter((o) => fits(o) && !clash(o)).sort(() => rand() - 0.5);
  const seenGroup = new Set<string>();
  const genericOnePerGroup = generic.filter((o) => !o.g || (!seenGroup.has(o.g) && (seenGroup.add(o.g), true)));
  const pool: F[] = [...dyn, ...c.p.obs, ...genericOnePerGroup.map((o) => o.f)].sort(() => rand() - 0.5);

  const parts: F[] = [];
  // 就寝介助の訪問は「眠っている」書き出しにしない
  const openBand: Band = band === "deep" && c.items.includes("就寝介助") ? "night" : band;
  const opening = c.p.verbal ? pick(OPEN[openBand]) : openBand === "deep" ? pick(OPEN.deep) : pick(isNight ? OPEN_BED.night : OPEN_BED.day);
  if (c.ev) parts.push(c.ev.text);
  else if (rand() < 0.7) parts.push(opening);
  if (c.follow) parts.push(c.follow);
  parts.push(action);
  // 会話ができない方には本人の発言を書かない。夜間・深夜は時間帯に合う発言だけ使う
  const quotePool = isNight ? [...c.p.quotes, ...NIGHT_QUOTES] : [...c.p.quotes, ...QUOTES, ...QUOTES];
  const quote = c.p.verbal && (style === 3 || rand() < 0.15) ? pick(quotePool) : undefined;
  const closes = CLOSE.filter(fits);
  const close = rand() < 0.6 ? pick(closes).f : undefined;

  const render = (ps: F[], withQuote: boolean, withClose: boolean) => {
    const segs = ps.map(form);
    if (withQuote && quote) {
      const q = `「${quote}」`;
      segs.push(style === 0 ? `${q}と話された` : style === 1 || style === 3 ? `${q}とおっしゃいました` : `${q}との発言あり`);
    }
    if (withClose && close) segs.push(form(close));
    return style === 4 ? segs.map((s) => `・${s}`).join("") : segs.map((s) => `${s}。`).join("");
  };

  let obsN = 0;
  let text = render(parts, !!quote, !!close);
  const minLen = style === 2 || style === 4 ? 78 : 95;
  while ([...text].length < minLen && obsN < Math.min(pool.length, 8)) {
    parts.splice(parts.length, 0, pool[obsN++]);
    text = render(parts, !!quote, !!close);
  }
  if (c.extra && obsN < pool.length) {
    parts.push(pool[obsN++]);
    text = render(parts, !!quote, !!close);
  }
  // 長すぎるときは締め・観察・本人の言葉の順に削る
  let wq = !!quote, wc = !!close;
  while ([...text].length > 128) {
    if (wc) wc = false;
    else if (parts.length > 2 && obsN > 0) { parts.pop(); obsN--; }
    else if (wq) wq = false;
    else break;
    text = render(parts, wq, wc);
  }
  return text;
}

export function generateLargeReports(users: CareUser[], plans: CarePlan[], records: CareRecord[]): CareReport[] {
  return users.map((u, i) => {
    const p = PROFILES.find((x) => x.id === u.id)!;
    const r = draftReport(u, LARGE_MONTH, plans, records, "青木 由紀", `2026-11-0${2 + (i % 3)}T15:00`);
    const evs = p.events.map((e) => `${10}/${e.day} ${e.text[0]}`);
    const settled = p.events.map((e) => e.follow.length ? e.follow[e.follow.length - 1][0] : "その後も経過を観察している");
    r.goalEvaluations = r.goalEvaluations.map((g, k) => ({
      ...g,
      rating: (k === 0 ? "継続" : p.events.length > 1 && k === 1 ? "一部達成" : "達成") as GoalRating,
      comment: k === 0 ? `${p.summary.split("。")[0]}の状態で、計画に沿って支援を継続した。${settled[0] ?? "大きな状態の変化はなかった"}。` : `目標に沿った支援を毎回実施し、${k === 1 ? "概ね達成できている" : "安定して継続できている"}。`,
    }));
    r.condition = evs.length ? `${evs.join("。")}。${settled.join("。")}。` : "当月、特段の状態変化はみられなかった。";
    r.issues = p.events.length ? `${p.events[0].text[2]}の再発に注意が必要。` : "特になし。";
    r.policy = "現行の訪問介護計画に沿って支援を継続する。";
    r.status = "確定";
    r.finalizedAt = `2026-11-0${2 + (i % 3)}T16:30`;
    r.sentAt = `2026-11-0${3 + (i % 3)}T10:00`;
    return r;
  });
}

export function largeDataset(): Dataset {
  const users = buildUsers();
  const plans = buildPlans();
  const staff = LARGE_STAFF;
  const records = generateLargeRecords(users, plans, staff);
  return {
    source: "mock",
    office: { ...OFFICE, name: "いいかいご訪問介護（大規模モック）", officeNo: "27000000XX（モック）" },
    period: { from: "2026-10-01", to: "2026-10-31" },
    users, plans, staff, records,
    reports: generateLargeReports(users, plans, records),
    shifts: [],
    selfCheck: {},
    importLogs: [],
  };
}

export { weekdayOf };
