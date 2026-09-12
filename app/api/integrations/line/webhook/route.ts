import { NextRequest, NextResponse } from "next/server";
import {
  appendCaptureImage,
  createCaptureEntry,
  listCaptureEntries,
  saveCaptureEntry,
} from "@/lib/dojo/captureStore";
import {
  clipQuickReply,
  extractFirstUrl,
  fetchLineImage,
  fetchWebPreview,
  normalizeClipUrl,
  platformFromUrl,
  replyLineMessage,
  verifyLineSignature,
  type LineWebhookBody,
  type LineWebhookEvent,
} from "@/lib/dojo/lineClipping";
import { CAPTURE_CLIP_PURPOSES, type CaptureClipMeta, type CaptureClipPurpose } from "@/lib/dojo/formal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function emptyClip(overrides: Partial<CaptureClipMeta>): CaptureClipMeta {
  return {
    origin: "line",
    purpose: "saveFirst",
    sourceKind: "note",
    platform: "LINE",
    externalEventId: "",
    externalMessageId: "",
    awaitingScreenshotUntil: null,
    webPreview: { description: "", imageUrl: "", fetchedAt: null, status: "none" },
    attachments: [],
    ...overrides,
  };
}

function screenshotTitle(now = new Date()): string {
  const stamp = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  return `截圖・${stamp}`;
}

function imageFilename(messageId: string, mimeType: string): string {
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  return `line-${messageId.replace(/[^a-zA-Z0-9_-]/g, "").slice(-40) || Date.now()}.${extension}`;
}

async function handleText(event: LineWebhookEvent, userId: string): Promise<void> {
  const messageId = event.message?.id ?? "";
  const text = event.message?.text?.trim() ?? "";
  const foundUrl = extractFirstUrl(text);
  if (!foundUrl) {
    await replyLineMessage(event.replyToken ?? "", "這個入口目前接收網頁網址與截圖。把網址直接貼過來，或傳送一張截圖即可。");
    return;
  }

  const sourceUrl = normalizeClipUrl(foundUrl);
  const captures = await listCaptureEntries();
  const duplicate = captures.find((capture) =>
    capture.clip.externalMessageId === messageId ||
    (capture.clip.origin === "line" && capture.sourceUrl === sourceUrl)
  );
  if (duplicate) {
    await replyLineMessage(
      event.replyToken ?? "",
      `這個網頁已經在野採採集匣裡：\n「${duplicate.title}」`,
      clipQuickReply(duplicate.id, duplicate.clip.attachments.length === 0)
    );
    return;
  }

  const preview = await fetchWebPreview(sourceUrl);
  const note = text.replace(foundUrl, "").trim();
  const capture = await createCaptureEntry({
    title: preview.title || platformFromUrl(sourceUrl),
    category: null,
    excerpt: preview.description,
    sourceUrl,
    note,
    clip: emptyClip({
      sourceKind: "webpage",
      platform: preview.platform,
      externalEventId: event.webhookEventId ?? "",
      externalMessageId: messageId,
      webPreview: {
        description: preview.description,
        imageUrl: preview.imageUrl,
        fetchedAt: preview.fetchedAt,
        status: preview.status,
      },
    }),
  });

  const previewNote = preview.status === "unavailable" ? "網址已保存；這個網站目前無法自動讀取摘要。" : "網址與網頁資訊已保存。";
  await replyLineMessage(
    event.replyToken ?? "",
    `已剪藏｜${preview.platform}\n「${capture.title}」\n${previewNote}\n可以順手標記用途，也可以先不處理。`,
    clipQuickReply(capture.id, true)
  );
  void userId;
}

