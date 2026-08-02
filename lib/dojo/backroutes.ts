// 返回導航的靜態階層(擁有者指示:點擊回到「上一層」,不是回首頁,且不依賴
// 實際瀏覽紀錄——不管使用者從哪裡進來,場域子頁一律回到該場域首頁、場域首頁
// 一律回到居所)。這份對照表就是那個固定的「上一層」定義。
//
// 對照依據:各頁面掛在哪個場域底下,沿用委派書與各頁面既有的頁籤/連結關係
// (聊解室→任務管理站/組稿台/序列展開/日上三更/噗浪蓋樓;織光堂→生產日工作台;
// 收光→快速評分)。部分頁面(如任務管理站)同時被多處連結,取其中一個文件上
// 明訂的「主要掛載場域」當作固定上一層,不做「依實際點擊路徑動態判斷」的
// 複雜邏輯——那需要追蹤來源,超出這次要求的範圍。
export const PARENT_ROUTE: Record<string, string> = {
  "/overview": "/",
  "/map": "/",
  "/review": "/",
  "/assistant": "/",
  "/practice": "/",
  "/forage": "/",
  "/weaving": "/",
  "/liaojie": "/",
  "/dao": "/",
  "/closing": "/",
  "/sanko": "/liaojie",
  "/plurk": "/liaojie",
  "/sessions": "/liaojie",
  "/generate": "/liaojie",
  "/expand": "/liaojie",
  "/feedback": "/closing",
  "/production-day": "/weaving",
};

export const ROUTE_LABEL: Record<string, string> = {
  "/": "居所",
  "/overview": "看整月",
  "/map": "探索",
  "/review": "回看",
  "/assistant": "執事",
  "/practice": "修習所",
  "/forage": "野採",
  "/weaving": "織光堂",
  "/liaojie": "聊解室",
  "/dao": "道藏",
  "/closing": "收光",
  "/sanko": "日上三更",
  "/plurk": "噗浪蓋樓",
  "/sessions": "任務管理站",
  "/generate": "組稿台",
  "/expand": "序列展開",
  "/feedback": "快速評分",
  "/production-day": "生產日工作台",
};

// 這些頁面是跨場域的工具頁,任何場域都能開啟,沒有單一固定的邏輯上層——用
// 瀏覽器實際返回(router.back(),回到真正呼叫它的那一頁)比套一個固定父層更
// 符合直覺。
export const USE_BROWSER_BACK = new Set<string>(["/timer"]);

// 不顯示返回鍵的頁面:居所本身(規格明文排除),以及登入前的門禁頁。
export const NO_BACK_BUTTON = new Set<string>(["/", "/unlock"]);
