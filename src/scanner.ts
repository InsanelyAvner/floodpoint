// src/scanner.ts

import axios from "axios";
import { v4 as uuidv4 } from "uuid";

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

interface WebSocketData {
  event: string;
  payload: any; // Adjusted to 'any' for easier property access
}

export async function connectToWebSocket(
  classCode: string,
  cpcsRegion: string,
  presenterEmail: string
): Promise<WebSocketData[]> {
  const receivedData: WebSocketData[] = [];

  // Dynamically import @microsoft/signalr to ensure it's only loaded server-side
  let signalR;
  try {
    signalR = await import("@microsoft/signalr");
  } catch (importError) {
    console.error("Failed to import @microsoft/signalr:", importError);
    throw importError;
  }

  const { HubConnectionBuilder, LogLevel, HttpTransportType } = signalR;

  try {
    const url = `https://${cpcsRegion}.classpoint.app/classsession`;

    const validateResponse = await fetch(
      `https://${cpcsRegion}.classpoint.app/liveclasses/validate-join?presenterEmail=${encodeURIComponent(
        presenterEmail
      )}&classCode=${encodeURIComponent(
        classCode
      )}&participantId=${encodeURIComponent(
        "single-participant-id"
      )}&participantUsername=${encodeURIComponent("single-username")}`,
      {
        headers: {
          accept: "application/json, text/plain, */*",
          "content-type": "application/x-www-form-urlencoded",
        },
        method: "POST",
      }
    );

    if (!validateResponse.ok) {
      throw new Error("Validation failed.");
    }

    const username = `sigma_${uuidv4().slice(0, 8)}`;
    const participantId = `participant-${uuidv4()}`;

    const connection = new HubConnectionBuilder()
      .withUrl(url, {
        transport: HttpTransportType.WebSockets,
        withCredentials: true,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    // Event Handlers
    connection.on("SendJoinClass", (data: any) => {
      console.log("WebSocket event: SendJoinClass", data);
      receivedData.push({ event: "SendJoinClass", payload: data });
    });

    connection.on("SlideChanged", (data: any) => {
      console.log("WebSocket event: SlideChanged", data);
      receivedData.push({ event: "SlideChanged", payload: data });
    });

    connection.on("ReceiveMessage", (data: any) => {
      console.log("WebSocket event: ReceiveMessage", data);
      receivedData.push({ event: "ReceiveMessage", payload: data });
    });

    await connection.start();

    // Send initial protocol message
    await connection.send("Send", { protocol: "json", version: 1 });

    // Send ParticipantStartup message
    await connection.send("ParticipantStartup", {
      participantUsername: username,
      participantName: username,
      participantId: participantId,
      participantAvatar: "",
      cpcsRegion: cpcsRegion,
      presenterEmail: presenterEmail,
      classSessionId: "",
    });

    // Collect data for a fixed duration (e.g., 5 seconds)
    await new Promise((resolve) => setTimeout(resolve, 5000));

    await connection.stop();

    return receivedData;
  } catch (error) {
    console.error("Error during WebSocket connection:", error);
    throw error;
  }
}

export async function startScanIfNotRunning(
  start: number,
  end: number
): Promise<void> {
  if (scanning) return; // Prevent multiple scans at the same time
  scanning = true;
  shouldStop = false;

  for (let c = start; c <= end; c++) {
    if (shouldStop) {
      console.log("Scan stopped by user.");
      break;
    }

    try {
      const response = await axios.get(
        `https://apitwo.classpoint.app/classcode/region/byclasscode?classcode=${c}`
      );

      if (response.status === 200 && response.data.presenterEmail) {
        console.log("Found valid class code (awaiting validation):", c);

        try {
          const res = await connectToWebSocket(
            c.toString(),
            response.data.cpcsRegion,
            response.data.presenterEmail
          );

          // Check if any received data has isInSlideshow === true
          const isInSlideshow = res.some(
            (data) =>
              data.event === "SendJoinClass" &&
              data.payload &&
              data.payload.isInSlideshow === true
          );

          if (isInSlideshow) {
            console.log(
              `Presenter for class code ${c} is in slideshow. Adding to found codes.`
            );
            foundCodes.push({
              code: c,
              email: response.data.presenterEmail,
            });
          } else {
            console.log(
              `Presenter for class code ${c} is NOT in slideshow. Skipping.`
            );
          }

          // Optionally, log the entire WebSocket data for debugging
          // console.log("WebSocket data for class code", c, ":", res);
        } catch (websocketError) {
          console.error(
            "Error during WebSocket interaction for class code",
            c,
            ":",
            websocketError
          );
        }
      }
    } catch (error) {
      // console.error(
      //   "Error during API request for class code",
      //   c,
      //   ":",
      //   error
      // );
    }
  }

  scanning = false;
}

export function stopScan(): void {
  if (scanning) {
    shouldStop = true;
  }
}
