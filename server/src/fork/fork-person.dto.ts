import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString } from 'class-validator';
import { PersonResponseDto } from 'src/dtos/person.dto';
import { TagResponseDto } from 'src/dtos/tag.dto';
import { Optional, ValidateUUID } from 'src/validation';

export class ForkPersonMetaUpdateDto {
  @ApiPropertyOptional({ description: 'Private note about this person' })
  @Optional({ nullable: true, emptyToNull: true })
  @IsString()
  note?: string | null;

  @ValidateUUID({ each: true, optional: true, nullable: true, description: 'Tag IDs to assign to this person' })
  tagIds?: string[] | null;
}

export class ForkPersonSearchDto {
  @Transform(({ value }) => {
    if (value === undefined || value === null) {
      return value;
    }
    return Array.isArray(value) ? value : [value];
  })
  @ValidateUUID({
    each: true,
    optional: true,
    nullable: true,
    description: 'Filter by tag IDs (AND logic). Pass null to find untagged people.',
  })
  tagIds?: string[] | null;
}

export class ForkEnrichedPersonResponseDto extends PersonResponseDto {
  @ApiPropertyOptional({ description: 'Private note about this person' })
  note?: string | null;

  @ApiProperty({ type: () => TagResponseDto, isArray: true, description: 'Tags assigned to this person' })
  tags!: TagResponseDto[];
}

export class ForkEnrichedPeopleResponseDto {
  @ApiProperty({ type: 'integer', description: 'Total number of people' })
  total!: number;

  @ApiProperty({ type: 'integer', description: 'Number of hidden people' })
  hidden!: number;

  @ApiProperty({ type: () => ForkEnrichedPersonResponseDto, isArray: true })
  people!: ForkEnrichedPersonResponseDto[];

  @ApiPropertyOptional({ description: 'Whether there are more pages' })
  hasNextPage?: boolean;
}
