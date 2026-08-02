// 噗浪・蓋樓台的純邏輯函式,逐條移植自 plurk-tower.html 原型的同名 function,
// 只把「用字串組 innerHTML」的部分留給呼叫端(React 元件)處理,規則本身不改。
import { EMO_ROW, EMO_END, type SankoTemplateSpec } from "./data";

export type PlurkDraftStatus = "draft" | "scheduled" | "posted";

export type PlurkDraft = {
  id: string;
  method: string;
  tplName: string;
  main: string;
  floors: string[];
  at: string; // datetime-local 字串,未排程為 ""
  status: PlurkDraftStatus;
};

export type PlurkTemplate = {
  id: string;
  method: string;
  name: string;
  main: string;
  floors: string[];
};

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function weekRange(): { a: string; b: string } {
  const d = new Date();
  const day = d.getDay();
  const to = ((8 - day) % 7) || 7;
  const m = new Date(d);
  m.setDate(d.getDate() + to);
  const s = new Date(m);
  s.setDate(m.getDate() + 6);
  const f = (x: Date) => `${x.getMonth() + 1}/${x.getDate()}`;
  return { a: f(m), b: f(s) };
}

export function fill(text: string): string {
  const r = weekRange();
  return text.split("{{起}}").join(r.a).split("{{迄}}").join(r.b);
}

