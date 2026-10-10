import type { Weekday } from "./types";

/** 事業所情報の初期値（取り込み画面で変更できる） */
export const OFFICE = {
  corp: "株式会社dhpケアマネジメント",
  name: "いいかいご訪問介護",
  officeNo: "",
};

/** 大阪市（2級地）訪問介護 円/単位。2024年度改定の地域区分単価（2027年4月の介護報酬改定で見直し） */
export const UNIT_PRICE = 11.12;

/** 2024年度改定 訪問介護 基本単位 */
export const UNITS = {
  身体0: 163,
  身体1: 244,
  身体2: 387,
  身体3: 567,
  生活2: 179,
  生活3: 220,
  生活加算: 65,
} as const;

export const BODY_ITEMS = [
  "排泄介助", "おむつ交換", "食事介助", "入浴介助", "部分浴（足浴）", "清拭", "整容", "更衣介助",
  "体位変換", "移乗介助", "移動介助", "服薬確認", "起床介助", "就寝介助", "自立支援見守り",
];

export const LIFE_ITEMS = ["掃除", "洗濯", "調理", "配膳・下膳", "買物", "ベッドメイク", "衣類整理", "ゴミ出し"];

export const LEAVE_ITEMS = ["火の元", "戸締り", "電気・水道", "貴重品の所在", "次回訪問日の伝達"];

export const WEEKDAYS: Weekday[] = ["日", "月", "火", "水", "木", "金", "土"];

/** 身体介護に従事できる資格 */
export const BODY_QUALIFIED = ["介護福祉士", "実務者研修", "初任者研修"];

/** 2時間ルール（同一利用者の訪問間隔がこれ未満なら所要時間を合算） */
export const TWO_HOUR_RULE_MIN = 120;
