import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const { createHash } = require('crypto');
import puppeteer, { Browser, Page } from 'puppeteer';

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

function getTimeHash() {
  return createHash('sha256').update(Date.now().toString()).digest('hex');
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
  private demoMessage: string;
  private whatsAppURL: string;
  private browsers: { [key: string]: { browser: Browser; page: Page } } = {};

  constructor(private configService: ConfigService) {
    this.demoMessage = this.configService.get('DEMO_MESSAGE');
    if (this.demoMessage === undefined)
      this.demoMessage =
        ' - This message was sent using the WhatsApp Direct Message API';
    this.whatsAppURL =
      this.configService.get('WHATSAPP_URL') || 'https://web.whatsapp.com';
  }

  private async getBrowser(browserId: string): Promise<[Browser, Page]> {
    let browser: Browser;
    let page: Page;

    if (this.browsers[browserId]) {
      browser = this.browsers[browserId]?.browser;
      page = this.browsers[browserId]?.page;
    } else {
      browser = await puppeteer.launch({
        headless: false,
        userDataDir: `.sessions/${browserId}`,
        browserURL: this.whatsAppURL,
        args: [
          '-disable-features=InfiniteSessionRestore',
          '--hide-crash-restore-bubble',
        ],
      });

      browser.on('disconnected', () => {
        console.error(`Browser ${browserId} disconnected`);
        delete this.browsers[browserId];
      });

      const pages = await browser.pages();

      if (pages[0]) {
        page = pages[0];
      } else {
        page = await browser.newPage();
      }

      await page.goto(this.whatsAppURL, {
        waitUntil: 'networkidle0',
      });

      await waitTillHTMLRendered(page);
    }

    this.browsers[browserId] = { browser, page }; // save browser to speed up future calls

    return [browser, page];
  }

  async getWhatsAppCode(): Promise<{ browserId: string; qrCode: string }> {
    const browserId = getTimeHash();
    const [browser, page] = await this.getBrowser(browserId);

    const canvas = await page.waitForSelector('canvas');

    const image = await canvas.screenshot({ encoding: 'base64' });

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
    const [browser, page] = await this.getBrowser(browserId);

    const handleNoInterface = () => {
      throw new InternalServerErrorException(
        'Send error. Interface is not loaded',
      );
    };

    let contactsCount = 0;

    const phoneNumberInputPSelector = 'p.selectable-text.copyable-text';
    const phoneInputP = await page.waitForSelector(phoneNumberInputPSelector);

    if (!phoneInputP) {
      console.error('No phone input p element');
      handleNoInterface();
    }

    // // Click on phone input
    console.debug('Clicking on phone input');
    await phoneInputP.click();
    await page.keyboard.type(phoneNumber, { delay: 1 });
    await page.keyboard.press('Enter', { delay: 100 });
    await page.keyboard.type(`${text}${this.demoMessage}`, { delay: 1 });
    await page.keyboard.press('Enter', { delay: 100 });

    const myDivs = await page.$$eval('div', (divs) =>
      divs.map((element) => {
        if (element.textContent === 'Continue') {
          // element.click();
        }

        return element.textContent;
      }),
    );

    return 'Message sent';
  }
}
