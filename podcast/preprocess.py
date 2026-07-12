#!/usr/bin/env python3
"""preprocess.py — 前處理模組（任務 1-2）。

preprocess_audio(input_path, output_dir)：
  1. ffmpeg 轉 16kHz mono WAV
  2. loudnorm 音量正規化（two-pass）
  3. Silero VAD 產出語音區段清單 {stem}_vad.json
  4. 原始檔絕不覆寫，輸出到 processed/

CLI：python preprocess.py raw/track1.wav [raw/track2.wav ...]
"""

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

TARGET_SR = 16000
LOUDNORM_TARGET = "I=-16:TP=-1.5:LRA=11"  # podcast 常用響度目標


def _run_ffmpeg(args: list[str]) -> subprocess.CompletedProcess:
    cmd = ["ffmpeg", "-hide_banner", "-nostdin", "-y", *args]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg 失敗：{' '.join(cmd)}\n{proc.stderr[-2000:]}")
    return proc


def _loudnorm_measure(input_path: Path) -> dict:
    """第一遍：只量測，取得 loudnorm 統計值（JSON 在 stderr 尾端）。"""
    cmd = [
        "ffmpeg", "-hide_banner", "-nostdin",
        "-i", str(input_path),
        "-af", f"loudnorm={LOUDNORM_TARGET}:print_format=json",
        "-f", "null", "-",
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"loudnorm 量測失敗：\n{proc.stderr[-2000:]}")
    stderr = proc.stderr
    start = stderr.rfind("{")
    end = stderr.rfind("}")
    if start == -1 or end == -1:
        raise RuntimeError("找不到 loudnorm 量測 JSON 輸出")
    return json.loads(stderr[start : end + 1])


def _run_vad(wav_path: Path) -> list[dict]:
    """用 Silero VAD 取得語音區段（秒）。"""
    from silero_vad import get_speech_timestamps, load_silero_vad, read_audio

    model = load_silero_vad()
    audio = read_audio(str(wav_path), sampling_rate=TARGET_SR)
    timestamps = get_speech_timestamps(
        audio, model, sampling_rate=TARGET_SR, return_seconds=True
    )
    return [{"start": float(t["start"]), "end": float(t["end"])} for t in timestamps]


def preprocess_audio(input_path: str | Path, output_dir: str | Path = "processed") -> dict:
    """前處理單一音軌。回傳 {"wav": 輸出wav路徑, "vad": vad json路徑, "segments": VAD區段}。"""
    input_path = Path(input_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if not input_path.exists():
        raise FileNotFoundError(input_path)

    out_wav = output_dir / f"{input_path.stem}.wav"
    if out_wav.resolve() == input_path.resolve():
        raise ValueError("輸出路徑與原始檔相同，拒絕覆寫原始檔")

    t0 = time.time()
    print(f"[1/3] 轉檔+loudnorm 第一遍量測：{input_path.name}", flush=True)
    stats = _loudnorm_measure(input_path)

    print("[2/3] loudnorm 第二遍套用 + 轉 16kHz mono WAV", flush=True)
    loudnorm_2nd = (
        f"loudnorm={LOUDNORM_TARGET}:"
        f"measured_I={stats['input_i']}:"
        f"measured_TP={stats['input_tp']}:"
        f"measured_LRA={stats['input_lra']}:"
        f"measured_thresh={stats['input_thresh']}:"
        f"offset={stats['target_offset']}:linear=true"
    )
    _run_ffmpeg([
        "-i", str(input_path),
        "-af", loudnorm_2nd,
        "-ar", str(TARGET_SR), "-ac", "1",
        "-c:a", "pcm_s16le",
        str(out_wav),
    ])

    print("[3/3] Silero VAD 語音區段偵測", flush=True)
    segments = _run_vad(out_wav)
    vad_path = output_dir / f"{input_path.stem}_vad.json"
    vad_path.write_text(
        json.dumps(segments, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    elapsed = time.time() - t0
    print(
        f"完成：{out_wav}（{len(segments)} 個語音區段，耗時 {elapsed:.1f}s）",
        flush=True,
    )
    return {"wav": str(out_wav), "vad": str(vad_path), "segments": segments}


def main() -> None:
    parser = argparse.ArgumentParser(description="前處理：16kHz mono + loudnorm + VAD")
    parser.add_argument("inputs", nargs="+", help="原始音檔路徑（raw/ 下）")
    parser.add_argument("--output-dir", default="processed")
    args = parser.parse_args()

    for path in args.inputs:
        preprocess_audio(path, args.output_dir)


if __name__ == "__main__":
    sys.exit(main())
