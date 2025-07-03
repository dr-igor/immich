import { describe, it, expect } from 'vitest';
import { getParentPath, normalizeTreePath } from './tree-utils';

describe('tree-utils', () => {
  describe('getParentPath', () => {
    it('should handle standard paths correctly', () => {
      expect(getParentPath('/mnt/external/folder/file.jpg')).toBe('/mnt/external/folder');
      expect(getParentPath('/folder/file.jpg')).toBe('/folder');
      expect(getParentPath('/file.jpg')).toBe('/');
    });

    it('should handle network/UNC paths with double slash by normalizing them', () => {
      // These are the problematic cases for external libraries - should normalize double slash
      expect(getParentPath('//server/share/folder/file.jpg')).toBe('/server/share/folder');
      expect(getParentPath('//external/library/file.jpg')).toBe('/external/library');
      expect(getParentPath('//mnt/external/folder/file.jpg')).toBe('/mnt/external/folder');
    });

    it('should handle edge cases', () => {
      expect(getParentPath('/')).toBe('/');
      expect(getParentPath('')).toBe('');
      expect(getParentPath('file.jpg')).toBe('file.jpg');
    });
  });

  describe('normalizeTreePath', () => {
    it('should remove trailing slashes', () => {
      expect(normalizeTreePath('/folder/')).toBe('/folder');
      expect(normalizeTreePath('/folder/subfolder/')).toBe('/folder/subfolder');
    });

    it('should preserve root slash', () => {
      expect(normalizeTreePath('/')).toBe('/');
    });

    it('should not modify paths without trailing slash', () => {
      expect(normalizeTreePath('/folder')).toBe('/folder');
      expect(normalizeTreePath('folder')).toBe('folder');
    });
  });
});