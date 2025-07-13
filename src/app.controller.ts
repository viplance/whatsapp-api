import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiBody, ApiExcludeEndpoint, ApiOperation } from '@nestjs/swagger';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateWatsAppCodeDto } from './dto/create-whatsapp-code.dto';

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

  @Post('/create-qr-code')
  @ApiOperation({ summary: 'Creating WhatsApp QR code' })
  @ApiBody({ type: CreateWatsAppCodeDto, required: false })
  getQrCode(
    @Body() createWatsAppCodeDto?: CreateWatsAppCodeDto,
  ): Promise<{ apiKey: string; qrCode: string }> {
    return this.appService.createWhatsAppCode(createWatsAppCodeDto.apiKey);
  }
}
