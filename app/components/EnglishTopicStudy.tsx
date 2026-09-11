"use client";

import { useMemo, useState } from "react";

const CONTEXT_ROOM_URL = "https://lumen-context-room-production-4a2c.up.railway.app";

function taipeiToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function EnglishTopicStudy() {
  const [open, setOpen] = useState(false);
  const [topicTitle, setTopicTitle] = useState("");
  const [classDate, setClassDate] = useState(taipeiToday());
  const [videoUrl, setVideoUrl] = useState("");

  const voiceTubeSearchUrl = useMemo(
    () => `https://tw.voicetube.com/search?query=${encodeURIComponent(topicTitle.trim())}`,
    [topicTitle],
  );
  const contextRoomUrl = useMemo(() => {
    const params = new URLSearchParams({ create: "voicetube" });
    if (topicTitle.trim()) params.set("title", topicTitle.trim());
    if (classDate) params.set("classDate", classDate);
    if (videoUrl.trim()) params.set("sourceRef", videoUrl.trim());
    return `${CONTEXT_ROOM_URL}/?${params.toString()}`;
  }, [classDate, topicTitle, videoUrl]);

  return (
    <section className="topic-study-workbench">
      <div className="topic-study-head">
        <div>
          <span className="eyebrow">VoiceTube・語境修習室</span>
          <h4>影片主題入口</h4>
          <p>行光道場安排主題；影片整理、五話題與 GPT 練習都在語境修習室完成。</p>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)}>
          {open ? "收起" : "＋ 新主題"}
        </button>
      </div>

      <div className="topic-study-route" aria-label="VoiceTube 修習流程">
        <span><b>1</b>安排主題</span>
        <i>→</i>
        <span><b>2</b>語境修習</span>
        <i>→</i>
        <span><b>3</b>成果回傳</span>
      </div>

      {open && (
        <div className="topic-study-create">
          <label>這次的課堂主題 *</label>
          <input
            className="field"
            value={topicTitle}
            onChange={(event) => setTopicTitle(event.target.value)}
            placeholder="例如：Cost of Living"
          />
          <div className="topic-study-create-row">
            <div>
              <label>上課日期</label>
              <input className="field" type="date" value={classDate} onChange={(event) => setClassDate(event.target.value)} />
            </div>
            <div>
              <label>VoiceTube 網址（可稍後補）</label>
              <input className="field" inputMode="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="topic-study-launch-actions">
            <a className="topic-study-external" href={voiceTubeSearchUrl} target="_blank" rel="noreferrer">
              先找影片 ↗
            </a>
            <a
              className={topicTitle.trim() ? "primary" : "primary disabled"}
              href={topicTitle.trim() ? contextRoomUrl : undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!topicTitle.trim()}
            >
              帶入語境修習室 ↗
            </a>
          </div>
          <small className="topic-study-boundary">
            這裡不另存第二張練習卡。完成後請從上方成果收件匣接收，或使用「手動貼回成果」。
          </small>
        </div>
      )}
    </section>
  );
}
