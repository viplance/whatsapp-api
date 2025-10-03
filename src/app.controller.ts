import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiBody, ApiExcludeEndpoint, ApiOperation } from '@nestjs/swagger';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateWatsAppCodeDto } from './dto/create-whatsapp-code.dto';
import { AddContactDto } from './dto/add-contact.dto';

@Controller({
  path: 'api',
  version: '1',
})
export class AppController {
  constructor(private readonly appService: AppService) {}

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

  @Post('/add-contact')
  @ApiOperation({ summary: 'Add new contact' })
  addContact(@Body() addContactDto: AddContactDto): Promise<string> {
    return this.appService.addContact({
      messanger: addContactDto.messanger,
      apiKey: addContactDto.apiKey,
      contact: addContactDto.contact,
    });
  }

  @Post('/create-qr-code')
  @ApiOperation({ summary: 'Creating WhatsApp QR code' })
  @ApiBody({ type: CreateWatsAppCodeDto, required: false })
  getQrCode(
    @Body() createWatsAppCodeDto?: CreateWatsAppCodeDto,
  ): Promise<{ apiKey: string; qrCode: string }> {
    throw new Error('Blah');
    return this.appService.createWhatsAppCode(createWatsAppCodeDto.apiKey);
  }
}
