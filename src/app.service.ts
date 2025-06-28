import { Injectable, NotFoundException } from '@nestjs/common';
import { PuppeteerService } from './services/puppeteer.service';
import { Messanger } from './types/messanger.type';

@Injectable()
export class AppService {
  constructor(private readonly puppeteerService: PuppeteerService) {}
  getHello(): string {
    return 'WhatsApp direct message API';
  }

  async sendMessage({
    messanger,
    browserId,
    phoneNumber,
    text,
  }: {
    messanger: Messanger;
    browserId: string;
    phoneNumber: string;
    text: string;
  }): Promise<string> {
    if (messanger !== 'WhatsApp') {
      throw new NotFoundException('Invalid messanger').getResponse();
    }

    return this.puppeteerService.sendWhatsAppMessage({
      browserId,
      phoneNumber,
      text,
    });
  }

  async getWhatsAppCode(): Promise<{ browserId: string; qrCode: string }> {
    return this.puppeteerService.getWhatsAppCode();
  }
}
