import { ForkDatabaseRepository } from 'src/fork/fork-database.repository';
import { ForkDatabaseService } from 'src/fork/fork-database.service';
import { ForkPersonController } from 'src/fork/fork-person.controller';
import { ForkPersonRepository } from 'src/fork/fork-person.repository';
import { ForkPersonService } from 'src/fork/fork-person.service';

export const forkControllers = [ForkPersonController];

export const forkProviders = [ForkDatabaseRepository, ForkDatabaseService, ForkPersonRepository, ForkPersonService];
