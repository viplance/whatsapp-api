import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'WhatsApp direct message API';
  }

  sendMessage() {
    return 'Message sent';
  }
}