const WD = ["日", "一", "二", "三", "四", "五", "六"];
export function fmtAt(at: string): string {
  if (!at) return "";
  const d = new Date(at);
  if (isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export function isDue(d: Pick<PlurkDraft, "status" | "at">, now: Date): boolean {
  return d.status === "scheduled" && Boolean(d.at) && new Date(d.at) <= now;
}

export function deriveTitle(d: { main: string }): string {
  const m = d.main.match(/\*\*(.+?)\*\*/);
  if (m) return m[1];
  const line = d.main
    .split("\n")
    .filter((x) => x.trim() && !/^https:\/\/\S+$/.test(x.trim()))[0];
  return line ? line.slice(0, 24) : "(未命名草稿)";
}

export type SplitResult = { intro: string; floors: string[] };

// 心乘光專屬 parser:辨識【選項X】/現狀共振/乘光訊息/祈請詞定錨/微光行動 等標記語句斷樓。
export function splitXCG(raw: string): SplitResult {
  const lines = raw.replace(/\r/g, "").split("\n");
  const floors: string[] = [];
  const intro: string[] = [];
  let cur: string[] = [];
  let started = false;
  const push = () => {
    const t = cur.join("\n").trim();
    if (t) floors.push(t);
    cur = [];
  };
  lines.forEach((line) => {
    const ne = line.trim().replace(/^\[emo\d+\]\s*/, "").replace(/\*\*/g, "").trim();
    if (ne && /^[-—–=＝﹣ー_＿]+$/.test(ne)) {
      if (started) push();
      return;
    }
    const b = ne.replace(/^[^一-鿿【「]+/, "").trim();
    let m: RegExpMatchArray | null;
    if ((m = b.match(/^【?選項\s*([^】\s：:]+)】?\s*(.*)$/))) {
      push();
      started = true;
      cur.push(`[emo456]**【選項${m[1]}】**${m[2] ? " " + m[2] : ""}`);
    } else if ((m = b.match(/^現狀共振\s*[:：]?\s*(.*)$/))) {
      started = true;
      cur.push(`[emo461]**現狀共振**:${m[1]}`);
    } else if ((m = b.match(/^乘光訊息\s*[:：]?\s*(.*)$/))) {
      push();
      started = true;
      cur.push(`[emo462]**乘光訊息:**${m[1]}`);
    } else if ((m = b.match(/^祈請詞定錨\s*[:：]?\s*(.*)$/))) {
      push();
      started = true;
      cur.push(`[emo484]**祈請詞定錨**:${m[1]}`);
    } else if ((m = b.match(/^微光行動\s*[:：]?\s*(.*)$/))) {
      started = true;
      if (!cur.some((l) => l.indexOf("[emo484]") >= 0)) push();
      cur.push(`[emo465]**微光行動:**${m[1]}`);
    } else if (!started) {
      intro.push(line);
    } else {
      cur.push(line);
    }
  });
  push();
  return { intro: intro.join("\n").trim(), floors };
}

// 命運籤詩專屬 parser:以①②…圈號斷樓,並補上遺漏的 [emo73]/[emo433] 標記。
export function splitFate(raw: string): SplitResult {
  const lines = raw.replace(/\r/g, "").split("\n");
  const floors: string[] = [];
  const intro: string[] = [];
  let head = "";
  let cur: string[] = [];
  let started = false;
  const finish = (f: string[]) => {
    let qi = -1;
    for (let i = 0; i < f.length; i++) {
      if (/^\s*「/.test(f[i])) {
        qi = i;
        break;
      }
    }
    if (qi >= 0 && !f.some((l) => l.indexOf("[emo73]") >= 0)) {
      for (let j = qi + 1; j < f.length; j++) {
        if (f[j].trim()) {
          f[j] = "[emo73] " + f[j].trim();
          break;
        }
      }
    }
    if (!f.some((l) => l.indexOf("[emo433]") >= 0)) {
      for (let k = f.length - 1; k >= 0; k--) {
        if (f[k].trim()) {
          if (f[k].indexOf("[emo") < 0) f[k] = "[emo433] " + f[k].trim();
          break;
        }
      }
    }
    return f;
  };
  const push = () => {
    if (!cur.length) return;
    const t = finish(cur).join("\n").trim();
    if (t) floors.push(t);
    cur = [];
  };
  lines.forEach((line) => {
    const t = line.trim();
    if (/^[①-⑳]/.test(t)) {
      push();
      started = true;
      if (head) {
        cur.push(head, "");
        head = "";
      }
      cur.push(t);
      return;
    }
    if (!started) {
      if (/第.{1,4}週｜/.test(t)) head = t;
      else intro.push(line);
    } else {
      cur.push(line);
    }
  });
  push();
  return { intro: intro.join("\n").trim(), floors };
}

// 其餘範本一律走 --- 斷樓(長文分樓規則:心乘光、命運籤詩各有專屬 parser,其餘走此規則)。
export function splitGeneric(raw: string): SplitResult {
  return {
    intro: "",
    floors: raw
      .replace(/\r/g, "")
      .split(/\n[-—–=＝﹣ー_＿]+\n/)
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

export const PARSERS: Record<string, (raw: string) => SplitResult> = {
  "tpl-xcg": splitXCG,
  "tpl-fate": splitFate,
};

// 由版型產生骨架:density=1 為每選項一樓,density=3 為每選項多樓(空/雨/傘分開)。
export function scaffold(m: SankoTemplateSpec, density: 1 | 3): { main: string; floors: string[] } {
  if (m.text) {
    const mainT =
      EMO_ROW +
      "\n**【夜光｜(光站名稱)】**\n(一句開場:這一站在陪伴什麼樣的時刻)\n\n下收詳細介紹 " +
      EMO_END;
    const floors = m.text.map((t) => `[emo456]**${t}**\n(內容)`);
    return { main: mainT, floors };
  }
  const main =
    EMO_ROW +
    `\n**【${m.name}｜{{起}}～{{迄}}】**\n(此處上傳題目圖)\n深呼吸三次,選出最有感覺的選項\n點擊下方留言處,有詳細的解析 ` +
    EMO_END;
  const floors: string[] = [];
  m.opts.forEach((o) => {
    const head = `[emo456]**【${o}】** ${m.hint}`;
    const kong = `[emo461]**${m.kong}**:\n(現狀共振:讓讀者覺得「這是在說我」)`;
    const yu = m.yu ? `[emo462]**${m.yu}**:\n(牌卡訊息／深層洞察)` : "";
    const san =
      m.key === "xincheng"
        ? "[emo484]**祈請詞定錨**:\n「(一句祈請詞)」\n\n[emo465]**微光行動:**\n(一個具體可做的小行動)"
        : m.type === "替換句"
        ? `[emo484]**${m.san}**:\n「(第一人稱宣言:我可以⋯⋯,而這不代表⋯⋯)」`
        : `[emo465]**${m.san}**:\n(今天＋具體場景＋小到不需要勇氣的動作)`;
    if (density === 1) {
      floors.push([head, "", kong, yu ? "" : null, yu, "", san].filter((x) => x !== null).join("\n"));
    } else {
      floors.push(head + "\n\n" + kong);
      if (yu) floors.push(yu);
      floors.push(san);
    }
  });
  return { main, floors };
}

export function charCount(text: string): number {
  return text.length;
}
export const PLURK_CHAR_LIMIT = 360;