async function handleImage(event: LineWebhookEvent): Promise<void> {
  const messageId = event.message?.id ?? "";
  if (!messageId) throw new Error("LINE 圖片缺少 message id");
  const captures = await listCaptureEntries();
  const duplicate = captures.find((capture) => capture.clip.attachments.some((item) => item.sourceMessageId === messageId));
  if (duplicate) {
    await replyLineMessage(event.replyToken ?? "", `這張截圖已經保存於「${duplicate.title}」。`, clipQuickReply(duplicate.id, false));
    return;
  }

  const now = new Date();
  let capture = captures.find((item) =>
    item.clip.origin === "line" &&
    item.clip.awaitingScreenshotUntil !== null &&
    new Date(item.clip.awaitingScreenshotUntil).getTime() > now.getTime()
  );
  if (!capture) {
    capture = await createCaptureEntry({
      title: screenshotTitle(now),
      category: null,
      excerpt: "",
      sourceUrl: "",
      note: "",
      clip: emptyClip({
        sourceKind: "screenshot",
        platform: "LINE 截圖",
        externalEventId: event.webhookEventId ?? "",
        externalMessageId: messageId,
      }),
    });
  }

  const image = await fetchLineImage(messageId);
  capture = await appendCaptureImage({
    capture,
    bytes: image.bytes,
    mimeType: image.mimeType,
    filename: imageFilename(messageId, image.mimeType),
    sourceMessageId: messageId,
  });
  await replyLineMessage(
    event.replyToken ?? "",
    capture.sourceUrl
      ? `截圖已補到「${capture.title}」，網址與原圖保存在同一筆素材。`
      : "截圖已保存，並送進野採採集匣。可以順手標記用途，也可以先不處理。",
    clipQuickReply(capture.id, false)
  );
}

async function handlePostback(event: LineWebhookEvent): Promise<void> {
  const params = new URLSearchParams(event.postback?.data ?? "");
  const captureId = params.get("captureId") ?? "";
  const action = params.get("action");
  if (!captureId) return;
  const captures = await listCaptureEntries();
  const capture = captures.find((item) => item.id === captureId && item.clip.origin === "line");
  if (!capture) {
    await replyLineMessage(event.replyToken ?? "", "找不到這筆剪藏，可能已經被移除。");
    return;
  }

  if (action === "purpose") {
    const purpose = params.get("purpose") as CaptureClipPurpose | null;
    if (!purpose || !(purpose in CAPTURE_CLIP_PURPOSES)) return;
    await saveCaptureEntry({ ...capture, clip: { ...capture.clip, purpose } });
    await replyLineMessage(event.replyToken ?? "", `已標記為「${CAPTURE_CLIP_PURPOSES[purpose]}」。素材仍留在野採待處理。`);
    return;
  }
  if (action === "awaitScreenshot") {
    const awaitingScreenshotUntil = new Date(Date.now() + 10 * 60_000).toISOString();
    await saveCaptureEntry({ ...capture, clip: { ...capture.clip, awaitingScreenshotUntil } });
    await replyLineMessage(event.replyToken ?? "", "請在十分鐘內傳送截圖；下一張圖片會補到這筆網址素材。");
  }
}

async function handleEvent(event: LineWebhookEvent, allowedUserId: string): Promise<void> {
  const userId = event.source?.userId ?? "";
  if (!userId) return;
  if (!allowedUserId) {
    await replyLineMessage(
      event.replyToken ?? "",
      `LINE 剪藏入口尚未指定擁有者。請把以下 user ID 加到 Railway 的 LINE_ALLOWED_USER_ID：\n${userId}`
    );
    return;
  }
  if (userId !== allowedUserId) return;
  if (event.type === "message" && event.message?.type === "text") return handleText(event, userId);
  if (event.type === "message" && event.message?.type === "image") return handleImage(event);
  if (event.type === "postback") return handlePostback(event);
  if (event.type === "message") {
    await replyLineMessage(event.replyToken ?? "", "目前只接收網頁網址與截圖。其他素材可以先留在原本的 LINE 收藏處。");
  }
}

export async function POST(req: NextRequest) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET ?? "";
  const allowedUserId = process.env.LINE_ALLOWED_USER_ID ?? "";
  if (!channelSecret) {
    return NextResponse.json({ error: "LINE 剪藏入口尚未完成環境設定" }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";
  if (!verifyLineSignature(rawBody, signature, channelSecret)) {
    return NextResponse.json({ error: "LINE 簽章驗證失敗" }, { status: 401 });
  }

  let body: LineWebhookBody;
  try { body = JSON.parse(rawBody) as LineWebhookBody; }
  catch { return NextResponse.json({ error: "LINE webhook JSON 格式錯誤" }, { status: 400 }); }

  try {
    for (const event of body.events ?? []) await handleEvent(event, allowedUserId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("LINE clipping webhook failed", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "LINE 剪藏處理失敗" }, { status: 500 });
  }
}
