import { Injectable } from '@nestjs/common';
import { FileMigrationProvider, Kysely, Migrator } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import 'src/fork/database';
import { LoggingRepository } from 'src/repositories/logging.repository';
import { DB } from 'src/schema';

@Injectable()
export class ForkDatabaseRepository {
  constructor(
    @InjectKysely() private db: Kysely<DB>,
    private logger: LoggingRepository,
  ) {
    this.logger.setContext(ForkDatabaseRepository.name);
  }

  async runMigrations(): Promise<void> {
    this.logger.log('Running fork migrations');

    const migrator = this.createMigrator();
    const { error, results } = await migrator.migrateToLatest();

    for (const result of results ?? []) {
      if (result.status === 'Success') {
        this.logger.log(`Fork migration "${result.migrationName}" succeeded`);
      } else if (result.status === 'Error') {
        this.logger.warn(`Fork migration "${result.migrationName}" failed`);
      }
    }

    if (error) {
      this.logger.error(`Fork migrations failed: ${error}`);
      throw error;
    }

    this.logger.log('Finished running fork migrations');
  }

  private createMigrator(): Migrator {
    return new Migrator({
      db: this.db,
      migrationTableName: 'kysely_migration_fork',
      migrationLockTableName: 'kysely_migration_fork_lock',
      provider: new FileMigrationProvider({
        fs: { readdir },
        path: { join },
        // eslint-disable-next-line unicorn/prefer-module
        migrationFolder: join(__dirname, '..', 'schema/fork-migrations'),
      }),
    });
  }
}
