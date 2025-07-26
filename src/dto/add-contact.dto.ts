import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Messanger } from 'src/types/messanger.type';

export class AddContactDto {
  @ApiProperty({ example: 'WhatsApp' })
  @IsNotEmpty()
  @IsString()
  messanger: Messanger;

  @ApiProperty({ example: '3685484b29a04a77a7253406db8d9e38' })
  @IsNotEmpty()
  @IsString()
  apiKey: string;

  @ApiProperty({ example: '995146876518' })
  @IsNotEmpty()
  @IsString()
  contact: string;
}
