"use client";

import type { SaveOption } from "@/lib/trpg/useCurrentSave";

export default function SaveSelector({
  saves,
  saveId,
  onChange,
}: {
  saves: SaveOption[];
  saveId: string;
  onChange: (id: string) => void;
}) {
  return (
    <select
      className="border rounded px-3 py-2 bg-transparent text-sm w-full"
      value={saveId}
      onChange={(e) => onChange(e.target.value)}
    >
      {saves.length === 0 && <option value="">(尚無存檔)</option>}
      {saves.map((s) => (
        <option key={s.id} value={s.id}>
          {s.存檔名稱}
        </option>
      ))}
    </select>
  );
}
