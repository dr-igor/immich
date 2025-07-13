import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLocalPathForRemote, localPathMappings, type LocalPathMapping } from './local-path-mappings';

vi.mock('./persisted', () => {
  let storage: LocalPathMapping[] = [];
  return {
    PersistedLocalStorage: vi.fn().mockImplementation(() => ({
      get current() {
        return storage;
      },
      set current(value: LocalPathMapping[]) {
        storage = value;
      },
    })),
  };
});

describe('local-path-mappings', () => {
  beforeEach(() => {
    localPathMappings.current = [];
  });

  describe('getLocalPathForRemote', () => {
    it('returns undefined when no mappings exist', () => {
      const result = getLocalPathForRemote('/remote/path/file.jpg');
      expect(result).toBeUndefined();
    });

    it('returns undefined when no mappings match', () => {
      localPathMappings.current = [{ remotePath: '/different/path', localPath: '/local/different' }];

      const result = getLocalPathForRemote('/remote/path/file.jpg');
      expect(result).toBeUndefined();
    });

    it('returns mapped path for exact match', () => {
      localPathMappings.current = [{ remotePath: '/remote/path', localPath: '/Users/john/Pictures' }];

      const result = getLocalPathForRemote('/remote/path');
      expect(result).toBe('file:///Users/john/Pictures');
    });

    it('returns mapped path for file within mapped directory', () => {
      localPathMappings.current = [{ remotePath: '/remote/path', localPath: '/Users/john/Pictures' }];

      const result = getLocalPathForRemote('/remote/path/subfolder/file.jpg');
      expect(result).toBe('file:///Users/john/Pictures/subfolder/file.jpg');
    });

    it('uses the most specific mapping when multiple mappings match', () => {
      localPathMappings.current = [
        { remotePath: '/remote', localPath: '/Users/john/Documents' },
        { remotePath: '/remote/path', localPath: '/Users/john/Pictures' },
        { remotePath: '/remote/path/photos', localPath: '/Users/john/Photos' },
      ];

      const result = getLocalPathForRemote('/remote/path/photos/vacation.jpg');
      expect(result).toBe('file:///Users/john/Photos/vacation.jpg');
    });

    it('handles Windows-style backslashes in local paths', () => {
      localPathMappings.current = [{ remotePath: '/remote/path', localPath: 'C:\\Users\\john\\Pictures' }];

      const result = getLocalPathForRemote('/remote/path/file.jpg');
      expect(result).toBe('file://C:/Users/john/Pictures/file.jpg');
    });

    it('handles paths that do not start with a slash', () => {
      localPathMappings.current = [{ remotePath: '/remote/path', localPath: '/Users/john/Pictures' }];

      const result = getLocalPathForRemote('/remote/path/file.jpg');
      expect(result).toBe('file:///Users/john/Pictures/file.jpg');
    });

    it('returns undefined for partial path matches that are not subdirectories', () => {
      localPathMappings.current = [{ remotePath: '/remote/path', localPath: '/Users/john/Pictures' }];

      // This should not match because '/remote/pathways' is not a subdirectory of '/remote/path'
      const result = getLocalPathForRemote('/remote/pathways/file.jpg');
      expect(result).toBeUndefined();
    });

    it('handles empty local path mappings array', () => {
      localPathMappings.current = [];

      const result = getLocalPathForRemote('/remote/path/file.jpg');
      expect(result).toBeUndefined();
    });

    it('handles multiple overlapping mappings correctly', () => {
      localPathMappings.current = [
        { remotePath: '/remote/documents', localPath: '/Users/john/Documents' },
        { remotePath: '/remote/photos/2023', localPath: '/Users/john/Photos/2023' },
        { remotePath: '/remote/photos', localPath: '/Users/john/Pictures' },
      ];

      // Should use the most specific match
      const result1 = getLocalPathForRemote('/remote/photos/2023/vacation.jpg');
      expect(result1).toBe('file:///Users/john/Photos/2023/vacation.jpg');

      // Should use the less specific match
      const result2 = getLocalPathForRemote('/remote/photos/2024/work.jpg');
      expect(result2).toBe('file:///Users/john/Pictures/2024/work.jpg');

      // Should use different mapping
      const result3 = getLocalPathForRemote('/remote/documents/report.pdf');
      expect(result3).toBe('file:///Users/john/Documents/report.pdf');
    });
  });
});
