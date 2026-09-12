# 行光道場｜LINE 剪藏入口第一階段

## 定位

LINE 只作為「擷取」的外部入口。網址或截圖保存後一律進入既有野採採集匣，
不會自動建立織光案、修習活動、今日三件事或週盤格。

## 支援範圍

- 純網址：保存網址，嘗試擷取標題、描述、預覽圖與平台。
- 純截圖：原圖上傳到該筆 DB-14 擷取頁面，不保存於 Railway 暫存磁碟。
- 補截圖：網址剪藏回覆中的「補截圖」按鈕會開啟十分鐘附加窗口。
- 用途：內容觀點、視覺參考、學習資料、待研究、先收著。
- 去重：LINE message ID 與正規化網址重複時不建立第二筆。
- 安全：驗證 `X-Line-Signature`，並只接受 `LINE_ALLOWED_USER_ID`。

第一階段不做 OCR、AI 圖像理解或 AI 分類；這些功能需要另行選定模型及費用策略。
原圖與原始網址永遠保留，後續摘要不會覆蓋它們。

## Railway 環境變數

```text
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_ALLOWED_USER_ID=
```

第一次設定時可先留空 `LINE_ALLOWED_USER_ID`。完成 LINE webhook 驗證並傳一則訊息給
機器人後，它會回覆該帳號的 user ID；把它填回 Railway 後重新部署即可。未設定擁有者
期間不會寫入任何擷取資料。

## LINE Developers 設定

Webhook URL：

```text
https://lumen-dojo.up.railway.app/api/integrations/line/webhook
```

啟用 webhook，並關閉 Official Account Manager 內與剪藏入口衝突的自動回覆。
