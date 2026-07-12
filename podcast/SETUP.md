# Podcast 後製自動化｜環境設置說明

專案：固定雙人中文對話 Podcast，雙軌分開錄音（每人一軌）。
技術棧：faster-whisper、pyannote.audio 3.1、pydub、ffmpeg-python、silero-vad。
設計原則：**AI 先提案、人核准才執行；原始檔唯讀永不覆寫。**

## 目錄結構

```
podcast/
  raw/         原始音檔（唯讀，程式絕不寫入或覆寫）
  processed/   前處理後音檔（16kHz mono WAV + VAD JSON）
  transcripts/ 逐字稿輸出（words/segments/speakers/merged JSON + txt）
  edits/       候選剪輯清單與審核記錄（第二階段使用）
  exports/     最終輸出
```

## 1. 安裝系統相依：ffmpeg

- macOS：`brew install ffmpeg`
- Ubuntu/Debian：`sudo apt install ffmpeg`
- Windows：`winget install ffmpeg` 或至 https://ffmpeg.org/download.html 下載

安裝後確認：`ffmpeg -version` 能印出版本。

## 2. 安裝 Python 套件

需要 Python 3.11。

```bash
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

注意：pyannote.audio 會拉入 PyTorch，下載量較大。純 CPU 機器安裝 CPU 版
torch 即可（預設 pip 版本在 macOS 就是 CPU 版）。

## 3. 申請 Hugging Face token 與模型授權

pyannote 的分講者模型是「gated model」，必須先在網頁上同意授權條款，
token 才拉得下模型。**這是最常卡關的一步，三個步驟缺一不可：**

1. 註冊/登入 https://huggingface.co ，到
   https://huggingface.co/settings/tokens 建立一個 **Read** 權限的 token。
2. 到以下**兩個**模型頁面，分別點「Agree and access repository」同意授權：
   - https://huggingface.co/pyannote/speaker-diarization-3.1
   - https://huggingface.co/pyannote/segmentation-3.0
   （diarization pipeline 內部會用到 segmentation 模型，兩個都要同意，
   只同意一個仍然會失敗。）
3. 把 token 存到專案根目錄的 `.env`：

   ```
   HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxx
   ```

   `.env` 已列入 `.gitignore`，不會進版控。

## 4. 驗證環境

```bash
python check_env.py
```

逐項檢查並印出 PASS/FAIL：

1. ffmpeg 可執行
2. Python 套件皆可 import
3. HF token 有效（能通過 whoami）
4. pyannote/speaker-diarization-3.1 pipeline 可下載並載入
   （第一次跑會下載模型，需要幾分鐘）

全部 PASS 才進下一個任務。若第 4 項 FAIL，最常見原因是
上面步驟 2 的兩個授權條款沒點同意。

## 5. 各模組用法速查

```bash
# 前處理：轉 16kHz mono WAV + loudnorm + VAD
python preprocess.py raw/track1.wav

# 轉錄：faster-whisper 逐字級時間戳
python transcribe.py processed/track1.wav --model medium

# 分講者：pyannote（單軌備援）或雙軌 VAD 法
python diarize.py processed/mixed.wav
python diarize.py --tracks processed/track1.wav processed/track2.wav

# 合併對齊：逐字稿 x 講者區段 → 帶講者逐字稿
python merge.py transcripts/track1_words.json transcripts/track1_speakers.json

# 一條龍（第一階段整合）
python pipeline_stage1.py raw/track1.wav raw/track2.wav --model medium
```

講者顯示名稱在 `config.json` 修改（SPEAKER_00 → 顯示名稱）。
