// 解析 DB-04「抽出順序」欄位的權威順序字串。
// 格式(總綱 v2.3):逗號分隔的卡片識別碼,逆位在識別碼後綴 R,如 "MP-15, TA-05R, MP-09"。
// 不新增欄位,逆位純粹是字串記法。

export type ParsedCardRef = { identifier: string; reversed: boolean };

export function parseDrawOrder(orderText: string): ParsedCardRef[] {
  return orderText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token) => {
      const reversed = /R$/.test(token);
      const identifier = reversed ? token.slice(0, -1) : token;
      return { identifier, reversed };
    });
}
