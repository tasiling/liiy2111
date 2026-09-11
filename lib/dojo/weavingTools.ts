import { TEXT_SUBTYPES, type WeavingProject } from "./weavingProjects";

export type WeavingTool = { key: string; label: string; note: string; href: string | null };
export const WEAVING_TEXT_TOOLS: Record<string, WeavingTool> = {
  article: { key: "copy_prompt_article", label: "長文寫作指令", note: "複製完整指令後，在慣用的 AI 對話完成。", href: null },
  plurk: { key: "plurk_tower", label: "噗浪蓋樓台", note: "可建立主噗、樓層、排程與發布狀態。", href: "/plurk" },
  instagram_carousel: { key: "copy_prompt_carousel", label: "IG 輪播指令", note: "輪播工具正式位置尚未登錄，先複製指令完成文案。", href: null },
  instagram_story: { key: "copy_prompt_story", label: "IG 限動文字指令", note: "先完成一組限動文字，再貼回預覽。", href: null },
  spoken_script: { key: "copy_prompt_spoken", label: "口播初稿指令", note: "只處理文字腳本，不建立影片任務。", href: null },
  lesson_legacy: { key: "copy_prompt_lesson", label: "既有教學內容指令", note: "保留舊企劃，不新增為第一階段預設形式。", href: null },
};

export function weavingPrompt(project: WeavingProject): string {
  const subtype = TEXT_SUBTYPES[project.formatSubtype as keyof typeof TEXT_SUBTYPES] ?? project.formatSubtype;
  return `你現在協助我完成一件「${subtype}」。\n\n【來源素材】\n${project.sourceSnapshot || "（這次由我手動提供題材）"}\n\n【本次唯一核心主張】\n${project.coreStatement}\n\n【受眾】\n${project.audience || "請先以能理解這個主題的一般讀者為主，不要自行虛構精細人設。"}\n\n【製作要求】\n- 先忠實使用來源與我的觀點，不把引用資料冒充成我的主張。\n- 不自動延伸成漫畫或影片任務。\n- 語氣自然、清楚、有觀點，保留「全零聊解室」可以再品牌化的空間。\n- 產出完整的 ${subtype}，不要只給大綱。\n- 若素材不足，明確指出缺口，不要捏造。\n\n完成後，我會把文字貼回行光道場預覽並確認保存。`;
}
