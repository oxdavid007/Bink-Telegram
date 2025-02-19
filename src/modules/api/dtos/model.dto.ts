import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { EModelStatus, EModelType } from '@/shared/constants/enums';

export class CreateModelDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ enum: EModelType })
  @IsNotEmpty()
  @IsEnum(EModelType)
  type: EModelType;

  @ApiProperty({ enum: EModelStatus })
  @IsNotEmpty()
  @IsEnum(EModelStatus)
  status: EModelStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
} 