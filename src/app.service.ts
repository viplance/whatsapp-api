import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'WhatsApp direct message API';
  }

  sendMessage({ messanger }: { messanger: 'WhatsApp' }): string {
    if (messanger !== 'WhatsApp') {
      throw new NotFoundException('Invalid messanger').getResponse();
    }

    return 'Message sent to ' + messanger;
  }
}
