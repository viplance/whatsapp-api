import { ApiProperty } from '@nestjs/swagger';
import { Messanger } from 'src/types/messanger.type';

export class SendMessageDto {
  @ApiProperty({ example: 'WhatsApp' })
  messanger: Messanger;
}
