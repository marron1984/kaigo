"""実地調査用 テレッサ（訪問介護サービス提供記録）モックデータ生成スクリプト.

利用者・ヘルパー・記録内容はすべて架空のモックデータ。
"""
import random
from datetime import date, timedelta, time, datetime

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.pagebreak import Break
from openpyxl.utils import get_column_letter

random.seed(20261010)

OFFICE = {
    "法人名": "株式会社dhpケアマネジメント",
    "事業所名": "いいかいご訪問介護（モック）",
    "事業所番号": "27000000XX（モック）",
    "地域区分": "大阪市（2級地）",
}
UNIT_PRICE = 11.12  # 大阪市 2級地 訪問介護 円/単位（2027年4月改定で見直し）

# 2024年度改定の訪問介護 基本単位
UNITS = {"身体0": 163, "身体1": 244, "身体2": 387, "身体3": 567,
         "生活2": 179, "生活3": 220, "生活加算": 65, "通院乗降": 97}

USERS = [
    dict(id="U001", name="山田 花子", kana="ヤマダ ハナコ", sex="女", age=84, care="要介護2",
         ins="0000000001（モック）", cm="いいかいご居宅介護支援 担当A（モック）",
         plan=[("月", "身体1生活1", time(9, 0), 60), ("水", "身体2", time(9, 0), 45), ("金", "身体1生活1", time(9, 0), 60)],
         note="独居。右膝OA。入浴は見守り〜一部介助。"),
    dict(id="U002", name="佐藤 一郎", kana="サトウ イチロウ", sex="男", age=79, care="要介護3",
         ins="0000000002（モック）", cm="いいかいご居宅介護支援 担当B（モック）",
         plan=[("月", "身体2", time(10, 30), 50), ("火", "身体2", time(10, 30), 50), ("木", "身体2", time(10, 30), 50), ("土", "身体2", time(10, 30), 50)],
         note="脳梗塞後遺症（左片麻痺）。妻と二人暮らし。"),
    dict(id="U003", name="鈴木 和子", kana="スズキ カズコ", sex="女", age=88, care="要介護1",
         ins="0000000003（モック）", cm="いいかいご居宅介護支援 担当A（モック）",
         plan=[("火", "生活3", time(14, 0), 60), ("金", "生活3", time(14, 0), 60)],
         note="独居。軽度認知症。買物・調理援助中心。"),
    dict(id="U004", name="高橋 進", kana="タカハシ ススム", sex="男", age=91, care="要介護4",
         ins="0000000004（モック）", cm="いいかいご居宅介護支援 担当C（モック）",
         plan=[("月", "身体1", time(7, 30), 25), ("水", "身体1", time(7, 30), 25), ("金", "身体1", time(7, 30), 25),
               ("月", "身体1", time(17, 30), 25), ("水", "身体1", time(17, 30), 25), ("金", "身体1", time(17, 30), 25)],
         note="ほぼ臥床。長男同居（日中不在）。おむつ交換・体位変換。"),
    dict(id="U005", name="田中 美代子", kana="タナカ ミヨコ", sex="女", age=76, care="要介護1",
         ins="0000000005（モック）", cm="いいかいご居宅介護支援 担当D（モック）",
         plan=[("木", "生活2", time(13, 0), 45)],
         note="独居。腰椎圧迫骨折後。掃除・洗濯援助。"),
]
STAFF = ["中村 真理（介護福祉士）", "小林 恵（初任者研修）", "加藤 健（介護福祉士）",
         "伊藤 由美（実務者研修）", "渡辺 翔（初任者研修）"]
SEKININSHA = "中村 真理（サービス提供責任者）"

WD = "月火水木金土日"

BODY = ["排泄介助", "おむつ交換", "食事介助", "入浴介助", "部分浴（足浴）", "清拭", "整容", "更衣介助",
        "体位変換", "移乗介助", "移動介助", "服薬確認", "起床介助", "就寝介助", "自立支援見守り"]
