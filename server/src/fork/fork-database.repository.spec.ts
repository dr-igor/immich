import { Kysely, Migrator } from 'kysely';
import { ForkDatabaseRepository } from 'src/fork/fork-database.repository';
import { LoggingRepository } from 'src/repositories/logging.repository';
import { DB } from 'src/schema';
import { automock, AutoMocked } from 'test/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe(ForkDatabaseRepository.name, () => {
  let sut: ForkDatabaseRepository;
  let logger: AutoMocked<LoggingRepository>;
  let migrator: { migrateToLatest: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    // eslint-disable-next-line no-sparse-arrays
    logger = automock(LoggingRepository, { args: [, { getEnv: () => ({}) }], strict: false });
    sut = new ForkDatabaseRepository({} as Kysely<DB>, logger as unknown as LoggingRepository);

    migrator = { migrateToLatest: vi.fn() };
    vi.spyOn(sut as unknown as { createMigrator: () => Migrator }, 'createMigrator').mockReturnValue(
      migrator as unknown as Migrator,
    );
  });

  it('logs each successful migration and completes', async () => {
    migrator.migrateToLatest.mockResolvedValue({
      results: [
        { migrationName: 'fork-001', status: 'Success', direction: 'Up' },
        { migrationName: 'fork-002', status: 'Success', direction: 'Up' },
      ],
    });

    await expect(sut.runMigrations()).resolves.toBeUndefined();
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('fork-001'));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('fork-002'));
    expect(logger.log).toHaveBeenCalledWith('Finished running fork migrations');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns on per-migration errors and re-throws the migrator error', async () => {
    const error = new Error('boom');
    migrator.migrateToLatest.mockResolvedValue({
      results: [{ migrationName: 'fork-001', status: 'Error', direction: 'Up' }],
      error,
    });

    await expect(sut.runMigrations()).rejects.toBe(error);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('fork-001'));
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });

  it('constructs a real Migrator pointing at the fork-migrations folder', () => {
    vi.restoreAllMocks();
    const fresh = new ForkDatabaseRepository({} as Kysely<DB>, logger as unknown as LoggingRepository);
    const realMigrator = (fresh as unknown as { createMigrator: () => Migrator }).createMigrator();
    expect(realMigrator).toBeInstanceOf(Migrator);
  });

  it('throws when the migrator-level error is set even without per-migration results', async () => {
    const error = new Error('migrator failure');
    migrator.migrateToLatest.mockResolvedValue({ error });

    await expect(sut.runMigrations()).rejects.toBe(error);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('migrator failure'));
  });
});
