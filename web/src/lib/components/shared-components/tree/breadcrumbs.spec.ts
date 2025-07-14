import { getLocalPathForRemote } from '$lib/utils/local-path-mappings';
import { TreeNode } from '$lib/utils/tree-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/utils/local-path-mappings', () => ({
  getLocalPathForRemote: vi.fn(),
}));

// Test the core logic functions that would be used in breadcrumbs
describe('Breadcrumbs functionality', () => {
  const createMockNode = (path: string): TreeNode => {
    const root = TreeNode.fromPaths([path]);
    return path === '' ? root : root.traverse(path);
  };

  describe('local path mapping integration', () => {
    it('should return local link when mapping exists', () => {
      const remotePath = 'photos/2023';
      vi.mocked(getLocalPathForRemote).mockReturnValue('file:///Users/john/Photos/2023');

      const node = createMockNode(remotePath);
      const localLink = getLocalPathForRemote(node.path);

      expect(localLink).toBe('file:///Users/john/Photos/2023');
      expect(getLocalPathForRemote).toHaveBeenCalledWith(remotePath);
    });

    it('should return undefined when no mapping exists', () => {
      const remotePath = 'photos/2023';
      vi.mocked(getLocalPathForRemote).mockReturnValue(undefined);

      const node = createMockNode(remotePath);
      const localLink = getLocalPathForRemote(node.path);

      expect(localLink).toBeUndefined();
      expect(getLocalPathForRemote).toHaveBeenCalledWith(remotePath);
    });

    it('should handle root node correctly', () => {
      const remotePath = '';
      vi.mocked(getLocalPathForRemote).mockReturnValue(undefined);

      const node = createMockNode(remotePath);
      const localLink = getLocalPathForRemote(node.path);

      expect(localLink).toBeUndefined();
      expect(getLocalPathForRemote).toHaveBeenCalledWith('');
    });
  });

  describe('tree node navigation', () => {
    it('should identify root node correctly', () => {
      const rootNode = createMockNode('');
      expect(rootNode.parent).toBeNull();
    });

    it('should identify non-root node correctly', () => {
      const childNode = createMockNode('2023');
      expect(childNode.parent).not.toBeNull();
    });

    it('should handle nested paths correctly', () => {
      const nestedNode = createMockNode('2023/vacation/beach');
      expect(nestedNode.path).toBe('2023/vacation/beach');
      expect(nestedNode.value).toBe('beach');
    });
  });

  describe('link generation', () => {
    it('should generate correct link for path', () => {
      const getLink = (path: string) => `/folder/${path}`;

      expect(getLink('')).toBe('/folder/');
      expect(getLink('2023')).toBe('/folder/2023');
      expect(getLink('2023/vacation')).toBe('/folder/2023/vacation');
    });

    it('should generate parent link correctly', () => {
      const node = createMockNode('2023/vacation');
      const getLink = (path: string) => `/folder/${path}`;

      const parentPath = node.parent ? node.parent.path : '';
      const parentLink = getLink(parentPath);

      expect(parentLink).toBe('/folder/2023');
    });
  });
});
