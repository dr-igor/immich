import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ForkDatabaseRepository } from 'src/fork/fork-database.repository';

@Injectable()
export class ForkDatabaseService implements OnApplicationBootstrap {
  constructor(private readonly forkDatabaseRepository: ForkDatabaseRepository) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.forkDatabaseRepository.runMigrations();
  }
}
