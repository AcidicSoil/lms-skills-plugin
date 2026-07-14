import * as childProcess from "child_process";

export type WslCapability =
  | { status: "pending" }
  | { status: "unsupported-platform" }
  | { status: "wsl-unavailable"; error: string }
  | { status: "no-distribution" }
  | { status: "no-default-distribution"; available: string[] }
  | { status: "distribution-unavailable"; requested: string; available: string[] }
  | { status: "ready"; distribution: string; available: string[] };

export interface ProgramResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type ProgramRunner = (program: string, args: string[]) => Promise<ProgramResult>;

export const defaultProgramRunner: ProgramRunner = (program, args) =>
  new Promise((resolve) => {
    childProcess.execFile(program, args, { encoding: "utf8", windowsHide: true }, (error, stdout, stderr) => {
      resolve({ stdout: stdout ?? "", stderr: stderr ?? "", exitCode: error && "code" in error && typeof error.code === "number" ? error.code : error ? 1 : 0 });
    });
  });

function parseDistributions(stdout: string): string[] {
  return stdout
    .replace(/\0/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^\*\s*/, ""))
    .filter(Boolean);
}

function parseDefaultDistribution(stdout: string): string | undefined {
  const normalized = stdout.replace(/\0/g, "");
  const match = normalized.match(/Default Distribution:\s*(.+)/i);
  return match?.[1]?.trim() || undefined;
}

export async function detectWslCapability(
  requested?: string,
  runner: ProgramRunner = defaultProgramRunner,
  platform: NodeJS.Platform = process.platform,
): Promise<WslCapability> {
  if (platform !== "win32") return { status: "unsupported-platform" };
  const result = await runner("wsl.exe", ["--list", "--quiet"]);
  if (result.exitCode !== 0) return { status: "wsl-unavailable", error: result.stderr.trim() || "wsl.exe failed" };
  const available = parseDistributions(result.stdout);
  if (available.length === 0) return { status: "no-distribution" };
  if (requested) {
    if (!available.includes(requested)) return { status: "distribution-unavailable", requested, available };
    return { status: "ready", distribution: requested, available };
  }
  const status = await runner("wsl.exe", ["--status"]);
  if (status.exitCode !== 0) return { status: "no-default-distribution", available };
  const defaultDistribution = parseDefaultDistribution(status.stdout);
  if (!defaultDistribution || !available.includes(defaultDistribution)) return { status: "no-default-distribution", available };
  return { status: "ready", distribution: defaultDistribution, available };
}
