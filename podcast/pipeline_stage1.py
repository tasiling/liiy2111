#!/usr/bin/env python3
"""pipeline_stage1.py — 第一階段整合腳本（任務 1-6）。

輸入：雙軌原始音檔路徑 x2
流程：前處理 → 轉錄 → 分講者（雙軌VAD法）→ 合併
輸出：完整帶講者、時間戳的逐字稿（json + txt）

特性：
  - 每階段完成印出進度與耗時
  - 中間產物已存在就跳過該階段（斷點重跑）；--force 全部重跑
  - --model 切換 medium / large-v3

用法：python pipeline_stage1.py raw/track1.wav raw/track2.wav --model medium
"""

import argparse
import json
import sys
import time
from pathlib import Path

from diarize import diarize_from_tracks
from merge import merge_transcript_speakers
from preprocess import preprocess_audio
from transcribe import transcribe_audio

PROCESSED_DIR = Path("processed")
TRANSCRIPTS_DIR = Path("transcripts")


def _stage(title: str):
    print(f"\n===== {title} =====", flush=True)
    return time.time()


def _done(t0: float) -> None:
    print(f"----- 階段耗時 {time.time() - t0:.1f}s -----", flush=True)


def run_pipeline(track1: Path, track2: Path, model: str, force: bool) -> dict:
    tracks = [track1, track2]
    pipeline_t0 = time.time()

    # ---- 階段 1：前處理 ----
    t0 = _stage("階段 1/4：前處理（16kHz mono + loudnorm + VAD）")
    processed: list[Path] = []
    for track in tracks:
        out_wav = PROCESSED_DIR / f"{track.stem}.wav"
        vad_json = PROCESSED_DIR / f"{track.stem}_vad.json"
        if not force and out_wav.exists() and vad_json.exists():
            print(f"[跳過] {out_wav} 與 {vad_json} 已存在", flush=True)
        else:
            preprocess_audio(track, PROCESSED_DIR)
        processed.append(out_wav)
    _done(t0)

    # ---- 階段 2：轉錄 ----
    t0 = _stage(f"階段 2/4：轉錄（faster-whisper {model}）")
    words_paths: list[Path] = []
    for wav in processed:
        words_json = TRANSCRIPTS_DIR / f"{wav.stem}_words.json"
        if not force and words_json.exists():
            print(f"[跳過] {words_json} 已存在", flush=True)
        else:
            transcribe_audio(wav, model_size=model, output_dir=TRANSCRIPTS_DIR)
        words_paths.append(words_json)
    _done(t0)

    # ---- 階段 3：分講者（雙軌 VAD 法）----
    t0 = _stage("階段 3/4：分講者（雙軌 VAD 法，軌1=SPEAKER_00、軌2=SPEAKER_01）")
    combined_stem = f"{track1.stem}+{track2.stem}"
    speakers_json = TRANSCRIPTS_DIR / f"{combined_stem}_speakers.json"
    if not force and speakers_json.exists():
        print(f"[跳過] {speakers_json} 已存在", flush=True)
    else:
        diarize_from_tracks(
            processed[0], processed[1], output_dir=TRANSCRIPTS_DIR, stem=combined_stem
        )
    _done(t0)

    # ---- 階段 4：合併 ----
    t0 = _stage("階段 4/4：合併對齊（逐字稿 x 講者區段）")
    combined_words = TRANSCRIPTS_DIR / f"{combined_stem}_words.json"
    if force or not combined_words.exists():
        all_words: list[dict] = []
        for path in words_paths:
            all_words.extend(json.loads(path.read_text(encoding="utf-8")))
        all_words.sort(key=lambda w: w["start"])
        combined_words.write_text(
            json.dumps(all_words, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"合併雙軌逐字稿：{combined_words}（{len(all_words)} 字）", flush=True)
    result = merge_transcript_speakers(
        combined_words, speakers_json, output_dir=TRANSCRIPTS_DIR, stem=combined_stem
    )
    _done(t0)

    total = time.time() - pipeline_t0
    print(f"\n✅ 全部完成，總耗時 {total:.1f}s", flush=True)
    print(f"  逐字稿 JSON：{result['merged']}", flush=True)
    print(f"  逐字稿 TXT ：{result['transcript']}", flush=True)
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="第一階段：雙軌原始音檔 → 帶講者逐字稿")
    parser.add_argument("track1", help="講者A 原始音軌（raw/ 下）")
    parser.add_argument("track2", help="講者B 原始音軌（raw/ 下）")
    parser.add_argument("--model", default="medium", help="whisper 模型：medium / large-v3")
    parser.add_argument("--force", action="store_true", help="忽略既有中間產物，全部重跑")
    args = parser.parse_args()

    track1, track2 = Path(args.track1), Path(args.track2)
    for track in (track1, track2):
        if not track.exists():
            print(f"找不到音檔：{track}", file=sys.stderr)
            return 1

    try:
        run_pipeline(track1, track2, model=args.model, force=args.force)
    except Exception as e:  # noqa: BLE001
        print(f"\n❌ 中斷：{e}", file=sys.stderr)
        print("已完成的中間產物已保留在 processed/ 與 transcripts/，"
              "修正問題後重跑同一指令即可從斷點續跑。", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