LIFE = ["掃除", "洗濯", "調理", "配膳・下膳", "買物", "ベッドメイク", "衣類整理", "ゴミ出し"]

MENU = {
    "U001": {"body": ["入浴介助", "更衣介助", "整容", "服薬確認", "自立支援見守り"], "life": ["掃除", "洗濯"]},
    "U002": {"body": ["排泄介助", "入浴介助", "移乗介助", "更衣介助", "服薬確認"], "life": []},
    "U003": {"body": [], "life": ["買物", "調理", "配膳・下膳", "掃除"]},
    "U004": {"body": ["おむつ交換", "体位変換", "清拭", "食事介助", "服薬確認"], "life": []},
    "U005": {"body": [], "life": ["掃除", "洗濯", "ゴミ出し"]},
}

# (特記事項, 必ず実施する身体介護, 必ず実施する生活援助, 時間帯 None/"am"/"pm")
NOTES = {
    "U001": [("入浴前の体調確認問題なし。浴槽の出入りは手すり使用し見守り。洗身は背中のみ介助、他はご自身で実施。", ["入浴介助", "自立支援見守り"], ["掃除"], None),
             ("右膝の痛み訴えあり（安静時はなし）。入浴は中止し部分浴（足浴）に変更、本人了承。サ責へ報告済み。", ["部分浴（足浴）"], ["洗濯"], None),
             ("居室・トイレ掃除実施。洗濯物はご本人と一緒に干す（自立支援）。服薬カレンダー確認、昼分残なし。", ["服薬確認", "自立支援見守り"], ["掃除", "洗濯"], None),
             ("入浴介助（洗身一部介助）。浴後に保湿剤塗布、皮膚状態良好。服薬確認、朝分残なし。", ["入浴介助", "服薬確認"], [], None),
             ("顔色良好。デイの話を楽しそうにされる。入浴後の更衣はボタンのみ介助、整髪はご自身で。", ["入浴介助", "更衣介助", "整容"], ["掃除"], None)],
    "U002": [("ベッドから車椅子へ移乗介助。左側に注意。トイレにて排泄介助、排尿あり・排便なし。", ["移乗介助", "排泄介助"], [], None),
             ("自宅浴槽にてシャワーチェア使用し洗身介助。皮膚トラブルなし。奥様へ様子を伝達。", ["入浴介助", "更衣介助"], [], None),
             ("排泄介助時、仙骨部に軽度発赤あり（約2cm）。奥様と共有し、サ責・ケアマネへ報告。", ["排泄介助", "移乗介助"], [], None),
             ("服薬確認済み。立位保持30秒可能、更衣時も手すりにつかまり協力あり。転倒なし。", ["服薬確認", "更衣介助"], [], None)],
    "U003": [("本人と献立相談のうえ近隣スーパーへ買物（預り金3,000円、レシート・釣銭確認済、出納帳記入）。", [], ["買物"], None),
             ("煮物・味噌汁を調理し冷蔵保存。賞味期限切れの食品を本人了承のうえ処分。", [], ["調理"], None),
             ("同じ話の繰り返しあるが穏やか。冷蔵庫内に同じ食品の重複購入あり、ケアマネへ情報提供。", [], ["調理", "配膳・下膳"], None),
             ("台所・居室の掃除。配膳し昼食摂取を確認（主食7割・副食全量）。", [], ["掃除", "配膳・下膳"], None)],
    "U004": [("おむつ交換（尿多量・便なし）。陰部洗浄実施。体位変換（右側臥位）。皮膚異常なし。", ["おむつ交換", "体位変換"], [], None),
             ("朝食全介助、ミキサー食8割摂取。むせ込みなし。朝分の服薬介助、口腔内残留なし。", ["食事介助", "服薬確認"], [], "am"),
             ("全身清拭・更衣。背部・踵部に発赤なし。体位変換（左側臥位）。長男へ連絡ノート記入。", ["清拭", "体位変換"], [], None),
             ("夕方訪問時、傾眠傾向強い。体温平熱、呼吸状態安定。おむつ交換実施。長男へ電話で報告、様子観察。", ["おむつ交換"], [], "pm")],
    "U005": [("居室・浴室掃除。ご本人は椅子に座り洗濯物たたみを実施（自立支援）。腰痛の訴えなし。", [], ["掃除", "洗濯"], None),
             ("洗濯・干し。ゴミ出し（可燃）。粗大ゴミ申込みの相談あり、ケアマネへ伝達。", [], ["洗濯", "ゴミ出し"], None),
             ("掃除機がけ・拭き掃除。歩行は杖使用で安定。表情明るい。", [], ["掃除"], None)],
}

