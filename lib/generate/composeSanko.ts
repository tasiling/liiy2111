// 日上三更・指令產生器:組裝最終指令文字。純讀取 + 文字組裝,不呼叫任何 AI、
// 不寫入 Notion(擁有者指示:這階段只到「產生指令→複製→貼回結果」,不接 Agent SDK)。
//
// 對照原型的 build() 函式,唯一差異是語氣規範改為動態讀取(resolveToneGuide()),
// 不再是寫死的 TONE 常數;八方法規格維持寫死(SANKO_METHODS,擁有者明確指示)。
// 只有「方法」是必要輸入(比照原型:未選方法就不能產生指令),牌卡/光站/補充脈絡
// 皆選填,對齊原型本身的驗證行為,不額外收緊。
import { resolveToneGuide } from "./sections";
import { SANKO_METHODS, type SankoMethodKey } from "@/lib/dojo/methods";

export type ComposeSankoInput = {
  methodKey: SankoMethodKey;
  cards?: string;
  station?: string;
  extra?: string;
};

export type ComposeSankoResult =
  | { ok: true; prompt: string; meta: string }
  | { ok: false; missing: string[] };

export async function composeSankoPrompt(input: ComposeSankoInput): Promise<ComposeSankoResult> {
  const v = SANKO_METHODS[input.methodKey];
  if (!v) {
    return { ok: false, missing: [`未知方法:${input.methodKey}`] };
  }

  const toneResult = await resolveToneGuide();
  if (!toneResult.ok) {
    return { ok: false, missing: toneResult.missing };
  }
  const tone = toneResult.value.content;

  const sanNote = v.type === "替換句" ? "(傘必須是第一人稱宣言,不是行動指示)" : "(傘為「今天」+具體場景+小動作)";

  let p = `${tone}\n\n────────────────\n\n【本篇規格】\n版型名稱:${v.name}\n使用方法:${v.method}\n三段命名:空=${v.kong}／雨=${v.yu}／傘=${v.san}\n傘段型態:${v.type}型${sanNote}\n版型規格:${v.spec}\n方法要點:${v.note}\n`;

  if (input.station) p += `對應光站:${input.station}\n`;
  if (input.cards) p += `\n【這次抽到的牌】\n${input.cards}\n`;
  if (input.extra) p += `\n【補充脈絡】\n${input.extra}\n`;

  p += `\n────────────────\n\n【任務】\n請依上述語氣規範與本篇規格,產出一則完整的「${v.name}」內容。\n\n必須遵守:\n1. 嚴格依三段命名撰寫,段落標題就用「${v.kong}」「${v.yu}」「${v.san}」。\n2. 傘段必須是${v.type}型。\n3. 選項數量依版型規格,每個選項標上 A、B、C…\n4. 分兩份輸出:先給【主文】(500 字內),再給【解析包】。\n5. 語氣規範中的禁區一項都不能違反。\n\n請直接開始,不需要說明你要怎麼做。`;

  const meta = `${v.name}｜${v.type}型傘段｜${v.spec}${input.station ? "｜" + input.station : ""}｜約 ${p.length} 字`;

  return { ok: true, prompt: p, meta };
}
