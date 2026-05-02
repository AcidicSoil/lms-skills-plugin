import { logDiagnostic } from "../diagnostics";
import { summarizeRouteCandidate, type SkillRouteDecision } from "../skillRouter";
import { inputPreview } from "./messages";
import { sha256Short, contentPreview } from "./proofs";

export function logContextInjection(
  requestId: string,
  kind: "explicit_expanded" | "routed" | "reminder" | "fallback",
  injection: string,
  payload: string | undefined,
  extra: Record<string, unknown> = {},
): void {
  const injectionSha256 = sha256Short(injection);
  logDiagnostic({
    event: "context_injection",
    requestId,
    kind,
    injectionChars: injection.length,
    injectionSha256,
    injectionPreview: contentPreview(injection),
    payloadChars: payload?.length ?? 0,
    payloadSha256: payload ? sha256Short(payload) : "-",
    payloadPreview: payload ? contentPreview(payload) : "-",
    ...extra,
  });
  logDiagnostic({
    event: "context_injection_content",
    requestId,
    kind,
    injectedContext: injection,
    injectedContextChars: injection.length,
    injectedContextSha256: injectionSha256,
    taskPayload: payload,
    ...extra,
  });
}
export function logPromptRoute(
  requestId: string,
  mode: string,
  text: string,
  route: SkillRouteDecision | undefined,
  injection: string,
  startedAt: number,
  extra: Record<string, unknown> = {},
): void {
  const top = route?.selected[0];
  logDiagnostic({
    event: "prompt_route",
    requestId,
    mode,
    inputPreview: inputPreview(text),
    selected: route?.selected.map(summarizeRouteCandidate).join(" | ") || "-",
    rejectedBest: route?.bestRejected ? summarizeRouteCandidate(route.bestRejected) : "-",
    topSkill: top?.skill.name ?? "-",
    topScore: top?.score ?? 0,
    topConfidence: top?.confidence ?? "low",
    injectionChars: injection.length,
    elapsedMs: Date.now() - startedAt,
    ...extra,
  });
}
