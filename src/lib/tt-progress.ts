import { supabase } from "@/integrations/supabase/client";

export type SectionKey = "tools" | "methods" | "tactics" | "mini-tour" | "daily-task" | "training";

// XP per completed item
export const XP_PER_ITEM = 50;

// Section item counts (must match TTSection content)
export const SECTION_SIZES: Record<SectionKey, number> = {
  tools: 6,
  methods: 13,
  tactics: 6,
  "mini-tour": 6,
  "daily-task": 6,
  training: 6,
};

// How each section contributes to a metric (percent points per completed item)
const METRIC_WEIGHTS: Record<"physical" | "cognitive" | "psych" | "social", Partial<Record<SectionKey, number>>> = {
  physical:  { tools: 4, methods: 6, training: 5, "daily-task": 2 },
  cognitive: { tactics: 7, methods: 3, "mini-tour": 2 },
  psych:     { "mini-tour": 5, "daily-task": 6, tactics: 3, training: 2 },
  social:    { "mini-tour": 7, tools: 1, "daily-task": 1 },
};

const INDICATOR_WEIGHTS: Record<"speed" | "endurance" | "agility" | "coordination", Partial<Record<SectionKey, number>>> = {
  speed:        { methods: 5, training: 4, "daily-task": 2 },
  endurance:    { training: 7, methods: 3, "mini-tour": 2 },
  agility:      { methods: 4, tactics: 3, training: 4 },
  coordination: { tools: 3, methods: 4, tactics: 4, "daily-task": 2 },
};

export interface ProgressSnapshot {
  completed: Record<SectionKey, Set<number>>;
  totalDone: number;
  xp: number;
  metrics: { physical: number; cognitive: number; psych: number; social: number };
  indicators: { speed: number; endurance: number; agility: number; coordination: number };
  perSectionPercent: Record<SectionKey, number>;
}

export function emptySnapshot(): ProgressSnapshot {
  return {
    completed: {
      tools: new Set(), methods: new Set(), tactics: new Set(),
      "mini-tour": new Set(), "daily-task": new Set(), training: new Set(),
    },
    totalDone: 0,
    xp: 0,
    metrics: { physical: 0, cognitive: 0, psych: 0, social: 0 },
    indicators: { speed: 0, endurance: 0, agility: 0, coordination: 0 },
    perSectionPercent: { tools: 0, methods: 0, tactics: 0, "mini-tour": 0, "daily-task": 0, training: 0 },
  };
}

function clamp(n: number) { return Math.max(0, Math.min(100, Math.round(n))); }

export function buildSnapshot(rows: { section: string; item_index: number }[]): ProgressSnapshot {
  const snap = emptySnapshot();
  for (const r of rows) {
    const sec = r.section as SectionKey;
    if (snap.completed[sec]) snap.completed[sec].add(r.item_index);
  }
  let total = 0;
  (Object.keys(snap.completed) as SectionKey[]).forEach((sec) => {
    const done = snap.completed[sec].size;
    total += done;
    snap.perSectionPercent[sec] = clamp((done / SECTION_SIZES[sec]) * 100);
  });
  snap.totalDone = total;
  snap.xp = total * XP_PER_ITEM;

  (Object.keys(snap.metrics) as (keyof typeof snap.metrics)[]).forEach((m) => {
    let sum = 0;
    const w = METRIC_WEIGHTS[m];
    (Object.keys(w) as SectionKey[]).forEach((sec) => {
      sum += (w[sec] || 0) * snap.completed[sec].size;
    });
    snap.metrics[m] = clamp(sum);
  });
  (Object.keys(snap.indicators) as (keyof typeof snap.indicators)[]).forEach((m) => {
    let sum = 0;
    const w = INDICATOR_WEIGHTS[m];
    (Object.keys(w) as SectionKey[]).forEach((sec) => {
      sum += (w[sec] || 0) * snap.completed[sec].size;
    });
    snap.indicators[m] = clamp(sum);
  });
  return snap;
}

export async function fetchProgress(userId: string): Promise<ProgressSnapshot> {
  const { data } = await supabase
    .from("tt_completions")
    .select("section, item_index")
    .eq("user_id", userId);
  return buildSnapshot(data || []);
}

export async function toggleCompletion(userId: string, section: SectionKey, itemIndex: number, currentlyDone: boolean) {
  if (currentlyDone) {
    await supabase.from("tt_completions").delete()
      .eq("user_id", userId).eq("section", section).eq("item_index", itemIndex);
  } else {
    await supabase.from("tt_completions").insert({ user_id: userId, section, item_index: itemIndex });
  }
}
