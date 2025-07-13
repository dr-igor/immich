import { PersistedLocalStorage } from './persisted';

export interface LocalPathMapping {
  remotePath: string;
  localPath: string;
}

function isValidMapping(obj: any): obj is LocalPathMapping {
  return typeof obj === 'object' && typeof obj.remotePath === 'string' && typeof obj.localPath === 'string';
}

function isValidMappings(arr: any): arr is LocalPathMapping[] {
  return Array.isArray(arr) && arr.every(isValidMapping);
}

export const localPathMappings = new PersistedLocalStorage<LocalPathMapping[]>('localPathMappings', [], {
  valid: isValidMappings,
});

export function getLocalPathForRemote(remotePath: string): string | undefined {
  let bestMatch: LocalPathMapping | undefined;
  for (const mapping of localPathMappings.current) {
    if (
      (remotePath === mapping.remotePath || remotePath.startsWith(mapping.remotePath + '/')) &&
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
