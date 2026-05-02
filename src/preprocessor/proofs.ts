import { createHash } from "crypto";
import type { SkillRouteCandidate } from "../skillRouter";
import type { ResolvedSkillActivation } from "./activations";

export function sha256Short(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}

export function contentPreview(content: string, maxChars = 180): string {
  const compact = content.replace(/\s+/g, " ").trim();
  return compact.length > maxChars ? `${compact.slice(0, maxChars - 3)}...` : compact;
}

export function expandedSkillProof(activations: ResolvedSkillActivation[]): string {
  return activations
    .filter((activation) => activation.skill)
    .map((activation) => {
      const skill = activation.skill!;
      if (!activation.content) {
        return `${skill.name}:ERROR:${activation.contentError ?? "not-expanded"}`;
      }
      return `${skill.name}:expanded:${activation.content.length}B:sha256=${sha256Short(activation.content)}:source=${activation.contentDisplayPath ?? skill.displayPath}:preview="${contentPreview(activation.content, 96)}"`;
    })
    .join(" | ") || "-";
}

export function routedSkillProof(candidates: SkillRouteCandidate[]): string {
  return candidates
    .map((candidate, index) => `${index + 1}:${candidate.skill.name}:score=${candidate.score}:confidence=${candidate.confidence}:source=${candidate.skill.displayPath}:why=${candidate.reasons.slice(0, 2).join("+") || "score"}`)
    .join(" | ") || "-";
}
export function computeFingerprint(candidates: SkillRouteCandidate[]): string {
  return candidates
    .map((candidate) => `${candidate.skill.environment}:${candidate.skill.name}:${candidate.skill.displayPath}:${candidate.score}`)
    .sort()
    .join("|");
}
