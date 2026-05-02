import type { SkillInfo } from "../types";

export interface SkillActivationRequest {
  token: string;
  skillName: string;
}

export interface ResolvedSkillActivation extends SkillActivationRequest {
  skill?: SkillInfo;
  content?: string;
  contentDisplayPath?: string;
  contentError?: string;
}

const SKILL_ACTIVATION_PATTERN = /(^|[^A-Za-z0-9_])\$([a-z][a-z0-9._-]{1,127})(?=$|[^A-Za-z0-9._-])/g;

export function extractSkillActivations(text: string): SkillActivationRequest[] {
  const seen = new Set<string>();
  const activations: SkillActivationRequest[] = [];
  let match: RegExpExecArray | null;

  while ((match = SKILL_ACTIVATION_PATTERN.exec(text)) !== null) {
    const skillName = match[2];
    const key = skillName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    activations.push({ token: `$${skillName}`, skillName });
  }

  return activations;
}

export function activationTokenList(activations: SkillActivationRequest[]): string {
  return activations.map((activation) => activation.token).join(",") || "-";
}

export function resolvedActivationNames(activations: ResolvedSkillActivation[]): string {
  return activations
    .filter((activation) => activation.skill)
    .map((activation) => activation.skill!.name)
    .join(",") || "-";
}

export function unresolvedActivationNames(activations: ResolvedSkillActivation[]): string {
  return activations
    .filter((activation) => !activation.skill)
    .map((activation) => activation.skillName)
    .join(",") || "-";
}
export function removeActivationTokensFromPayload(
  text: string,
  activations: SkillActivationRequest[],
): string {
  let payload = text;
  for (const activation of activations) {
    payload = payload.split(activation.token).join("");
  }
  return payload.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
