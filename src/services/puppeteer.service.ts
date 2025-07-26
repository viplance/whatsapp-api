import { readFileSync, statSync } from 'node:fs';
import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import puppeteer, { Browser, Page } from 'puppeteer';
import { CachedBrowser } from 'src/types/cached-browser.type';

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
  private browsers: { [key: string]: CachedBrowser } = {};

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

  private getBrowserWSEndpoint(apiKey: string): string {
    try {
      const fullPath = `${this.sessionsFolder}/${apiKey}/DevToolsActivePort`;
      const fileContent = readFileSync(fullPath, 'utf8');

      return `ws://127.0.0.1:${fileContent.replace(/(?:\r\n|\r|\n)/g, '')}`;
    } catch (err) {
      // show an error if the apiKey does not exist
      throw new HttpException('The apiKey does not exist', 401);
    }
  }

  private async getBrowser(
    apiKey: string,
    createNew = false,
  ): Promise<CachedBrowser> {
    let browser: Browser;
    let page: Page;
    let isBusy = false;

    if (this.browsers[apiKey]) {
      browser = this.browsers[apiKey].browser;
      page = this.browsers[apiKey].page;
      isBusy = this.browsers[apiKey].isBusy;
    } else {
      let browserWSEndpoint: string;

      if (!createNew) {
        browserWSEndpoint = this.getBrowserWSEndpoint(apiKey);
      }

      try {
        browser = await puppeteer.launch({
          headless: false,
          userDataDir: `${this.sessionsFolder}/${apiKey}`,
          browserURL: this.whatsAppURL,
          args: [
            '--no-sandbox',
            '--disabled-setupid-sandbox',
            '-disable-features=InfiniteSessionRestore',
            '--hide-crash-restore-bubble',
          ],
        });
      } catch (error) {
        browser = await puppeteer.connect({
          browserWSEndpoint,
        });
      }

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

    this.browsers[apiKey] = { browser, page, isBusy }; // save browser to speed up future calls

    return { browser, page, isBusy };
  }

  private setBrowserIsBusy(apiKey: string, isBusy: boolean): void {
    if (!this.browsers[apiKey]) {
      throw new HttpException('The apiKey does not exist', 401);
    }

    this.browsers[apiKey].isBusy = isBusy;
  }

  async createWhatsAppCode(
    apiKey: string,
  ): Promise<{ apiKey: string; qrCode: string }> {
    if (apiKey) {
      this.getBrowserWSEndpoint(apiKey);
    }

    const processedApiKey =
      apiKey || getTimeHash(this.configService.get('SALT'));

    const { page } = await this.getBrowser(processedApiKey, true);

    const canvas = await page.waitForSelector('canvas');

    const image = await canvas.screenshot({ encoding: 'base64' });

    return {
      apiKey: processedApiKey,
      qrCode: `data:image/png;base64,${image}`,
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
    const startTime = Date.now();

    const { page, isBusy } = await this.getBrowser(apiKey);

    if (isBusy) {
      throw new HttpException('The apiKey worker is busy', 400);
    }

    this.setBrowserIsBusy(apiKey, true);

    const handleNeedToConnect = () => {
      this.setBrowserIsBusy(apiKey, false);

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

      this.setBrowserIsBusy(apiKey, false);

      throw new HttpException('Contact does not exist', 404);
    }

    // Check is message can be send
    if (!(await page.$('footer p.selectable-text.copyable-text'))) {
      await closeButton.click(); // clean search field

      this.setBrowserIsBusy(apiKey, false);

      throw new HttpException('You can`t send the message to user', 405);
    }

    // Send the message
    await page.keyboard.type(`${text}${this.demoMessage}`, { delay: 1 });
    await page.keyboard.press('Enter', { delay: 100 });

    this.setBrowserIsBusy(apiKey, false);

    return `Message sent in ${Date.now() - startTime} ms`;
  }

  async addContact({
    apiKey,
    contact,
  }: {
    apiKey: string;
    contact: string;
  }): Promise<string> {
    const startTime = Date.now();

    const { page, isBusy } = await this.getBrowser(apiKey);

    if (isBusy) {
      throw new HttpException('The apiKey worker is busy', 400);
    }

    this.setBrowserIsBusy(apiKey, true);

    const handleNeedToConnect = () => {
      this.setBrowserIsBusy(apiKey, false);

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

    // Check is contact exist
    await page.waitForSelector('div#pane-side div');
    const openChatButton = await page.waitForSelector('button[data-tab="2"]');
    await openChatButton.click();
    const newContactDiv = await page.waitForSelector(
      'div[data-tab="3"] div:nth-of-type(3)',
    );
    await newContactDiv.click();

    // roll back
    // const openChatButton = await page.waitForSelector('button[data-tab="2"]');
    // await openChatButton.click();

    return null;
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

      this.setBrowserIsBusy(apiKey, false);

      throw new HttpException('Contact does not exist', 404);
    }

    // Check is message can be send
    if (!(await page.$('footer p.selectable-text.copyable-text'))) {
      await closeButton.click(); // clean search field

      this.setBrowserIsBusy(apiKey, false);

      throw new HttpException('You can`t send the message to user', 405);
    }

    this.setBrowserIsBusy(apiKey, false);

    return `Contact has been added in ${Date.now() - startTime} ms`;
  }
}
