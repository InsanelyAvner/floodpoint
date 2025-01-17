// src/driver.ts
import puppeteer, { Browser } from 'puppeteer';

export async function getDriver(): Promise<Browser> {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    return browser;
}
