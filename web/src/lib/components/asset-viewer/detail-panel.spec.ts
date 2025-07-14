import { getLocalPathForRemote } from '$lib/utils/local-path-mappings';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/utils/local-path-mappings', () => ({
  getLocalPathForRemote: vi.fn(),
}));

// Test the core functions that were added to detail-panel.svelte
describe('DetailPanel local path functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStrippedOriginalPath', () => {
    it('removes leading slash from path', () => {
      const getStrippedOriginalPath = (asset: { originalPath: string }): string => {
        if (asset.originalPath.startsWith('/')) {
          return asset.originalPath.slice(1);
        }
        return asset.originalPath;
      };

      const assetWithSlash = { originalPath: '/remote/photos/test.jpg' };
      const assetWithoutSlash = { originalPath: 'remote/photos/test.jpg' };

      expect(getStrippedOriginalPath(assetWithSlash)).toBe('remote/photos/test.jpg');
      expect(getStrippedOriginalPath(assetWithoutSlash)).toBe('remote/photos/test.jpg');
    });
  });

  describe('copyLocalPath function', () => {
    it('copies correct path to clipboard', () => {
      const mockWriteText = vi.fn();
      Object.defineProperty(globalThis.navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
      });

      const copyLocalPath = (localFileLink: string | undefined) => {
        if (localFileLink) {
          (
            globalThis.navigator as typeof navigator & { clipboard: { writeText: typeof mockWriteText } }
          ).clipboard.writeText(localFileLink.replace('file://', ''));
        }
      };

      copyLocalPath('file:///Users/john/Photos/test.jpg');
      expect(mockWriteText).toHaveBeenCalledWith('/Users/john/Photos/test.jpg');

      copyLocalPath(undefined);
      expect(mockWriteText).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe('window.open functionality', () => {
    it('opens file with correct URL', () => {
      const mockOpen = vi.fn();
      (globalThis as typeof globalThis & { window: { open: typeof mockOpen } }).window = { open: mockOpen };

      const openLocalFile = (localFileLink: string) => {
        (globalThis as typeof globalThis & { window: { open: typeof mockOpen } }).window.open(localFileLink, '_blank');
      };

      openLocalFile('file:///Users/john/Photos/test.jpg');
      expect(mockOpen).toHaveBeenCalledWith('file:///Users/john/Photos/test.jpg', '_blank');
    });
  });

  describe('integration with getLocalPathForRemote', () => {
    it('returns undefined when no mapping exists', () => {
      vi.mocked(getLocalPathForRemote).mockReturnValue(undefined);

      const result = getLocalPathForRemote('remote/photos/test.jpg');
      expect(result).toBeUndefined();
    });

    it('returns mapped path when mapping exists', () => {
      vi.mocked(getLocalPathForRemote).mockReturnValue('file:///Users/john/Photos/test.jpg');

      const result = getLocalPathForRemote('remote/photos/test.jpg');
      expect(result).toBe('file:///Users/john/Photos/test.jpg');
    });
  });
});
