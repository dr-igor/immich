import { localPathMappings } from '$lib/utils/local-path-mappings';
import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/utils/local-path-mappings', () => ({
  localPathMappings: {
    current: [],
  },
}));

// Test the core logic functions that would be used in LocalPathMappingModal
describe('LocalPathMappingModal logic', () => {
  describe('mapping management functions', () => {
    it('should save new mapping correctly', () => {
      const remotePath = '/remote/photos';
      const localPath = '/Users/john/Photos';

      // Simulate the save logic from the component
      const saveMapping = (rPath: string, lPath: string) => {
        const mappings = localPathMappings.current.filter((m) => m.remotePath !== rPath);
        if (lPath.trim()) {
          mappings.push({ remotePath: rPath, localPath: lPath.trim() });
        }
        localPathMappings.current = mappings;
      };

      saveMapping(remotePath, localPath);
      expect(localPathMappings.current).toEqual([{ remotePath, localPath }]);
    });

    it('should update existing mapping correctly', () => {
      localPathMappings.current = [
        { remotePath: '/remote/photos', localPath: '/Users/john/Photos' },
        { remotePath: '/other/path', localPath: '/Users/john/Other' },
      ];

      const remotePath = '/remote/photos';
      const newLocalPath = '/Users/john/NewPhotos';

      // Simulate the save logic from the component
      const saveMapping = (rPath: string, lPath: string) => {
        const mappings = localPathMappings.current.filter((m) => m.remotePath !== rPath);
        if (lPath.trim()) {
          mappings.push({ remotePath: rPath, localPath: lPath.trim() });
        }
        localPathMappings.current = mappings;
      };

      saveMapping(remotePath, newLocalPath);
      expect(localPathMappings.current).toEqual([
        { remotePath: '/other/path', localPath: '/Users/john/Other' },
        { remotePath, localPath: newLocalPath },
      ]);
    });

    it('should remove mapping correctly', () => {
      localPathMappings.current = [
        { remotePath: '/remote/photos', localPath: '/Users/john/Photos' },
        { remotePath: '/other/path', localPath: '/Users/john/Other' },
      ];

      const remotePath = '/remote/photos';

      // Simulate the remove logic from the component
      const removeMapping = (rPath: string) => {
        localPathMappings.current = localPathMappings.current.filter((m) => m.remotePath !== rPath);
      };

      removeMapping(remotePath);
      expect(localPathMappings.current).toEqual([{ remotePath: '/other/path', localPath: '/Users/john/Other' }]);
    });

    it('should remove mapping when saving empty local path', () => {
      localPathMappings.current = [{ remotePath: '/remote/photos', localPath: '/Users/john/Photos' }];

      const remotePath = '/remote/photos';
      const emptyLocalPath = '';

      // Simulate the save logic from the component
      const saveMapping = (rPath: string, lPath: string) => {
        const mappings = localPathMappings.current.filter((m) => m.remotePath !== rPath);
        if (lPath.trim()) {
          mappings.push({ remotePath: rPath, localPath: lPath.trim() });
        }
        localPathMappings.current = mappings;
      };

      saveMapping(remotePath, emptyLocalPath);
      expect(localPathMappings.current).toEqual([]);
    });

    it('should trim whitespace from local path when saving', () => {
      const remotePath = '/remote/photos';
      const localPathWithWhitespace = '  /Users/john/Photos  ';

      // Simulate the save logic from the component
      const saveMapping = (rPath: string, lPath: string) => {
        const mappings = localPathMappings.current.filter((m) => m.remotePath !== rPath);
        if (lPath.trim()) {
          mappings.push({ remotePath: rPath, localPath: lPath.trim() });
        }
        localPathMappings.current = mappings;
      };

      saveMapping(remotePath, localPathWithWhitespace);
      expect(localPathMappings.current).toEqual([{ remotePath, localPath: '/Users/john/Photos' }]);
    });

    it('should find existing mapping correctly', () => {
      localPathMappings.current = [{ remotePath: '/remote/photos', localPath: '/Users/john/Photos' }];

      const remotePath = '/remote/photos';

      // Simulate the existing mapping logic from the component
      const findExisting = (rPath: string) => {
        return localPathMappings.current.find((m) => m.remotePath === rPath);
      };

      const existing = findExisting(remotePath);
      expect(existing).toEqual({ remotePath, localPath: '/Users/john/Photos' });

      const nonExisting = findExisting('/non/existent/path');
      expect(nonExisting).toBeUndefined();
    });
  });
});
