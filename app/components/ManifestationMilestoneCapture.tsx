"use client";

import { useEffect, useState } from "react";
import type { CreativeRoleProfile, ManifestationMilestone } from "@/lib/dojo/manifestation";

async function readResponse<T>(response: Response): Promise<T> {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((json as { error?: string }).error ?? "操作失敗");
  return json as T;
}

export default function ManifestationMilestoneCapture({ date }: { date: string }) {
  const [profile, setProfile] = useState<CreativeRoleProfile | null>(null);
  const [action, setAction] = useState("");
  const [response, setResponse] = useState("");
  const [trait, setTrait] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/dojo/manifestation", { cache: "no-store" })
      .then((result) => readResponse<{ profile: CreativeRoleProfile }>(result))
      .then(({ profile }) => { if (!cancelled) { setProfile(profile); setTrait(profile.traits[0] ?? ""); } })
      .catch(() => { /* 里程碑是選填，不阻擋日復盤。 */ });
    return () => { cancelled = true; };
  }, []);

  async function save() {
    setSaving(true); setError(null); setMessage(null);
    try {
      const json = await readResponse<{ milestone: ManifestationMilestone }>(await fetch("/api/dojo/manifestation", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, response, trait, date }),
      }));
      setAction(""); setResponse("");
      setMessage(`已把這段行動留作「${json.milestone.trait}」的里程碑；下方日記不必再抄一次。`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setSaving(false); }
  }

  return <details className="evening-milestone-capture">
    <summary><span>今晚有創現里程碑嗎？</span><small>選填 · 先記行動，再寫日記</small></summary>
    <div>
      {profile?.title ? <p>目前角色：<b>{profile.title}</b></p> : <p>還沒有角色小檔案，也可以先留下這次行動。</p>}
      <label htmlFor="evening-creative-action">我主動採取了什麼行動？</label>
      <textarea id="evening-creative-action" className="field" rows={2} value={action} onChange={(event) => setAction(event.target.value)} placeholder="只寫你實際做出的決定與行動。" />
      <label htmlFor="evening-creative-response">現實給了什麼回應？（選填）</label>
      <textarea id="evening-creative-response" className="field" rows={2} value={response} onChange={(event) => setResponse(event.target.value)} placeholder="如實記下外界回應，不必宣稱自己控制結果。" />
      <label htmlFor="evening-creative-trait">對應特質</label>
      {profile?.traits.length ? <select id="evening-creative-trait" className="field" value={trait} onChange={(event) => setTrait(event.target.value)}>{profile.traits.map((item) => <option key={item}>{item}</option>)}</select> : <input id="evening-creative-trait" className="field" value={trait} onChange={(event) => setTrait(event.target.value)} placeholder="例如：主動、穩定" />}
      <button type="button" disabled={saving || !action.trim() || !trait.trim()} onClick={() => void save()}>{saving ? "保存中…" : "留下里程碑"}</button>
      {message && <p className="save-notice">{message}</p>}{error && <p className="form-error">{error}</p>}
    </div>
  </details>;
}
