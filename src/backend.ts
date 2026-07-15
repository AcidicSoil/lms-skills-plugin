import {
  execCommand,
  execProgram,
  type ExecOptions,
  type ExecProgramOptions,
  type ExecResult,
} from './executor';
import type { WorkspaceContext } from './types';
import {
  createWorkspaceFileSystem,
  type WorkspaceFileSystem,
  type WorkspaceFsDependencies,
} from './workspaceFs';

export interface WorkspaceBackend {
  context: WorkspaceContext;
  environment: WorkspaceContext['executionEnvironment'];
  distribution?: string;
  nativeRoot: string;
  fileSystem: WorkspaceFileSystem;
  runCommand(
    command: string,
    options?: Omit<ExecOptions, 'cwd' | 'executionEnvironment' | 'wslDistribution'> & {
      cwd?: string;
    },
  ): Promise<ExecResult>;
  runProgram(
    program: string,
    args: string[],
    options?: Omit<ExecProgramOptions, 'cwd' | 'executionEnvironment' | 'wslDistribution'> & {
      cwd?: string;
    },
  ): Promise<ExecResult>;
}

export interface WorkspaceBackendDependencies {
  createFileSystem?: (
    context: WorkspaceContext,
    dependencies?: WorkspaceFsDependencies,
  ) => WorkspaceFileSystem;
  workspaceFsDependencies?: WorkspaceFsDependencies;
  executeCommand?: typeof execCommand;
  executeProgram?: typeof execProgram;
}

export function createWorkspaceBackend(
  context: WorkspaceContext,
  dependencies: WorkspaceBackendDependencies = {},
): WorkspaceBackend {
  const fileSystem = (dependencies.createFileSystem ?? createWorkspaceFileSystem)(
    context,
    dependencies.workspaceFsDependencies,
  );
  const executeCommand = dependencies.executeCommand ?? execCommand;
  const executeProgram = dependencies.executeProgram ?? execProgram;

  return {
    context,
    environment: context.executionEnvironment,
    distribution: context.wslDistribution,
    nativeRoot: context.nativeRoot,
    fileSystem,
    runCommand(command, options = {}) {
      return executeCommand(command, {
        ...options,
        cwd: options.cwd ?? context.nativeRoot,
        executionEnvironment: context.executionEnvironment,
        wslDistribution: context.wslDistribution,
      });
    },
    runProgram(program, args, options = {}) {
      return executeProgram(program, args, {
        ...options,
        cwd: options.cwd ?? context.nativeRoot,
        executionEnvironment: context.executionEnvironment,
        wslDistribution: context.wslDistribution,
      });
    },
  };
}
