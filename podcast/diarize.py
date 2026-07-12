#!/usr/bin/env python3
"""diarize.py — 分講者辨識模組（任務 1-4）。

兩種方法：
  1. diarize_speakers(audio_path, num_speakers=2)：
     pyannote.audio 3.1 pipeline（單軌備援用）
  2. diarize_from_tracks(track1_path, track2_path)：
     雙軌分開錄音時，直接用各軌 VAD 結果標講者
     （軌1=SPEAKER_00、軌2=SPEAKER_01），不跑 pyannote，更準也更快。

輸出 transcripts/{stem}_speakers.json：
  [{"speaker": "SPEAKER_00", "start": float, "end": float}]

CLI：
  python diarize.py processed/mixed.wav
  python diarize.py --tracks processed/track1.wav processed/track2.wav
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path


def _load_hf_token() -> str | None:
    try:
        from dotenv import load_dotenv

        load_dotenv()
    except Exception:  # noqa: BLE001
        pass
    return os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_TOKEN")


def _write_speakers(segments: list[dict], stem: str, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / f"{stem}_speakers.json"
    out_path.write_text(
        json.dumps(segments, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return out_path


def diarize_speakers(
    audio_path: str | Path,
    num_speakers: int = 2,
    output_dir: str | Path = "transcripts",
) -> dict:
    """pyannote 3.1 分講者（單軌備援）。回傳 {"speakers": 路徑, "segments": 清單}。"""
    from pyannote.audio import Pipeline

    audio_path = Path(audio_path)
    token = _load_hf_token()
    if not token:
        raise RuntimeError(".env 沒有 HF_TOKEN，pyannote 需要（見 SETUP.md 第 3 節）")

    print("載入 pyannote/speaker-diarization-3.1 pipeline…", flush=True)
    pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization-3.1", use_auth_token=token
    )
    if pipeline is None:
        raise RuntimeError("pipeline 載入失敗，多半是模型授權條款沒同意（見 SETUP.md）")

    try:
        import torch

        if torch.cuda.is_available():
            pipeline.to(torch.device("cuda"))
    except Exception:  # noqa: BLE001
        pass

    t0 = time.time()
    annotation = pipeline(str(audio_path), num_speakers=num_speakers)
    segments = [
        {"speaker": speaker, "start": round(turn.start, 3), "end": round(turn.end, 3)}
        for turn, _, speaker in annotation.itertracks(yield_label=True)
    ]
    segments.sort(key=lambda s: s["start"])
    out_path = _write_speakers(segments, audio_path.stem, Path(output_dir))
    print(
        f"完成（pyannote）：{out_path}（{len(segments)} 區段，耗時 {time.time() - t0:.1f}s）",
        flush=True,
    )
    return {"speakers": str(out_path), "segments": segments}


def _vad_segments_for_track(track_path: Path) -> list[dict]:
    """優先讀取前處理產出的 {stem}_vad.json；沒有就現跑 Silero VAD。"""
    vad_path = track_path.parent / f"{track_path.stem}_vad.json"
    if vad_path.exists():
        return json.loads(vad_path.read_text(encoding="utf-8"))
    print(f"  找不到 {vad_path.name}，改為現場跑 Silero VAD", flush=True)
    from preprocess import _run_vad

    return _run_vad(track_path)


def diarize_from_tracks(
    track1_path: str | Path,
    track2_path: str | Path,
    output_dir: str | Path = "transcripts",
    stem: str | None = None,
) -> dict:
    """雙軌 VAD 法：軌1=SPEAKER_00、軌2=SPEAKER_01。

    回傳 {"speakers": 路徑, "segments": 清單}。
    """
    track1_path = Path(track1_path)
    track2_path = Path(track2_path)

    t0 = time.time()
    segments: list[dict] = []
    for track, speaker in ((track1_path, "SPEAKER_00"), (track2_path, "SPEAKER_01")):
        print(f"讀取 VAD：{track.name} → {speaker}", flush=True)
        for seg in _vad_segments_for_track(track):
            segments.append(
                {
                    "speaker": speaker,
                    "start": round(float(seg["start"]), 3),
                    "end": round(float(seg["end"]), 3),
                }
            )
    segments.sort(key=lambda s: s["start"])

    stem = stem or f"{track1_path.stem}+{track2_path.stem}"
    out_path = _write_speakers(segments, stem, Path(output_dir))
    print(
        f"完成（雙軌VAD）：{out_path}（{len(segments)} 區段，耗時 {time.time() - t0:.1f}s）",
        flush=True,
    )
    return {"speakers": str(out_path), "segments": segments}


def main() -> None:
    parser = argparse.ArgumentParser(description="分講者辨識：pyannote 或雙軌 VAD 法")
    parser.add_argument("audio", nargs="?", help="單軌（混音）音檔路徑，走 pyannote")
    parser.add_argument(
        "--tracks", nargs=2, metavar=("TRACK1", "TRACK2"), help="雙軌音檔路徑，走 VAD 法"
    )
    parser.add_argument("--num-speakers", type=int, default=2)
    parser.add_argument("--output-dir", default="transcripts")
    args = parser.parse_args()

    if args.tracks:
        diarize_from_tracks(args.tracks[0], args.tracks[1], output_dir=args.output_dir)
    elif args.audio:
        diarize_speakers(args.audio, num_speakers=args.num_speakers, output_dir=args.output_dir)
    else:
        parser.error("請提供單軌音檔路徑，或用 --tracks 提供雙軌")


if __name__ == "__main__":
    sys.exit(main())
