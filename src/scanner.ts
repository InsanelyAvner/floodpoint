import axios from "axios";

export interface ValidClassCode {
  code: number;
  email: string;
}

let scanning = false;
let shouldStop = false;
const foundCodes: ValidClassCode[] = [];

export function getFoundCodes(): ValidClassCode[] {
  return foundCodes;
}

export function isScanning(): boolean {
  return scanning;
}

export async function startScanIfNotRunning(start: number, end: number): Promise<void> {
  if (scanning) return; // Prevent multiple scans at the same time
  scanning = true;
  shouldStop = false;

  for (let c = start; c <= end; c++) {
    if (shouldStop) {
      console.log("Scan stopped by user.");
      break;
    }

    try {
      const response = await axios.get(`https://apitwo.classpoint.app/classcode/region/byclasscode?classcode=${c}`);
      if (response.status === 200 && response.data.presenterEmail) {
        foundCodes.push({ code: c, email: response.data.presenterEmail });
        console.log(response.data)
      }
      
    } catch (error) {
      // Handle or log errors if necessary
    }
  }

  scanning = false;
}

export function stopScan(): void {
  if (scanning) {
    shouldStop = true;
  }
}