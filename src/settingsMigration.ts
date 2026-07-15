import type { PersistedSettings } from './types';

export const CURRENT_SETTINGS_SCHEMA_VERSION = 2;

export interface SettingsDiagnostic {
  code: 'invalid-json' | 'partial-recovery' | 'future-version' | 'migrated' | 'platform-fallback';
  message: string;
}

export interface SettingsMigrationResult {
  settings: Partial<PersistedSettings>;
  sourceVersion: number;
  targetVersion: number;
  diagnostics: SettingsDiagnostic[];
  rewriteSafe: boolean;
}

export function parseAndMigrateSettings(source: string): SettingsMigrationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    return {
      settings: {},
      sourceVersion: 0,
      targetVersion: CURRENT_SETTINGS_SCHEMA_VERSION,
      diagnostics: [
        {
          code: 'invalid-json',
          message:
            'Settings JSON is invalid; safe defaults were loaded without rewriting the source.',
        },
      ],
      rewriteSafe: false,
    };
  }
  return migrateSettingsObject(parsed);
}

export function migrateSettingsObject(value: unknown): SettingsMigrationResult {
  const diagnostics: SettingsDiagnostic[] = [];
  const object =
    value && typeof value === 'object' && !Array.isArray(value)
      ? { ...(value as Record<string, unknown>) }
      : {};
  if (Object.keys(object).length === 0 && value !== object)
    diagnostics.push({
      code: 'partial-recovery',
      message: 'Non-object settings were replaced with safe defaults.',
    });
  const rawVersion =
    typeof object.settingsSchemaVersion === 'number' ? object.settingsSchemaVersion : 0;
  if (rawVersion > CURRENT_SETTINGS_SCHEMA_VERSION) {
    return {
      settings: object as Partial<PersistedSettings>,
      sourceVersion: rawVersion,
      targetVersion: CURRENT_SETTINGS_SCHEMA_VERSION,
      diagnostics: [
        {
          code: 'future-version',
          message: `Settings schema ${rawVersion} is newer than this plugin supports; data is preserved read-only.`,
        },
      ],
      rewriteSafe: false,
    };
  }
  let migrated = object;
  if (rawVersion < 1) {
    migrated = {
      ...migrated,
      workspacesEnabled: migrated.workspacesEnabled !== false,
      settingsSchemaVersion: 1,
    };
    diagnostics.push({ code: 'migrated', message: 'Migrated unversioned settings to schema 1.' });
  }
  if ((migrated.settingsSchemaVersion as number) < 2) {
    migrated = {
      ...migrated,
      approvalHistory: Array.isArray(migrated.approvalHistory) ? migrated.approvalHistory : [],
      chatWorkspaceSelections:
        migrated.chatWorkspaceSelections && typeof migrated.chatWorkspaceSelections === 'object'
          ? migrated.chatWorkspaceSelections
          : {},
      settingsSchemaVersion: 2,
    };
    diagnostics.push({ code: 'migrated', message: 'Migrated settings to schema 2.' });
  }
  return {
    settings: migrated as Partial<PersistedSettings>,
    sourceVersion: rawVersion,
    targetVersion: CURRENT_SETTINGS_SCHEMA_VERSION,
    diagnostics,
    rewriteSafe: true,
  };
}

export function projectPlatformSafeSettings(
  settings: PersistedSettings,
  platform: NodeJS.Platform,
): { settings: PersistedSettings; diagnostics: SettingsDiagnostic[] } {
  if (platform === 'win32' || settings.executionEnvironment !== 'wsl')
    return { settings, diagnostics: [] };
  return {
    settings: { ...settings, executionEnvironment: 'host' },
    diagnostics: [
      {
        code: 'platform-fallback',
        message:
          'WSL execution is unavailable on this host; persisted WSL settings were preserved while effective execution fell back to Host.',
      },
    ],
  };
}
