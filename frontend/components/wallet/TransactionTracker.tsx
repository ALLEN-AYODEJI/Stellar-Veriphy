"use client";

import { useEffect, useState } from "react";
import { FiAlertCircle, FiCheckCircle, FiExternalLink, FiLoader } from "react-icons/fi";

import { pollTransactionStatus, type TransactionStatus } from "@/utils/transaction";

interface TransactionTrackerProps {
  txHash: string;
}

export function TransactionTracker({ txHash }: TransactionTrackerProps) {
  const [status, setStatus] = useState<TransactionStatus>("PENDING");

  useEffect(() => {
    const controller = new AbortController();
    setStatus("PENDING");
    void pollTransactionStatus(txHash, {
      signal: controller.signal,
      onStatus: setStatus,
    }).catch((error) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("FAILED");
    });

    return () => controller.abort();
  }, [txHash]);

  const getStatusDisplay = () => {
    switch (status) {
      case "PENDING":
        return {
          icon: <FiLoader className="w-5 h-5 animate-spin text-blue-500" />,
          text: "Pending",
          color: "text-blue-600",
        };
      case "CONFIRMED":
        return {
          icon: <FiCheckCircle className="w-5 h-5 text-green-500" />,
          text: "Confirmed",
          color: "text-green-600",
        };
      case "FAILED":
        return {
          icon: <FiAlertCircle className="w-5 h-5 text-red-500" />,
          text: "Failed",
          color: "text-red-600",
        };
      case "TIMEOUT":
        return {
          icon: <FiAlertCircle className="w-5 h-5 text-amber-500" />,
          text: "Still pending",
          color: "text-amber-600",
        };
    }
  };

  const display = getStatusDisplay();
  const explorerUrl = `https://stellar.expert/explorer/public/tx/${txHash}`;

  return (
    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      <div>{display.icon}</div>
      <div className="flex-1">
        <p className={`font-medium ${display.color}`}>{display.text}</p>
        {status === "PENDING" && <p className="text-xs text-gray-500 dark:text-gray-400">Waiting for Stellar finality...</p>}
        {status === "TIMEOUT" && <p className="text-xs text-gray-500 dark:text-gray-400">No final status yet. Check the explorer or retry in a minute.</p>}
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{txHash}</p>
      </div>
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
        title="View on Stellar Expert"
      >
        <FiExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </a>
    </div>
  );
}
