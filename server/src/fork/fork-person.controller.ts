import { Body, Controller, Get, HttpCode, HttpStatus, Param, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthDto } from 'src/dtos/auth.dto';
import { PersonSearchDto } from 'src/dtos/person.dto';
import { Permission } from 'src/enum';
import {
  ForkEnrichedPeopleResponseDto,
  ForkEnrichedPersonResponseDto,
  ForkPersonMetaUpdateDto,
  ForkPersonSearchDto,
} from 'src/fork/fork-person.dto';
import { ForkPersonService } from 'src/fork/fork-person.service';
import { Auth, Authenticated } from 'src/middleware/auth.guard';
import { UUIDParamDto } from 'src/validation';

@ApiTags('Fork - People')
@Controller('fork/people')
export class ForkPersonController {
  constructor(private readonly service: ForkPersonService) {}

  @Get()
  @Authenticated({ permission: Permission.PersonRead })
  getAllPeople(
    @Auth() auth: AuthDto,
    @Query() personDto: PersonSearchDto,
    @Query() forkDto: ForkPersonSearchDto,
  ): Promise<ForkEnrichedPeopleResponseDto> {
    return this.service.getAllPeople(auth, { ...personDto, ...forkDto });
  }

  @Put(':id/meta')
  @HttpCode(HttpStatus.OK)
  @Authenticated({ permission: Permission.PersonUpdate })
  updatePersonMeta(
    @Auth() auth: AuthDto,
    @Param() { id }: UUIDParamDto,
    @Body() dto: ForkPersonMetaUpdateDto,
  ): Promise<ForkEnrichedPersonResponseDto> {
    return this.service.updatePersonMeta(auth, id, dto);
  }
}
