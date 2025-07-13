import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateWatsAppCodeDto {
  @ApiProperty({
    example: '3508aedc0a8e3044af39bc3fb3ab08168532b48cd192c68bf8',
    required: false,
  })
  @IsOptional()
  @IsString()
  apiKey?: string;
}
