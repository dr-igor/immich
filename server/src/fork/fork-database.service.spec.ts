import { ForkDatabaseRepository } from 'src/fork/fork-database.repository';
import { ForkDatabaseService } from 'src/fork/fork-database.service';
import { automock, AutoMocked } from 'test/utils';
import { beforeEach, describe, expect, it } from 'vitest';

describe(ForkDatabaseService.name, () => {
  let sut: ForkDatabaseService;
  let forkDatabaseRepo: AutoMocked<ForkDatabaseRepository>;

  beforeEach(() => {
    forkDatabaseRepo = automock(ForkDatabaseRepository, {
      args: [undefined, { setContext: () => {} } as never],
      strict: false,
    });
    sut = new ForkDatabaseService(forkDatabaseRepo as unknown as ForkDatabaseRepository);
  });

  it('runs fork migrations on application bootstrap', async () => {
    forkDatabaseRepo.runMigrations.mockResolvedValue();
    await sut.onApplicationBootstrap();
    expect(forkDatabaseRepo.runMigrations).toHaveBeenCalledOnce();
  });

  it('propagates errors from runMigrations', async () => {
    const error = new Error('fail');
    forkDatabaseRepo.runMigrations.mockRejectedValue(error);
    await expect(sut.onApplicationBootstrap()).rejects.toBe(error);
  });
});
