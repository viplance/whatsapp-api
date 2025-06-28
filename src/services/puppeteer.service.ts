import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

const waitTillHTMLRendered = async (page, timeout = 30000) => {
  const checkDurationMsecs = 100;
  const maxChecks = timeout / checkDurationMsecs;
  let lastHTMLSize = 0;
  let checkCounts = 1;
  let countStableSizeIterations = 0;
  const minStableSizeIterations = 3;

  while (checkCounts++ <= maxChecks) {
    let html = await page.content();
    let currentHTMLSize = html.length;

    if (lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize)
      countStableSizeIterations++;
    else countStableSizeIterations = 0;

    if (countStableSizeIterations >= minStableSizeIterations) {
      break;
    }

    lastHTMLSize = currentHTMLSize;
    await delay(checkDurationMsecs);
  }
};

@Injectable()
export class PuppeteerService {
  private browsers: { [key: string]: Browser } = {};

  async getWhatsAppCode(): Promise<{ browserId: string; qrCode: string }> {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle0' });

    await waitTillHTMLRendered(page);

    const canvas = await page.waitForSelector('canvas');
    await canvas.screenshot({
      path: 'canvas.png',
    });

    const image = await canvas.screenshot({ encoding: 'base64' });

    const browserId = browser.wsEndpoint().split('/browser/')[1];
    this.browsers[browserId] = browser;

    return {
      browserId,
      qrCode: 'data:image/png;base64,' + image,
    };
  }

  async sendWhatsAppMessage({
    browserId,
    phoneNumber,
    text,
  }: {
    browserId: string;
    phoneNumber: string;
    text: string;
  }): Promise<string> {
    const browser = this.browsers[browserId];

    if (!browser) {
      throw new NotFoundException('Browser not found').getResponse();
    }

    const handleNoInterface = () => {
      delete this.browsers[browserId];

      throw new InternalServerErrorException(
        'Send error. Interface is not loaded',
      );
    };

    const page = (await browser.pages())[1];

    if (!page) {
      throw new NotFoundException('Page not found').getResponse();
    }

    const popup = await page.$('div[data-animate-modal-popup="true"]');

    if (popup) {
      console.debug('popup');
    }

    const phoneNumberInputSelector = 'span.selectable-text';
    const span = await page.$(phoneNumberInputSelector);

    if (!span) {
      handleNoInterface();
    }

    await page.type(phoneNumberInputSelector, phoneNumber);

    const firstContactItem = await page.waitForSelector(
      'div[role="listitem"]',
      { timeout: 0 },
    )[1];

    if (!firstContactItem) {
      throw new NotFoundException('Contact not found').getResponse();
    }

    await firstContactItem.click();

    const messageInputSelector = 'div[contenteditable="true"]';
    const messageInput = await page.waitForSelector(messageInputSelector);

    if (!messageInput) {
      handleNoInterface();
    }

    await page.type(messageInputSelector, text);

    const sendButtonSelector = 'button[aria-label="Send"]';
    const sendButton = await page.waitForSelector(sendButtonSelector);

    if (!sendButton) {
      handleNoInterface();
    }

    await sendButton.click();

    return 'Message sent';
  }
}
