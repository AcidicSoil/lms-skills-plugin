import type { QmdSearchMode, SkillInfo, SkillSearchBackend } from "../types";

export type ActiveSkillSearchBackend = "builtin" | "qmd" | "ck";

export interface EnhancedSkillSearchOptions {
  qmdExecutable: string;
  ckExecutable: string;
  qmdCollections: string[];
  qmdSearchMode: QmdSearchMode;
}

export interface EnhancedSkillSearchResult {
  requested: SkillSearchBackend;
  active: ActiveSkillSearchBackend;
  fallbackUsed: boolean;
  fallbackReason?: string;
  available: {
    qmd?: boolean;
    ck?: boolean;
  };
  options: {
    qmdExecutable: string;
    ckExecutable: string;
    qmdCollections: string[];
    qmdSearchMode: QmdSearchMode;
  };
  candidates: SkillInfo[];
  rawResultCount: number;
  diagnostics: string[];
}

export interface EnhancedSearchBackendResult {
  skills: SkillInfo[];
  rawResultCount: number;
  diagnostics: string[];
}
