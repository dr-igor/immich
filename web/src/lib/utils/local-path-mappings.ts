import { PersistedLocalStorage } from './persisted';

export interface LocalPathMapping {
  remotePath: string;
  localPath: string;
}

function isValidMapping(obj: unknown): obj is LocalPathMapping {
  return (
    (obj as LocalPathMapping).remotePath !== undefined &&
    typeof (obj as LocalPathMapping).remotePath === 'string' &&
    (obj as LocalPathMapping).localPath !== undefined &&
    typeof (obj as LocalPathMapping).localPath === 'string'
  );
}

function isValidMappings(arr: unknown): arr is LocalPathMapping[] {
  return Array.isArray(arr) && arr.every((element) => isValidMapping(element));
}

export const localPathMappings = new PersistedLocalStorage<LocalPathMapping[]>('localPathMappings', [], {
  valid: isValidMappings,
});

export function getLocalPathForRemote(remotePath: string): string | undefined {
  let bestMatch: LocalPathMapping | undefined;
  for (const mapping of localPathMappings.current) {
    if (
      (remotePath === mapping.remotePath || remotePath.startsWith(`${mapping.remotePath}/`)) &&
      (!bestMatch || mapping.remotePath.length > bestMatch.remotePath.length)
    ) {
      bestMatch = mapping;
    }
  }
  if (bestMatch) {
    return 'file://' + remotePath.replace(bestMatch.remotePath, bestMatch.localPath.replaceAll('\\', '/'));
  }
  return undefined;
}

export function addMapping(remotePath: string, localPath: string): void {
  const mappings = localPathMappings.current.filter((m) => m.remotePath !== remotePath);
  if (localPath) {
    mappings.push({ remotePath, localPath });
  }
  localPathMappings.current = mappings;
}

export function removeMapping(remotePath: string): void {
  localPathMappings.current = localPathMappings.current.filter((m) => m.remotePath !== remotePath);
}
