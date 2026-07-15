export type SessionCapability =
  | { status: 'unsupported'; reason: string }
  | {
      status: 'supported';
      resume(sessionRef: string): Promise<{ resumed: true; sessionRef: string }>;
    };

export const unsupportedSessionCapability: SessionCapability = {
  status: 'unsupported',
  reason: 'The installed host SDK does not expose a stable session resume capability.',
};

export function validateOpaqueSessionReference(value: string): string {
  const ref = value.trim();
  if (!ref || /\n|\r|\b(message|transcript|content)\b/i.test(ref))
    throw new Error(
      'Session reference must be an opaque identifier and must not contain transcript content.',
    );
  return ref;
}
