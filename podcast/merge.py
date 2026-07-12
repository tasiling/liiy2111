#!/usr/bin/env python3
"""merge.py — 合併對齊模組（任務 1-5）。

merge_transcript_speakers(words_json, speakers_json)：
  1. 依時間戳把逐字級轉錄對到講者區段（取重疊時間最長者；
     完全無重疊時取時間中點最近的區段）
  2. 相鄰同講者的字合併成句段（間隔超過 max_gap_seconds 斷句）
  3. 輸出：
     - {stem}_merged.json：[{speaker, start, end, text}]
     - {stem}_transcript.txt：人類可讀版 [00:01:23] 9U：……
  4. 講者顯示名稱對照表在 config.json 的 speaker_names

CLI：python merge.py transcripts/track1_words.json transcripts/xxx_speakers.json
"""

import argparse
import json
import sys
from pathlib import Path

DEFAULT_CONFIG = {
    "speaker_names": {},
    "merge": {"max_gap_seconds": 1.0, "max_segment_seconds": 30.0},
}


def load_config(config_path: str | Path = "config.json") -> dict:
    path = Path(config_path)
    config = json.loads(json.dumps(DEFAULT_CONFIG))  # deep copy
    if path.exists():
        user_cfg = json.loads(path.read_text(encoding="utf-8"))
        config["speaker_names"].update(user_cfg.get("speaker_names", {}))
        config["merge"].update(user_cfg.get("merge", {}))
    return config


def _overlap(a_start: float, a_end: float, b_start: float, b_end: float) -> float:
    return max(0.0, min(a_end, b_end) - max(a_start, b_start))


def _assign_speaker(word: dict, speaker_segments: list[dict]) -> str:
    """取重疊時間最長的講者區段；無重疊則取中點距離最近者。"""
    best_speaker, best_overlap = None, 0.0
    for seg in speaker_segments:
        ov = _overlap(word["start"], word["end"], seg["start"], seg["end"])
        if ov > best_overlap:
            best_speaker, best_overlap = seg["speaker"], ov
    if best_speaker is not None:
        return best_speaker

    mid = (word["start"] + word["end"]) / 2
    nearest = min(
        speaker_segments,
        key=lambda s: min(abs(mid - s["start"]), abs(mid - s["end"])),
        default=None,
    )
    return nearest["speaker"] if nearest else "SPEAKER_??"


def _format_ts(seconds: float) -> str:
    seconds = max(0, int(seconds))
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


def merge_transcript_speakers(
    words_json: str | Path,
    speakers_json: str | Path,
    output_dir: str | Path = "transcripts",
    config_path: str | Path = "config.json",
    stem: str | None = None,
) -> dict:
    """合併逐字稿與講者區段。回傳 {"merged": 路徑, "transcript": 路徑, "segments": 清單}。"""
    words_json = Path(words_json)
    speakers_json = Path(speakers_json)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    config = load_config(config_path)
    max_gap = float(config["merge"]["max_gap_seconds"])
    max_len = float(config["merge"]["max_segment_seconds"])
    names = config["speaker_names"]

    words = json.loads(words_json.read_text(encoding="utf-8"))
    speaker_segments = json.loads(speakers_json.read_text(encoding="utf-8"))
    if not words:
        raise ValueError(f"{words_json} 沒有任何字")

    words = sorted(words, key=lambda w: w["start"])
    for w in words:
        w["speaker"] = _assign_speaker(w, speaker_segments)

    # 相鄰同講者合併成句段
    merged: list[dict] = []
    current: dict | None = None
    for w in words:
        new_needed = (
            current is None
            or w["speaker"] != current["speaker"]
            or w["start"] - current["end"] > max_gap
            or w["end"] - current["start"] > max_len
        )
        if new_needed:
            if current:
                merged.append(current)
            current = {
                "speaker": w["speaker"],
                "start": w["start"],
                "end": w["end"],
                "text": w["text"].strip(),
            }
        else:
            current["end"] = w["end"]
            current["text"] += w["text"].strip()
    if current:
        merged.append(current)

    stem = stem or words_json.stem.removesuffix("_words")
    merged_path = output_dir / f"{stem}_merged.json"
    merged_path.write_text(
        json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    lines = [
        f"[{_format_ts(seg['start'])}] {names.get(seg['speaker'], seg['speaker'])}：{seg['text']}"
        for seg in merged
    ]
    txt_path = output_dir / f"{stem}_transcript.txt"
    txt_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"完成：{merged_path}（{len(merged)} 句段）", flush=True)
    print(f"完成：{txt_path}", flush=True)
    return {"merged": str(merged_path), "transcript": str(txt_path), "segments": merged}


def main() -> None:
    parser = argparse.ArgumentParser(description="合併逐字稿與講者區段")
    parser.add_argument("words_json", help="{stem}_words.json 路徑")
    parser.add_argument("speakers_json", help="{stem}_speakers.json 路徑")
    parser.add_argument("--output-dir", default="transcripts")
    parser.add_argument("--config", default="config.json")
    parser.add_argument("--stem", default=None, help="輸出檔名前綴（預設取 words_json 的 stem）")
    args = parser.parse_args()

    merge_transcript_speakers(
        args.words_json,
        args.speakers_json,
        output_dir=args.output_dir,
        config_path=args.config,
        stem=args.stem,
    )


if __name__ == "__main__":
    sys.exit(main())
