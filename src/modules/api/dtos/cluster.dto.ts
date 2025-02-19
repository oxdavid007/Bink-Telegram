import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EClusterStatus } from '@/shared/constants/enums';
import {
  IsEnum,
  IsOptional,
  IsNotEmpty,
  IsString,
  IsUUID,
  IsUrl,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class GetClustersQueryDto {
  @ApiPropertyOptional({ enum: EClusterStatus })
  @IsOptional()
  @IsEnum(EClusterStatus)
  @Transform(({ value }) => value?.toUpperCase())
  status?: EClusterStatus;
}

export class ClusterResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  model_id: string;

  @ApiProperty()
  url: string;

  @ApiProperty({ enum: EClusterStatus })
  status: EClusterStatus;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

export class CreateClusterDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  model_id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
    },
    { message: 'Invalid URL format. Must be a valid HTTP/HTTPS URL' },
  )
  url: string;

  @ApiProperty({ enum: EClusterStatus })
  @IsNotEmpty()
  @IsEnum(EClusterStatus)
  status: EClusterStatus;
}
