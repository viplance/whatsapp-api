import { statSync } from 'node:fs';
import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const { createHash } = require('crypto');
import puppeteer, { Browser, Page } from 'puppeteer';

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

function getTimeHash(salt = ''): string {
  return createHash('sha256')
    .update(salt + Date.now().toString())
    .digest('hex');
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
  private sessionsFolder: string;
  private browsers: { [key: string]: { browser: Browser; page: Page } } = {};

  constructor(private configService: ConfigService) {
    this.demoMessage = this.configService.get('DEMO_MESSAGE');

    if (this.demoMessage === undefined)
      this.demoMessage =
        ' - This message was sent using the WhatsApp Direct Message API';

    this.whatsAppURL =
      this.configService.get('WHATSAPP_URL') || 'https://web.whatsapp.com';

    this.sessionsFolder =
      this.configService.get('SESSIONS_FOLDER') || '.sessions';
  }

  private async getBrowser(
    apiKey: string,
    createNew = false,
  ): Promise<[Browser, Page]> {
    let browser: Browser;
    let page: Page;

    if (this.browsers[apiKey]) {
      browser = this.browsers[apiKey]?.browser;
      page = this.browsers[apiKey]?.page;
    } else {
      if (!createNew) {
        // show an error if the apiKey does not exist
        try {
          const fullPath = `${this.sessionsFolder}/${apiKey}`;
          statSync(fullPath);
        } catch (err) {
          throw new HttpException('The apiKey does not exist', 401);
        }
      }

      browser = await puppeteer.launch({
        headless: false,
        userDataDir: `${this.sessionsFolder}/${apiKey}`,
        browserURL: this.whatsAppURL,
        args: [
          '-disable-features=InfiniteSessionRestore',
          '--hide-crash-restore-bubble',
        ],
      });

      browser.on('disconnected', () => {
        console.error(`Browser ${apiKey} disconnected`);
        delete this.browsers[apiKey];
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

    page.setDefaultTimeout(10000);

    this.browsers[apiKey] = { browser, page }; // save browser to speed up future calls

    return [browser, page];
  }

  async getWhatsAppCode(): Promise<{ apiKey: string; qrCode: string }> {
    const apiKey = getTimeHash(this.configService.get('SALT'));
    const [browser, page] = await this.getBrowser(apiKey, true);

    const canvas = await page.waitForSelector('canvas');

    const image = await canvas.screenshot({ encoding: 'base64' });

    return {
      apiKey,
      qrCode: 'data:image/png;base64,' + image,
    };
  }

  async sendWhatsAppMessage({
    apiKey,
    contact,
    text,
  }: {
    apiKey: string;
    contact: string;
    text: string;
  }): Promise<string> {
    const [browser, page] = await this.getBrowser(apiKey);

    const handleNeedToConnect = () => {
      throw new HttpException(
        'You need to connect to WhatsApp API in Admin Panel',
        403,
      );
    };

    // Fast UI checking
    const childNodesLength = await page.$eval(
      'div',
      (element) => element.childNodes[0]?.childNodes[0]?.childNodes.length,
    );

    if (childNodesLength === 3) {
      handleNeedToConnect();
    }

    // Type a phone number
    const phoneInputP = await page.waitForSelector(
      'div#side p.selectable-text.copyable-text',
    );
    await phoneInputP.click();
    await page.keyboard.type(contact, { delay: 1 });
    await page.keyboard.press('Enter', { delay: 100 });

    // Check is contact exist
    await page.waitForSelector('div#pane-side div');
    const closeButton = await page.waitForSelector('div#side span button');

    const contacts = await page.$('div#pane-side div div div');

    if (!contacts) {
      await closeButton.click(); // clean search field

      throw new HttpException('Contact does not exist', 404);
    }

    // Check is message can be send
    if (!(await page.$('footer p.selectable-text.copyable-text'))) {
      await closeButton.click(); // clean search field

      throw new HttpException('You can not to send the message to user', 405);
    }

    // Send the message
    await page.keyboard.type(`${text}${this.demoMessage}`, { delay: 1 });
    await page.keyboard.press('Enter', { delay: 100 });

    return 'Message sent';
  }
}
