import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
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
    apiKey,
    contact,
    text,
  }: {
    messanger: Messanger;
    apiKey: string;
    contact: string;
    text: string;
  }): Promise<string> {
    if (messanger !== 'WhatsApp') {
      throw new HttpException('Invalid messanger', 400);
    }

    return this.puppeteerService.sendWhatsAppMessage({
      apiKey,
      contact,
      text,
    });
  }

  async createWhatsAppCode(
    apiKey?: string,
  ): Promise<{ apiKey: string; qrCode: string }> {
    return this.puppeteerService.createWhatsAppCode(apiKey);
  }
}
