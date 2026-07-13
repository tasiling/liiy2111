"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "trpg:saveId";

export type SaveOption = { id: string; 存檔名稱: string };

// 判定台/儀表板/結算精靈共用的「目前存檔」選擇狀態,存在 localStorage 讓分頁切換時記得上次選的存檔。
export function useCurrentSave() {
  const [saves, setSaves] = useState<SaveOption[]>([]);
  const [saveId, setSaveIdState] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trpg/options")
      .then((r) => r.json())
      .then((data) => {
        setSaves(data.saves ?? []);
        const stored = localStorage.getItem(STORAGE_KEY);
        const valid = stored && data.saves?.some((s: SaveOption) => s.id === stored);
        setSaveIdState(valid ? stored! : (data.saves?.[0]?.id ?? ""));
      })
      .finally(() => setLoading(false));
  }, []);

  function setSaveId(id: string) {
    setSaveIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  return { saves, saveId, setSaveId, loading };
}
