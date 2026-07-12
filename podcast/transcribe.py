#!/usr/bin/env python3
"""transcribe.py — 逐字稿轉錄模組（任務 1-3）。

transcribe_audio(audio_path, model_size="medium")：
  1. faster-whisper，word_timestamps=True，language="zh"
  2. CPU 用 int8 量化；偵測到 CUDA 用 float16
  3. 輸出 transcripts/：
     - {stem}_words.json：[{start, end, text, probability}]（逐字級）
     - {stem}_segments.json：[{start, end, text}]（句段級）
  4. 印出處理耗時與即時倍率

CLI：python transcribe.py processed/track1.wav --model medium
"""

import argparse
import json
import sys
import time
from pathlib import Path


def _detect_device() -> tuple[str, str]:
    """回傳 (device, compute_type)：CUDA→float16，否則 CPU int8。"""
    try:
        import ctranslate2

        if ctranslate2.get_cuda_device_count() > 0:
            return "cuda", "float16"
    except Exception:  # noqa: BLE001
        pass
    return "cpu", "int8"


def transcribe_audio(
    audio_path: str | Path,
    model_size: str = "medium",
    output_dir: str | Path = "transcripts",
) -> dict:
    """轉錄單一音檔，回傳 {"words": 路徑, "segments": 路徑, "duration": 秒, "elapsed": 秒}。"""
    from faster_whisper import WhisperModel

    audio_path = Path(audio_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    device, compute_type = _detect_device()
    print(f"載入模型 {model_size}（device={device}, compute_type={compute_type}）", flush=True)
    model = WhisperModel(model_size, device=device, compute_type=compute_type)

    t0 = time.time()
    segments_iter, info = model.transcribe(
        str(audio_path),
        language="zh",
        word_timestamps=True,
        vad_filter=True,
    )

    words: list[dict] = []
    segments: list[dict] = []
    for seg in segments_iter:
        segments.append(
            {"start": round(seg.start, 3), "end": round(seg.end, 3), "text": seg.text.strip()}
        )
        for w in seg.words or []:
            words.append(
                {
                    "start": round(w.start, 3),
                    "end": round(w.end, 3),
                    "text": w.word,
                    "probability": round(w.probability, 4),
                }
            )
        print(f"  [{seg.start:8.2f} → {seg.end:8.2f}] {seg.text.strip()}", flush=True)

    elapsed = time.time() - t0
    duration = float(info.duration)

    stem = audio_path.stem
    words_path = output_dir / f"{stem}_words.json"
    segments_path = output_dir / f"{stem}_segments.json"
    words_path.write_text(json.dumps(words, ensure_ascii=False, indent=2), encoding="utf-8")
    segments_path.write_text(
        json.dumps(segments, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    rtf = duration / elapsed if elapsed > 0 else 0.0
    print(
        f"完成：音檔 {duration:.1f}s，處理 {elapsed:.1f}s，即時倍率 {rtf:.2f}x"
        f"（{len(words)} 字 / {len(segments)} 句段）",
        flush=True,
    )
    return {
        "words": str(words_path),
        "segments": str(segments_path),
        "duration": duration,
        "elapsed": elapsed,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="faster-whisper 中文逐字稿轉錄")
    parser.add_argument("inputs", nargs="+", help="音檔路徑（建議用 processed/ 下的 WAV）")
    parser.add_argument("--model", default="medium", help="medium / large-v3 等")
    parser.add_argument("--output-dir", default="transcripts")
    args = parser.parse_args()

    for path in args.inputs:
        transcribe_audio(path, model_size=args.model, output_dir=args.output_dir)


if __name__ == "__main__":
    sys.exit(main())
