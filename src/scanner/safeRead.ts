import { MAX_FILE_SIZE_BYTES } from "../constants";
import type { RuntimeAdapter } from "../runtime/types";
import { checkAbort, isAbortError } from "../abort";

export async function readFileSafe(
  runtime: RuntimeAdapter,
  filePath: string,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    checkAbort(signal);
    const stat = await runtime.stat(filePath, signal);
    if (stat.size <= MAX_FILE_SIZE_BYTES) {
      return runtime.readFile(filePath, signal);
    }

    checkAbort(signal);
    const content = await runtime.readFile(filePath, signal);
    checkAbort(signal);
    const buf = Buffer.from(content, "utf-8");
    const headBytes = Math.floor(MAX_FILE_SIZE_BYTES * 0.8);
    const tailBytes = MAX_FILE_SIZE_BYTES - headBytes;
    const head = buf.slice(0, headBytes).toString("utf-8").replace(/\uFFFD.*$/, "");
    const tail = buf.slice(buf.length - tailBytes).toString("utf-8").replace(/^.*?\uFFFD/, "");
    const omitted = Math.round((stat.size - MAX_FILE_SIZE_BYTES) / 1024);
    return `${head}\n\n[... ${omitted}KB omitted - middle of file truncated ...]\n\n${tail}`;
  } catch (error) {
    if (isAbortError(error)) throw error;
    return null;
  }
}

