// P8-0 組稿選項表單(委派書 v1.6 第四章):封面 + 維度/方法 + 備註。
// 表單內容只組進提示詞,不寫入任何資料庫(臨場選擇非權威資料)——純格式化函式,
// 無 Notion 依賴,前後端(client 頁面與 API route)可共用同一份邏輯。

export type ServiceDivinationChoice = {
  標題: string;
  主維度: string[];
  方法: string; // 可能已被擁有者換成對照表以外的方法,不強制等於原始解析值
  方法說明: string;
  題目: string[];
};

export type P8ZeroInput = {
  coverText?: string;
  coverCanvaCode?: string;
  serviceDivination?: ServiceDivinationChoice | null;
  note?: string;
};

export function buildP8ZeroSection(input: P8ZeroInput): string[] {
  const lines: string[] = ["", "【封面】"];
  if (input.coverText || input.coverCanvaCode) {
    if (input.coverText) lines.push(`文字描述:${input.coverText}`);
    if (input.coverCanvaCode) lines.push(`Canva 模板編號:${input.coverCanvaCode}`);
  } else {
    lines.push("封面未指定");
  }

  if (input.serviceDivination) {
    const sd = input.serviceDivination;
    lines.push("", "【維度/方法(心理測驗)】");
    lines.push(`服務:${sd.標題}`);
    lines.push(`主維度:${sd.主維度.join("、")}`);
    lines.push(`方法:${sd.方法}`);
    if (sd.方法說明) lines.push(`方法說明:${sd.方法說明}`);
    if (sd.題目.length > 0) {
      lines.push(`題目:${sd.題目.map((q, i) => `${i + 1}. ${q}`).join(" ")}`);
    }
  }

  if (input.note) {
    lines.push("", "【其他臨場備註】");
    lines.push(input.note);
  }

  return lines;
}
