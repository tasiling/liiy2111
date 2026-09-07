export const CREATIVE_ROLE_TITLE = "行光創現角色";
export const MANIFESTATION_MILESTONE_TITLE_PREFIX = "行光創現里程碑-";

export type CreativeRoleProfile = {
  version: 1;
  title: string;
  traits: string[];
  note: string;
  updatedAt: string;
};

export type ManifestationMilestone = {
  version: 1;
  id: string;
  action: string;
  response: string;
  trait: string;
  reflection: string;
  date: string;
  createdAt: string;
};

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function emptyCreativeRole(): CreativeRoleProfile {
  return { version: 1, title: "", traits: [], note: "", updatedAt: new Date().toISOString() };
}

export function normalizeCreativeRole(value: unknown): CreativeRoleProfile {
  const source = value && typeof value === "object" ? value as Partial<CreativeRoleProfile> : {};
  const traits = Array.isArray(source.traits)
    ? source.traits.map((item) => text(item, 40)).filter(Boolean).slice(0, 3)
    : [];
  return {
    version: 1,
    title: text(source.title, 160),
    traits: [...new Set(traits)],
    note: text(source.note, 1000),
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : new Date().toISOString(),
  };
}

export function normalizeManifestationMilestone(
  value: unknown,
  fallback: { id: string; date: string; createdAt?: string }
): ManifestationMilestone | null {
  const source = value && typeof value === "object" ? value as Partial<ManifestationMilestone> : {};
  const action = text(source.action, 1000);
  const trait = text(source.trait, 80);
  if (!action || !trait) return null;
  return {
    version: 1,
    id: fallback.id,
    action,
    response: text(source.response, 1000),
    trait,
    reflection: text(source.reflection, 1500),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(source.date)) ? String(source.date) : fallback.date,
    createdAt: typeof source.createdAt === "string" ? source.createdAt : fallback.createdAt ?? new Date().toISOString(),
  };
}

export function manifestationMilestoneTitle(date: string, nonce: string) {
  return `${MANIFESTATION_MILESTONE_TITLE_PREFIX}${date.replaceAll("-", "")}-${nonce}`;
}
