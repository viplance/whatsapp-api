import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Messanger } from 'src/types/messanger.type';

export class SendMessageDto {
  @ApiProperty({ example: 'WhatsApp' })
  @IsNotEmpty()
  @IsString()
  messanger: Messanger;

  @ApiProperty({ example: '3685484b29a04a77a7253406db8d9e38' })
  @IsNotEmpty()
  @IsString()
  browserId: string;

  @ApiProperty({ example: '995146876518' })
  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @ApiProperty({ example: 'YourMessageText' })
  @IsNotEmpty()
  @IsString()
  text: string;
}
