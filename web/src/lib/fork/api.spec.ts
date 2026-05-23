import { getForkPeople, updatePersonMeta } from '$lib/fork/api';
import { defaults } from '@immich/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@immich/sdk', () => ({
  defaults: {
    baseUrl: 'http://localhost',
    headers: {} as Record<string, string>,
    fetch: vi.fn(),
  },
  getBaseUrl: () => 'http://localhost',
}));

const okJson = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);

const lastCall = () => vi.mocked(defaults.fetch!).mock.calls.at(-1)!;

describe('lib/fork/api', () => {
  beforeEach(() => {
    vi.mocked(defaults.fetch!).mockReset();
    defaults.headers = {};
  });

  describe('getForkPeople', () => {
    it('serializes page, size, withHidden and repeated tagIds', async () => {
      vi.mocked(defaults.fetch!).mockReturnValueOnce(okJson({ total: 0, hidden: 0, people: [] }));

      await getForkPeople({ page: 2, size: 10, withHidden: true, tagIds: ['a', 'b'] });

      const [url] = lastCall();
      expect(url).toBe('http://localhost/fork/people?page=2&size=10&withHidden=true&tagIds=a&tagIds=b');
    });

    it('omits withHidden when false and emits no query keys for empty options', async () => {
      vi.mocked(defaults.fetch!).mockReturnValueOnce(okJson({ total: 0, hidden: 0, people: [] }));
      await getForkPeople({});
      expect(lastCall()[0]).toBe('http://localhost/fork/people?');

      vi.mocked(defaults.fetch!).mockReturnValueOnce(okJson({ total: 0, hidden: 0, people: [] }));
      await getForkPeople({ withHidden: false, tagIds: [] });
      expect(lastCall()[0]).toBe('http://localhost/fork/people?');
    });

    it('returns the parsed JSON body', async () => {
      const body = { total: 1, hidden: 0, people: [{ id: 'p1', tags: [] }] };
      vi.mocked(defaults.fetch!).mockReturnValueOnce(okJson(body));
      await expect(getForkPeople()).resolves.toEqual(body);
    });

    it('passes through hasNextPage from the response', async () => {
      const body = { total: 5, hidden: 0, hasNextPage: true, people: [] };
      vi.mocked(defaults.fetch!).mockReturnValueOnce(okJson(body));
      await expect(getForkPeople({ page: 1, size: 1 })).resolves.toEqual(body);
    });
  });

  describe('updatePersonMeta', () => {
    it('issues a PUT with Content-Type merged onto defaults.headers and a JSON body', async () => {
      defaults.headers = { Authorization: 'Bearer x' };
      vi.mocked(defaults.fetch!).mockReturnValueOnce(okJson({ id: 'p1', tags: [], note: 'x' }));

      await updatePersonMeta('p1', { note: 'x', tagIds: ['t1'] });

      const [url, init] = lastCall();
      expect(url).toBe('http://localhost/fork/people/p1/meta');
      expect(init).toMatchObject({
        method: 'PUT',
        body: JSON.stringify({ note: 'x', tagIds: ['t1'] }),
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer x' },
      });
    });
  });

  describe('fetch fallback', () => {
    it('falls back to the global fetch when defaults.fetch is undefined', async () => {
      const originalDefaultFetch = defaults.fetch;
      defaults.fetch = undefined;
      const globalFetch = vi.fn().mockReturnValueOnce(okJson({ total: 0, hidden: 0, people: [] }));
      vi.stubGlobal('fetch', globalFetch);

      try {
        await getForkPeople();
        expect(globalFetch).toHaveBeenCalledOnce();
      } finally {
        defaults.fetch = originalDefaultFetch;
        vi.unstubAllGlobals();
      }
    });
  });

  describe('error handling', () => {
    it('throws an Error including status and body on non-ok responses', async () => {
      vi.mocked(defaults.fetch!).mockReturnValueOnce(
        Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('not found') } as Response),
      );

      await expect(getForkPeople()).rejects.toThrow(/404/);
    });
  });
});
