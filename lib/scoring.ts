import type { IntelType } from "./types";

/**
 * Rule-based priority scoring (v1) — see docs/INTELLIGENCE_LAYER.md.
 *  base 50
 *  +20 if threat (urgency bias)
 *  +15 if confidence > 0.8
 *  +10 if source_url present
 *  +5 per linked action (active follow-up)
 *  cap at 100
 */
export function computePriorityScore(input: {
  type: IntelType;
  confidence?: number | null;
  source_url?: string | null;
  actionCount?: number;
}): number {
  let score = 50;
  if (input.type === "threat") score += 20;
  if (typeof input.confidence === "number" && input.confidence > 0.8) score += 15;
  if (input.source_url && input.source_url.trim().length > 0) score += 10;
  score += 5 * (input.actionCount ?? 0);
  return Math.min(100, Math.max(0, Math.round(score)));
}
