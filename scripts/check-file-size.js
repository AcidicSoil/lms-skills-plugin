#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const WARN_LINES = 400;
const FAIL_LINES = 800;
const ALLOWLIST_PATH = path.join("config", "file-size-allowlist.json");
const args = new Set(process.argv.slice(2));
const checkAll = args.has("--all");
const today = new Date().toISOString().slice(0, 10);

function runGit(args) {
  return childProcess.execFileSync("git", args, { encoding: "utf8" });
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/").replace(/^\.\//, "");
}

function trackedFiles() {
  return runGit(["ls-files", "-z"])
    .split("\0")
    .filter(Boolean);
}

function changedFiles() {
  const porcelain = runGit(["status", "--porcelain=v1", "-z"])
    .split("\0")
    .filter(Boolean);
  const files = new Set();
  for (let i = 0; i < porcelain.length; i += 1) {
    const record = porcelain[i];
    const status = record.slice(0, 2);
    const filePath = record.slice(3);
    if (!filePath || status.includes("D")) continue;
    files.add(filePath);
    if (status.startsWith("R") || status.startsWith("C")) i += 1;
  }
  return [...files];
}

function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST_PATH)) return { entries: [] };
  const parsed = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, "utf8"));
  if (!parsed || !Array.isArray(parsed.entries)) {
    throw new Error(`${ALLOWLIST_PATH} must contain an entries array.`);
  }
  return parsed;
}

function validateAllowlist(entries) {
  const errors = [];
  const byPath = new Map();
  for (const [index, entry] of entries.entries()) {
    const label = `entries[${index}]`;
    if (!entry || typeof entry !== "object") {
      errors.push(`${label} must be an object.`);
      continue;
    }
    for (const field of ["path", "owner", "expires", "reason"]) {
      if (typeof entry[field] !== "string" || entry[field].trim() === "") {
        errors.push(`${label}.${field} is required.`);
      }
    }
    if (typeof entry.expires === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(entry.expires)) {
      errors.push(`${label}.expires must use YYYY-MM-DD.`);
    }
    if (typeof entry.path === "string") byPath.set(normalizePath(entry.path), entry);
  }
  return { errors, byPath };
}

function lineCount(filePath) {
  const data = fs.readFileSync(filePath);
  if (data.includes(0)) return null;
  const text = data.toString("utf8");
  if (text.length === 0) return 0;
  return text.endsWith("\n") ? text.split("\n").length - 1 : text.split("\n").length;
}

function main() {
  const allowlist = loadAllowlist();
  const { errors: allowlistErrors, byPath } = validateAllowlist(allowlist.entries);
  const files = (checkAll ? trackedFiles() : changedFiles())
    .map(normalizePath)
    .filter((filePath) => fs.existsSync(filePath) && fs.statSync(filePath).isFile());

  const findings = [];
  const errors = [...allowlistErrors];

  for (const filePath of files.sort()) {
    const lines = lineCount(filePath);
    if (lines === null || lines <= WARN_LINES) continue;
    const allow = byPath.get(filePath);
    const status = lines > FAIL_LINES ? "fail" : "warn";
    if (allow && allow.expires < today) {
      errors.push(`${filePath}: allowlist entry expired on ${allow.expires}.`);
    }
    if (status === "fail" && !allow) {
      errors.push(`${filePath}: ${lines} LOC exceeds fail threshold ${FAIL_LINES}. Add a temporary allowlist entry or refactor.`);
    }
    findings.push({ filePath, lines, status, allowlisted: Boolean(allow) });
  }

  const scope = checkAll ? "tracked files" : "changed files";
  console.log(`File-size policy check (${scope})`);
  console.log(`Warning threshold: >${WARN_LINES} LOC; fail threshold: >${FAIL_LINES} LOC`);
  if (findings.length === 0) console.log("No files exceed the warning threshold.");
  for (const finding of findings) {
    const marker = finding.status === "fail" ? "FAIL" : "WARN";
    const allow = finding.allowlisted ? " allowlisted" : "";
    console.log(`${marker} ${finding.lines.toString().padStart(5)} ${finding.filePath}${allow}`);
  }
  if (errors.length > 0) {
    console.error("\nPolicy errors:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
}

main();
