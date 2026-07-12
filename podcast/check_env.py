#!/usr/bin/env python3
"""check_env.py — 逐項驗證環境，印出 PASS/FAIL。

檢查項目：
  1. ffmpeg 可執行
  2. 必要 Python 套件可 import
  3. HF token 有效（.env 的 HF_TOKEN）
  4. pyannote/speaker-diarization-3.1 pipeline 可下載並載入
"""

import os
import shutil
import subprocess
import sys

RESULTS: list[tuple[str, bool, str]] = []


def record(name: str, ok: bool, detail: str = "") -> None:
    RESULTS.append((name, ok, detail))
    status = "PASS" if ok else "FAIL"
    line = f"[{status}] {name}"
    if detail:
        line += f" — {detail}"
    print(line, flush=True)


def check_ffmpeg() -> bool:
    path = shutil.which("ffmpeg")
    if not path:
        record("ffmpeg 可執行", False, "找不到 ffmpeg，請先安裝（見 SETUP.md 第 1 節）")
        return False
    try:
        out = subprocess.run(
            ["ffmpeg", "-version"], capture_output=True, text=True, timeout=15
        )
        version = out.stdout.splitlines()[0] if out.stdout else ""
        record("ffmpeg 可執行", out.returncode == 0, version)
        return out.returncode == 0
    except Exception as e:  # noqa: BLE001
        record("ffmpeg 可執行", False, str(e))
        return False


def check_imports() -> bool:
    ok = True
    for mod, hint in [
        ("faster_whisper", "pip install faster-whisper"),
        ("pyannote.audio", "pip install 'pyannote.audio>=3.1'"),
        ("pydub", "pip install pydub"),
        ("ffmpeg", "pip install ffmpeg-python"),
        ("silero_vad", "pip install silero-vad"),
        ("dotenv", "pip install python-dotenv"),
        ("huggingface_hub", "pip install huggingface_hub"),
    ]:
        try:
            __import__(mod)
            record(f"import {mod}", True)
        except Exception as e:  # noqa: BLE001
            record(f"import {mod}", False, f"{e}（{hint}）")
            ok = False
    return ok


def load_token() -> str | None:
    try:
        from dotenv import load_dotenv

        load_dotenv()
    except Exception:  # noqa: BLE001
        pass
    return os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_TOKEN")


def check_hf_token(token: str | None) -> bool:
    if not token:
        record("HF token 有效", False, ".env 沒有 HF_TOKEN（見 SETUP.md 第 3 節）")
        return False
    try:
        from huggingface_hub import HfApi

        user = HfApi().whoami(token=token)
        record("HF token 有效", True, f"登入身分：{user.get('name', '?')}")
        return True
    except Exception as e:  # noqa: BLE001
        record("HF token 有效", False, f"whoami 失敗：{e}")
        return False


def check_pyannote(token: str | None) -> bool:
    if not token:
        record("pyannote pipeline 載入", False, "沒有 token，跳過")
        return False
    try:
        from pyannote.audio import Pipeline

        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1", use_auth_token=token
        )
        if pipeline is None:
            record(
                "pyannote pipeline 載入",
                False,
                "回傳 None：多半是模型授權條款沒同意，"
                "請到 pyannote/speaker-diarization-3.1 與 "
                "pyannote/segmentation-3.0 兩個頁面點同意（見 SETUP.md 第 3 節）",
            )
            return False
        record("pyannote pipeline 載入", True, "speaker-diarization-3.1 可用")
        return True
    except Exception as e:  # noqa: BLE001
        record(
            "pyannote pipeline 載入",
            False,
            f"{e}\n        提示：若是 401/403/gated，代表兩個模型頁面的授權條款沒點同意",
        )
        return False


def main() -> int:
    print("=== Podcast 後製環境檢查 ===\n")
    check_ffmpeg()
    check_imports()
    token = load_token()
    check_hf_token(token)
    check_pyannote(token)

    failed = [name for name, ok, _ in RESULTS if not ok]
    print()
    if failed:
        print(f"結果：{len(failed)} 項 FAIL → {', '.join(failed)}")
        return 1
    print("結果：全部 PASS ✅ 可進入任務 1-2。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