def classify(code, minutes):
    """記録上の算定区分と単位数を返す."""
    if code.startswith("生活"):
        c = "生活3" if minutes >= 45 else "生活2"
        return c, UNITS[c]
    if "生活" in code:  # 身体+生活
        body_min = 30
        life_min = minutes - body_min
        add = min(3, life_min // 20)
        return f"身体1生活{add}", UNITS["身体1"] + UNITS["生活加算"] * add
    if minutes < 20:
        return "身体0", UNITS["身体0"]
    if minutes < 30:
        return "身体1", UNITS["身体1"]
    if minutes < 60:
        return "身体2", UNITS["身体2"]
    return "身体3", UNITS["身体3"]

def build_records():
    recs = []
    start = date(2026, 10, 1)
    end = date(2026, 10, 31)
    d = start
    seq = 1
    while d <= end:
        wd = WD[d.weekday()]
        for u in USERS:
            for (pw, code, st, mins) in u["plan"]:
                if pw != wd:
                    continue
                # 実績は計画±数分のゆらぎ（算定区分は変わらない範囲）
                drift = random.choice([0, 0, 0, 2, -2, 3])
                st_dt = datetime.combine(d, st) + timedelta(minutes=drift)
                real = mins + random.choice([0, 0, 1, 2, -1]) if mins > 30 else random.choice([25, 26, 28, 29])
                if code.startswith("生活2"):
                    real = random.choice([40, 42, 44])
                en_dt = st_dt + timedelta(minutes=real)
                cls, unit = classify(code, real)
                ampm = "am" if st.hour < 12 else "pm"
                has_life = "生活" in code
                cand = [n for n in NOTES[u["id"]] if n[3] in (None, ampm) and (bool(n[2]) == has_life or (has_life and not n[1]))]
                note, nb, nl, _ = random.choice(cand)
                m = MENU[u["id"]]
                extra_b = [i for i in m["body"] if i not in nb]
                extra_l = [i for i in m["life"] if i not in nl] if has_life else []
                body = sorted(set(nb) | set(random.sample(extra_b, k=min(len(extra_b), random.randint(0, 2)))), key=BODY.index)
                life = sorted(set(nl) | set(random.sample(extra_l, k=min(len(extra_l), random.randint(0, 1)))), key=LIFE.index)
                if u["id"] == "U001":
                    staff = STAFF[0 if d.day % 2 else 1]
                else:
                    staff = STAFF[(USERS.index(u) + d.day) % len(STAFF)]
                vit = dict(t=round(random.uniform(36.0, 36.9), 1), bp=f"{random.randint(112,148)}/{random.randint(62,88)}",
                           p=random.randint(62, 86))
                recs.append(dict(no=f"T{seq:04d}", d=d, wd=wd, user=u, plan=code, cls=cls, unit=unit,
                                 st=st_dt.time(), en=en_dt.time(), mins=real, body=body, life=life,
                                 staff=staff, vit=vit, note=note,
                                 meal=random.choice(["全量", "8割", "7割", "―"]) if u["id"] in ("U003", "U004") else "―",
                                 excr=random.choice(["尿○ 便×", "尿○ 便○", "尿○ 便×"]) if u["id"] in ("U002", "U004") else "―"))
                seq += 1
        d += timedelta(days=1)
    return recs

thin = Side(style="thin", color="000000")
med = Side(style="medium", color="000000")
B = Border(left=thin, right=thin, top=thin, bottom=thin)
HDR = PatternFill("solid", fgColor="DCE6F1")
LBL = PatternFill("solid", fgColor="F2F2F2")
F = "IPAゴシック"

def cell(ws, ref, v, bold=False, size=10, fill=None, align="left", wrap=True, border=True):
    ws[ref] = v
    c = ws[ref]
    c.font = Font(name=F, bold=bold, size=size)
    c.alignment = Alignment(horizontal=align, vertical="center", wrap_text=wrap)
    if fill:
        c.fill = fill
    if border:
        c.border = B
    return c

def box(ws, rng, v, **kw):
    ws.merge_cells(rng)
    first = rng.split(":")[0]
    c = cell(ws, first, v, **kw)
    for row in ws[rng]:
        for x in row:
            x.border = B
    return c

def fit_a4(ws, landscape=False):
    ws.page_setup.orientation = "landscape" if landscape else "portrait"
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True


def sheet_cover(wb, recs):
    ws = wb.active
    ws.title = "表紙・説明"
    ws.column_dimensions["A"].width = 22
    ws.column_dimensions["B"].width = 70
    cell(ws, "A1", "実地調査用 テレッサ（訪問介護サービス提供記録）モックデータ", bold=True, size=14, border=False, wrap=False)
    rows = [
        ("※重要", "本ファイルの利用者・ヘルパー・被保険者番号・記録内容はすべて架空のモックデータです。実在の人物・記録とは関係ありません。"),
        ("用途", "実地調査（運営指導）に向けた記録様式の確認、記載レベルの統一、職員研修用"),
        ("法人名", OFFICE["法人名"]),
        ("事業所名", OFFICE["事業所名"]),
        ("事業所番号", OFFICE["事業所番号"]),
        ("地域区分・単価", f"{OFFICE['地域区分']} 訪問介護 {UNIT_PRICE:.2f}円/単位（2027年4月改定で見直し）"),
        ("対象期間", f"{recs[0]['d']:%Y年%m月%d日} 〜 {recs[-1]['d']:%Y年%m月%d日}"),
        ("収録件数", f"利用者 {len(USERS)}名 / 記録 {len(recs)}件"),
        ("シート構成", "①利用者一覧 ②記録一覧（実績・単位数） ③利用者別月間集計 ④テレッサ（印刷用・1件1ページA4）"),
        ("運営指導での主な確認点", "・計画（訪問介護計画・サービス提供票）と実績の時間/区分の整合\n・提供時間（開始/終了）の実時間記載\n・具体的なサービス内容と利用者の心身状況の記録\n・利用者確認（サイン/押印）\n・異変時の報告・連絡の記録（サ責/ケアマネ/家族）\n・2時間ルール、20分未満の扱い、生活援助の算定要件"),
        ("単位数の根拠", "2024年度介護報酬改定の訪問介護基本単位（身体1=244、身体2=387、身体3=567、生活2=179、生活3=220、生活援助加算=65/20分）。加算（特定事業所加算・処遇改善加算等）は未計上。"),
    ]
    for i, (k, v) in enumerate(rows, start=3):
        cell(ws, f"A{i}", k, bold=True, fill=LBL)
        cell(ws, f"B{i}", v)
        ws.row_dimensions[i].height = 18 * max(1, v.count("\n") + 1 + len(v) // 45)
    ws["B3"].font = Font(name=F, bold=True, color="C00000")
    fit_a4(ws)

def sheet_users(wb):
    ws = wb.create_sheet("利用者一覧")
    head = ["利用者ID", "氏名（架空）", "フリガナ", "性別", "年齢", "要介護度", "被保険者番号", "担当ケアマネ", "計画（曜日・区分・開始・分）", "特記"]
    widths = [9, 14, 16, 6, 6, 14, 20, 30, 46, 40]
    for i, (h, w) in enumerate(zip(head, widths), 1):
        cell(ws, f"{get_column_letter(i)}1", h, bold=True, fill=HDR, align="center")
        ws.column_dimensions[get_column_letter(i)].width = w
    for r, u in enumerate(USERS, 2):
        plan = "\n".join(f"{w} {c} {t:%H:%M}〜 {m}分" for w, c, t, m in u["plan"])
        vals = [u["id"], u["name"], u["kana"], u["sex"], u["age"], u["care"], u["ins"], u["cm"], plan, u["note"]]
        for i, v in enumerate(vals, 1):
            cell(ws, f"{get_column_letter(i)}{r}", v, align="center" if i in (1, 4, 5) else "left")
        ws.row_dimensions[r].height = 16 * max(2, len(u["plan"]))
    ws.freeze_panes = "A2"
    fit_a4(ws, landscape=True)

def sheet_list(wb, recs):
    ws = wb.create_sheet("記録一覧")
    head = ["記録No", "提供日", "曜", "利用者ID", "利用者名", "計画区分", "開始", "終了", "提供分",
            "算定区分", "単位数", "金額(円)", "身体介護内容", "生活援助内容", "担当ヘルパー", "利用者確認"]
    widths = [8, 11, 4, 8, 12, 11, 7, 7, 7, 11, 8, 10, 46, 26, 22, 9]
    for i, (h, w) in enumerate(zip(head, widths), 1):
        cell(ws, f"{get_column_letter(i)}1", h, bold=True, fill=HDR, align="center")
        ws.column_dimensions[get_column_letter(i)].width = w
    for r, x in enumerate(recs, 2):
        vals = [x["no"], x["d"], x["wd"], x["user"]["id"], x["user"]["name"], x["plan"], x["st"], x["en"],
                x["mins"], x["cls"], x["unit"], None, "、".join(x["body"]) or "―", "、".join(x["life"]) or "―",
                x["staff"], "済"]
        for i, v in enumerate(vals, 1):
            c = cell(ws, f"{get_column_letter(i)}{r}", v, align="center" if i not in (13, 14, 15) else "left", wrap=False)
        ws[f"B{r}"].number_format = "yyyy/mm/dd"
        ws[f"G{r}"].number_format = ws[f"H{r}"].number_format = "hh:mm"
        ws[f"L{r}"] = f"=ROUNDDOWN(K{r}*{UNIT_PRICE},0)"
        ws[f"L{r}"].number_format = "#,##0"
    n = len(recs) + 1
    t = n + 1
    cell(ws, f"J{t}", "合計", bold=True, fill=LBL, align="center")
    cell(ws, f"K{t}", f"=SUM(K2:K{n})", bold=True, align="center")
    cell(ws, f"L{t}", f"=SUM(L2:L{n})", bold=True, align="center")
    ws[f"L{t}"].number_format = "#,##0"
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:P{n}"
    ws.page_setup.orientation = "landscape"
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.print_title_rows = "1:1"

def sheet_summary(wb, recs):
    ws = wb.create_sheet("利用者別月間集計")
    head = ["利用者ID", "氏名", "要介護度", "回数", "合計提供分", "合計単位数", "金額(円)"]
    for i, (h, w) in enumerate(zip(head, [9, 14, 16, 8, 12, 12, 12]), 1):
        cell(ws, f"{get_column_letter(i)}1", h, bold=True, fill=HDR, align="center")
        ws.column_dimensions[get_column_letter(i)].width = w
    n = len(recs) + 1
    for r, u in enumerate(USERS, 2):
        cell(ws, f"A{r}", u["id"], align="center")
        cell(ws, f"B{r}", u["name"])
        cell(ws, f"C{r}", u["care"])
        cell(ws, f"D{r}", f"=COUNTIF(記録一覧!$D$2:$D${n},A{r})", align="center")
        cell(ws, f"E{r}", f"=SUMIF(記録一覧!$D$2:$D${n},A{r},記録一覧!$I$2:$I${n})", align="center")
        cell(ws, f"F{r}", f"=SUMIF(記録一覧!$D$2:$D${n},A{r},記録一覧!$K$2:$K${n})", align="center")
        cell(ws, f"G{r}", f"=SUMIF(記録一覧!$D$2:$D${n},A{r},記録一覧!$L$2:$L${n})", align="center")
        ws[f"G{r}"].number_format = "#,##0"
    t = len(USERS) + 2
    cell(ws, f"C{t}", "合計", bold=True, fill=LBL, align="center")
    for col in "DEFG":
        cell(ws, f"{col}{t}", f"=SUM({col}2:{col}{t-1})", bold=True, align="center")
    ws[f"G{t}"].number_format = "#,##0"
    fit_a4(ws)
    cell(ws, f"A{t+2}", "※記録一覧の金額は1回ごとの参考値。利用者別の合計はサービス提供票の別表と同じく合計単位×11.12円（端数切捨て）で計算すること。加算・利用者負担割合は未計上。", border=False, wrap=False)

def sheet_forms(wb, recs):
    ws = wb.create_sheet("テレッサ（印刷用）")
    # 8列グリッド（A4縦）
    for col, w in zip("ABCDEFGH", [12, 12, 12, 12, 12, 12, 12, 12]):
        ws.column_dimensions[col].width = w
    ws.page_setup.orientation = "portrait"
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_margins.left = ws.page_margins.right = 0.5
    ws.page_margins.top = ws.page_margins.bottom = 0.5
    ws.sheet_view.showGridLines = False

    r = 1
    for x in recs:
        u = x["user"]
        top = r
        box(ws, f"A{r}:F{r}", "訪問介護サービス提供記録（テレッサ）", bold=True, size=14, align="center", border=False)
        box(ws, f"G{r}:H{r}", f"No. {x['no']}", align="right", border=False)
        ws.row_dimensions[r].height = 26
        r += 1
        box(ws, f"A{r}:H{r}", f"{OFFICE['法人名']}　{OFFICE['事業所名']}　事業所番号 {OFFICE['事業所番号']}", size=9, border=False)
        r += 1
        box(ws, f"A{r}:H{r}", "※架空のモックデータ（実地調査準備・研修用）", size=8, border=False)
        ws[f"A{r}"].font = Font(name=F, size=8, color="C00000")
        r += 1

        def row(*pairs, h=30):
            nonlocal r
            for rng, v, lab in pairs:
                if ":" in rng:
                    box(ws, rng.format(r=r), v, fill=LBL if lab else None, bold=lab, align="center" if lab else "left")
                else:
                    cell(ws, rng.format(r=r), v, fill=LBL if lab else None, bold=lab, align="center" if lab else "left")
            ws.row_dimensions[r].height = h
            r += 1

        row(("A{r}", "利用者名", True), ("B{r}:C{r}", f"{u['name']} 様", False),
            ("D{r}", "要介護度", True), ("E{r}", u["care"], False),
            ("F{r}", "被保険者番号", True), ("G{r}:H{r}", u["ins"], False))
        row(("A{r}", "提供日", True), ("B{r}:C{r}", f"{x['d']:%Y年%m月%d日}（{x['wd']}）", False),
            ("D{r}", "提供時間", True), ("E{r}:F{r}", f"{x['st']:%H:%M} 〜 {x['en']:%H:%M}（{x['mins']}分）", False),
            ("G{r}", "算定区分", True), ("H{r}", x["cls"], False))
        row(("A{r}", "計画区分", True), ("B{r}:C{r}", x["plan"], False),
            ("D{r}", "単位数", True), ("E{r}", f"{x['unit']}単位", False),
            ("F{r}", "派遣人数", True), ("G{r}:H{r}", "1名", False))
        # バイタル
        row(("A{r}", "体温", True), ("B{r}", f"{x['vit']['t']}℃", False),
            ("C{r}", "血圧", True), ("D{r}", x["vit"]["bp"], False),
            ("E{r}", "脈拍", True), ("F{r}", f"{x['vit']['p']}回/分", False),
            ("G{r}", "顔色・様子", True), ("H{r}", "良好" if "傾眠" not in x["note"] and "痛み" not in x["note"] else "要観察", False))
        row(("A{r}", "食事摂取", True), ("B{r}:D{r}", x["meal"], False),
            ("E{r}", "排泄", True), ("F{r}:H{r}", x["excr"], False))

        # 身体介護チェック
        box(ws, f"A{r}:H{r}", "■ 身体介護", bold=True, fill=HDR)
        r += 1
        for i in range(0, len(BODY), 4):
            for j, item in enumerate(BODY[i:i+4]):
                c1 = "ABCDEFGH"[j*2]
                c2 = "ABCDEFGH"[j*2+1]
                box(ws, f"{c1}{r}:{c2}{r}", ("☑ " if item in x["body"] else "□ ") + item)
            for j in range(len(BODY[i:i+4]), 4):
                box(ws, f"{'ABCDEFGH'[j*2]}{r}:{'ABCDEFGH'[j*2+1]}{r}", "")
            ws.row_dimensions[r].height = 24
            r += 1
        box(ws, f"A{r}:H{r}", "■ 生活援助", bold=True, fill=HDR)
        r += 1
        for i in range(0, len(LIFE), 4):
            for j, item in enumerate(LIFE[i:i+4]):
                box(ws, f"{'ABCDEFGH'[j*2]}{r}:{'ABCDEFGH'[j*2+1]}{r}", ("☑ " if item in x["life"] else "□ ") + item)
            ws.row_dimensions[r].height = 24
            r += 1

        box(ws, f"A{r}:H{r}", "■ 利用者の状態・サービス提供時の特記事項", bold=True, fill=HDR)
        r += 1
        box(ws, f"A{r}:H{r+5}", x["note"], size=11)
        ws[f"A{r}"].alignment = Alignment(vertical="top", wrap_text=True)
        for k in range(6):
            ws.row_dimensions[r+k].height = 26
        r += 6

        report = "あり（サ責・ケアマネ・家族へ報告済）" if any(w in x["note"] for w in ("報告", "伝達", "情報提供", "共有")) else "なし"
        row(("A{r}", "報告・連絡", True), ("B{r}:H{r}", report, False))
        row(("A{r}", "退室時確認", True), ("B{r}:H{r}", "☑ 火の元　☑ 戸締り　☑ 電気・水道　☑ 貴重品の所在　☑ 次回訪問日の伝達", False))
        row(("A{r}", "担当ヘルパー", True), ("B{r}:D{r}", x["staff"], False),
            ("E{r}", "サ責確認", True), ("F{r}:H{r}", SEKININSHA.split("（")[0] + "　確認済", False))
        row(("A{r}", "利用者確認", True), ("B{r}:D{r}", f"{u['name']}（署名欄・モック）", False),
            ("E{r}", "確認日時", True), ("F{r}:H{r}", f"{x['d']:%Y/%m/%d} {x['en']:%H:%M}", False), h=30)

        ws.row_breaks.append(Break(id=r - 1))
        r += 1
    ws.print_area = f"A1:H{r}"

def main():
    recs = build_records()
    wb = Workbook()
    sheet_cover(wb, recs)
    sheet_users(wb)
    sheet_list(wb, recs)
    sheet_summary(wb, recs)
    sheet_forms(wb, recs)
    out = "output/テレッサ_実地調査用モック_dhpケアマネジメント_2026年10月.xlsx"
    wb.save(out)
    print(out, len(recs))

if __name__ == "__main__":
    main()
