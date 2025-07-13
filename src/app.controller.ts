import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiExcludeEndpoint, ApiOperation } from '@nestjs/swagger';
import { SendMessageDto } from './dto/send-message.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiExcludeEndpoint()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('/send-message')
  @ApiOperation({ summary: 'Send message' })
  sendMessage(@Body() sendMessageDto: SendMessageDto): Promise<string> {
    return this.appService.sendMessage({
      messanger: sendMessageDto.messanger,
      apiKey: sendMessageDto.apiKey,
      contact: sendMessageDto.contact,
      text: sendMessageDto.text,
    });
  }

  @Get('/get-qr-code')
  @ApiOperation({ summary: 'Get WhatsApp QR code' })
  getQrCode(): Promise<{ apiKey: string; qrCode: string }> {
    return this.appService.getWhatsAppCode();
  }
}
