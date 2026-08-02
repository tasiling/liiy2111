// 霍金斯意識能量量表(0–1000)。依三方協作規格書 v1.3 §2.3/§3.5.1:測頻是「紀錄
// 本身」——單筆數值＋對應狀態標籤與色彩要保留,不是評分。這裡只提供「單筆數值
// →標籤/色彩」的查詢,不做任何跨筆彙總(平均、排名、趨勢一律不在此檔案的職責內,
// 也不應該在別處出現)。
//
// 色彩是工程端為了讓 17 個等級可視覺區分所給的漸層(低→高沿色相由靜到暖金),
// 不是美術定案——三方協作規格書分工表明訂「美術風格判斷」不是 Claude/Code 的
// 職責,若擁有者或 GPT 之後要给一組正式配色,直接替換這裡的 color 欄位即可,
// 不影響其他程式邏輯。

export type HawkinsLevel = {
  value: number; // 該等級的起始值(門檻)
  label: string;
  color: string;
};

const RAW_LEVELS: { value: number; label: string }[] = [
  { value: 20, label: "羞恥" },
  { value: 30, label: "內疚" },
  { value: 50, label: "冷淡" },
  { value: 75, label: "悲傷" },
  { value: 100, label: "恐懼" },
  { value: 125, label: "欲求" },
  { value: 150, label: "憤怒" },
  { value: 175, label: "驕傲" },
  { value: 200, label: "勇氣" },
  { value: 250, label: "中立" },
  { value: 310, label: "願意" },
  { value: 350, label: "接納" },
  { value: 400, label: "理性理解" },
  { value: 500, label: "愛" },
  { value: 540, label: "喜悅" },
  { value: 600, label: "安詳" },
  { value: 700, label: "開悟" },
];

const HUE_LOW = 260; // 靜、內收的色相(低等級)
const HUE_HIGH = 42; // 暖金色相(高等級)

export const HAWKINS_LEVELS: HawkinsLevel[] = RAW_LEVELS.map((lvl, i) => {
  const t = i / (RAW_LEVELS.length - 1);
  const hue = Math.round(HUE_LOW - (HUE_LOW - HUE_HIGH) * t);
  return { ...lvl, color: `hsl(${hue}, 38%, 45%)` };
});

export const HAWKINS_MIN = 0;
export const HAWKINS_MAX = 1000;

// 找最後一個「門檻 <= value」的等級;value 超出表列範圍時夾在頭尾,不拋錯。
export function resolveHawkinsLevel(value: number): HawkinsLevel {
  let level = HAWKINS_LEVELS[0];
  for (const lvl of HAWKINS_LEVELS) {
    if (value >= lvl.value) level = lvl;
  }
  return level;
}

export function formatHawkinsLabel(value: number): string {
  return `${value}・${resolveHawkinsLevel(value).label}`;
}

// 回看篩選用的三段分類(淺／中／深),依指示簡化自十七個狀態按鈕。
// 分界點是 0–1000 三等分,規格未明訂精確門檻——若擁有者之後想改分界,只需要
// 調整這裡的兩個常數,不影響其他程式邏輯。
export type FreqBand = "shallow" | "mid" | "deep";
export const FREQ_BAND_LABELS: Record<FreqBand, string> = { shallow: "淺", mid: "中", deep: "深" };

export function resolveFreqBand(value: number): FreqBand {
  if (value <= 333) return "shallow";
  if (value <= 666) return "mid";
  return "deep";
}
