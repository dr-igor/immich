import { Module } from '@nestjs/common';
import { ForkDatabaseRepository } from 'src/fork/fork-database.repository';
import { ForkDatabaseService } from 'src/fork/fork-database.service';
import { ForkPersonController } from 'src/fork/fork-person.controller';
import { ForkPersonRepository } from 'src/fork/fork-person.repository';
import { ForkPersonService } from 'src/fork/fork-person.service';
import { ConfigRepository } from 'src/repositories/config.repository';
import { LoggingRepository } from 'src/repositories/logging.repository';
import { PersonRepository } from 'src/repositories/person.repository';
import { SystemMetadataRepository } from 'src/repositories/system-metadata.repository';
import { TagRepository } from 'src/repositories/tag.repository';

@Module({
  controllers: [ForkPersonController],
  providers: [
    ForkDatabaseRepository,
    ForkDatabaseService,
    ForkPersonRepository,
    ForkPersonService,
    // Upstream repositories needed by fork services — re-declared here so NestJS can inject them
    // in the ForkModule scope. The ApiModule also provides these, so no double instantiation occurs
    // when ForkModule is imported: NestJS deduplicates providers at the module level.
    PersonRepository,
    TagRepository,
    ConfigRepository,
    LoggingRepository,
    SystemMetadataRepository,
  ],
})
export class ForkModule {}
