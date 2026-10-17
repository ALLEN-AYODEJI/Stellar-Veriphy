export type TransactionStatus = "PENDING" | "CONFIRMED" | "FAILED" | "TIMEOUT";

const HORIZON_URL = "https://horizon.stellar.org";
const DEFAULT_POLL_INTERVAL_MS = 3000;
const DEFAULT_TIMEOUT_MS = 120000;

export async function fetchTransactionStatus(txHash: string): Promise<TransactionStatus> {
  try {
    const response = await fetch(`${HORIZON_URL}/transactions/${txHash}`);

    if (response.status === 404) {
      return "PENDING";
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.successful === false) {
      return "FAILED";
    }

    return "CONFIRMED";
  } catch (error) {
    console.error("Error fetching transaction status:", error);
    return "PENDING";
  }
}

export interface PollTransactionOptions {
  intervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  onStatus?: (status: TransactionStatus) => void;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Polling aborted", "AbortError"));
      return;
    }
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        reject(new DOMException("Polling aborted", "AbortError"));
      },
      { once: true }
    );
  });
}

export async function pollTransactionStatus(
  txHash: string,
  options: PollTransactionOptions = {}
): Promise<TransactionStatus> {
  const intervalMs = options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() <= deadline) {
    const status = await fetchTransactionStatus(txHash);
    options.onStatus?.(status);
    if (status !== "PENDING") return status;

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await wait(Math.min(intervalMs, remaining), options.signal);
  }

  options.onStatus?.("TIMEOUT");
  return "TIMEOUT";
}
