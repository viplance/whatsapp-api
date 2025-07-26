import { Browser, Page } from 'puppeteer';

export type CachedBrowser = { browser: Browser; page: Page; isBusy: boolean };
