"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface ValidClassCode {
  code: number;
  email: string;
}

export default function Home() {
  const [threads, setThreads] = useState(8);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<ValidClassCode[]>([]);
  const [polling, setPolling] = useState(false);
  const pathname = usePathname();

  const startScan = async () => {
    setLoading(true);
    setMessage("");
    setResults([]);
    setPolling(true);

    try {
      const response = await fetch("/api/spam/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start: 10000,
          end: 99999,
        }),
      });

      const data = await response.json();
      if (data.started) {
        setMessage("Scan started successfully.");
      } else {
        setMessage("Failed to start scan.");
        setPolling(false);
      }
    } catch (error) {
      setMessage("Error initiating scan.");
      setPolling(false);
    } finally {
      setLoading(false);
    }
  };

  const stopScan = async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/spam/stop", {
        method: "POST",
      });

      const data = await response.json();
      if (data.stopped) {
        setMessage("Scan stopped successfully.");
        setPolling(false);
      } else {
        setMessage(data.message || "No scan was running.");
      }
    } catch (error) {
      setMessage("Error stopping scan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!polling) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/spam/results");
        if (res.ok) {
          const data = await res.json();
          setResults(data.validClassCodes || []);
        }
      } catch (error) {
        console.error("Error fetching results:", error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [polling]);

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <nav className="row-start-1 flex gap-4 items-center">
        <Link
          href="/"
          className={`px-4 py-2 rounded-lg transition-colors ${
            pathname === "/"
              ? "bg-foreground text-background"
              : "hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          Flooder
        </Link>
        <Link
          href="/scanner"
          className={`px-4 py-2 rounded-lg transition-colors ${
            pathname === "/scanner"
              ? "bg-foreground text-background"
              : "hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          Scanner
        </Link>
      </nav>
      <main className="flex flex-col gap-6 row-start-2 items-center sm:items-start w-full max-w-md">
        <Image
          className=""
          src="/logo.svg"
          alt="ClassPoint Scanner logo"
          width={270}
          height={57}
          priority
        />
        <h1 className="text-lg text-center sm:text-left font-[family-name:var(--font-geist-mono)] mb-1">
          Scanner Mode
        </h1>

        <ol className="list-inside list-decimal text-sm text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
          <li className="mb-2">
            Get started by clicking the scan button to begin searching for valid
            codes.
          </li>
          <li className="mb-2">
            The scanner will automatically collect and display results.
          </li>
          <li>Use the stop button to end the scan at any time.</li>
        </ol>

        <div className="flex gap-4 items-center flex-col sm:flex-row w-full">
          <Button
            className={`rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-white text-black gap-2 hover:bg-gray-300 dark:hover:bg-gray-200 text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer ${
              loading || polling ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={startScan}
            disabled={loading || polling}
          >
            {loading || polling ? "Scanning..." : "Start Scan"}
          </Button>

          <button
            className={`rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-red-500 text-white gap-2 hover:bg-red-600 text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer ${
              !polling || loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={stopScan}
            disabled={!polling || loading}
          >
            {loading ? "Processing..." : "Stop Scan"}
          </button>
        </div>

        {message && (
          <div className="w-full p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
            <p className="text-sm text-center">{message}</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="w-full mt-4">
            <h2 className="text-lg font-semibold mb-4">
              Valid Class Codes Found:
            </h2>
            <ul className="space-y-2">
              {results.map((item) => (
                <li
                  key={item.code}
                  className="p-4 border rounded-lg bg-green-100 border-green-500 dark:bg-green-900 dark:border-green-700"
                >
                  <p className="font-bold text-green-800 dark:text-green-200">
                    Code: {item.code}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Email: {item.email}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      <footer className="row-start-3 text-sm text-center">
        ClassPoint Scanner - Use responsibly
      </footer>
    </div>
  );
}
