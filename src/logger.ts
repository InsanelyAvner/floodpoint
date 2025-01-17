// app/api/spam/route.ts
import { NextResponse } from 'next/server';
import axios from 'axios';
import { VERSION, AMOUNT_THREADS, START_CODE, END_CODE, COLLECT_ONLY } from '@/src/constants';
import { getDriver } from '@/src/driver';
import { parseArgs } from '@/src/args';
import puppeteer, { Browser } from 'puppeteer';

interface ValidClassCode {
    code: number;
    email: string;
}

export async function POST(request: Request) {
    const starttime = new Date().toISOString().replace(/[:.]/g, '-');

    const { threads } = await request.json();
    const AMOUNT_THREADS = parseArgs({ threads: threads.toString() });

    console.clear();
    console.log(`classpoint-spammer v${VERSION}\nSearching...\n`);

    const validClassCodes: ValidClassCode[] = [];

    // Function to search a single code
    const searchCode = async (c: number, browser: Browser): Promise<void> => {
        try {
            const { data, status } = await axios.get(`https://apitwo.classpoint.app/classcode/region/byclasscode?classcode=${c}`);
            if (status !== 200) return;

            if (COLLECT_ONLY && !data.presenterEmail.includes(COLLECT_ONLY)) return;

            const page = await browser.newPage();
            await page.goto(`https://www.classpoint.app/?code=${c}`, { waitUntil: 'networkidle2' });

            // Click the join button
            await page.waitForSelector('#root > div > div:nth-child(1) > div:nth-child(3) > div > div > div:nth-child(2) > div:nth-child(2) > button', { timeout: 5000 });
            const joinButton = await page.$('#root > div > div:nth-child(1) > div:nth-child(3) > div > div > div:nth-child(2) > div:nth-child(2) > button');
            if (joinButton) {
                await joinButton.click();
            } else {
                console.log(`Error for ${c}: Join button not found.\n`);
                await page.close();
                return;
            }

            // Enter name
            await page.waitForSelector('#standard-basic', { timeout: 5000 });
            const nameInput = await page.$('#standard-basic');
            if (nameInput) {
                await nameInput.type("​"); // Invisible character as in original script
            } else {
                console.log(`Error for ${c}: Name input not found.\n`);
                await page.close();
                return;
            }

            // Click the final join button
            await page.waitForSelector('#root > div > div:nth-child(1) > div:nth-child(3) > div > div > div:nth-child(4) > button', { timeout: 5000 });
            const finalJoinButton = await page.$('#root > div > div:nth-child(1) > div:nth-child(3) > div > div > div:nth-child(4) > button');
            if (finalJoinButton) {
                await finalJoinButton.click();
            } else {
                console.log(`Error for ${c}: Final Join button not found.\n`);
                await page.close();
                return;
            }

            // Check for slideshow
            const imageElement = await page.$('#root > div > div:nth-child(1) > div:nth-child(2) > div > div > div:nth-child(1) > div > div:nth-child(1) > div > div:nth-child(1) > div > img');
            if (imageElement) {
                const imageUrl = await page.evaluate(el => el.getAttribute('src'), imageElement);
                if (imageUrl) {
                    validClassCodes.push({ code: c, email: data.presenterEmail });
                    console.log(`Class code found: ${c}`);
                } else {
                    console.log(`Error for ${c}: No slideshow found.\n`);
                }
            } else {
                console.log(`Error for ${c}: Not in slideshow.\n`);
            }

            await page.close();
        } catch (error: any) {
            console.log(`Error for ${c}: ${error.message}\n`);
        }
    };

    // Function to handle a range of codes
    const searchCodes = async (start: number, end: number, browser: Browser): Promise<void> => {
        for (let code = start; code < end; code++) {
            await searchCode(code, browser);
        }
    };

    // Initialize browsers
    const browsers: Browser[] = [];
    for (let i = 0; i < AMOUNT_THREADS; i++) {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        browsers.push(browser);
    }

    const threadIncrement = Math.floor((END_CODE - START_CODE) / AMOUNT_THREADS);
    const threadsPromises: Promise<void>[] = [];

    for (let i = 0; i < AMOUNT_THREADS; i++) {
        const start = START_CODE + i * threadIncrement;
        const end = i === AMOUNT_THREADS - 1 ? END_CODE : start + threadIncrement;
        threadsPromises.push(searchCodes(start, end, browsers[i]));
    }

    await Promise.all(threadsPromises);

    // Close browsers
    await Promise.all(browsers.map(browser => browser.close()));

    console.log(`Search completed at ${starttime}\n`);

    return NextResponse.json({ 
        message: "Search completed", 
        timestamp: starttime,
        validClassCodes 
    });
}
