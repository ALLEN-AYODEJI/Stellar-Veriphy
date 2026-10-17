export type SorobanEventType = "contract" | "system" | "diagnostic";

export interface RawSorobanEvent {
  id: string;
  ledger: number;
  ledgerClosedAt: string;
  contractId: string;
  type: SorobanEventType;
  // Decoded topic ScVal entries; the first entry is conventionally the event name symbol.
  topic: string[];
  value: unknown;
  txHash: string;
  inSuccessfulContractCall: boolean;
}

export interface IndexedEvent {
  id: string;
  ledger: number;
  ledgerClosedAt: string;
  contractId: string;
  eventType: SorobanEventType;
  eventName: string;
  topic: string[];
  value: unknown;
  txHash: string;
  inSuccessfulContractCall: boolean;
  indexedAt: string;
}

export interface EventQuery {
  contractId?: string;
  eventName?: string;
  fromLedger?: number;
  toLedger?: number;
  txHash?: string;
  limit?: number;
  offset?: number;
}

export interface EventQueryResult {
  events: IndexedEvent[];
  total: number;
  hasMore: boolean;
}

// Represents a gap in the observed ledger sequence — signals missed or delayed events.
export interface LedgerGap {
  fromLedger: number;
  toLedger: number;
  detectedAt: string;
}

export interface EventIndexerState {
  highWaterLedger: number;
  gaps: LedgerGap[];
  eventCount: number;
}

export class SorobanEventIndexer {
  private readonly events: Map<string, IndexedEvent> = new Map();
  private readonly byLedger: Map<number, string[]> = new Map();
  private readonly byContract: Map<string, string[]> = new Map();
  private readonly gaps: LedgerGap[] = [];
  private highWaterLedger = 0;

  ingest(raw: RawSorobanEvent): IndexedEvent {
    const indexed: IndexedEvent = {
      id: raw.id,
      ledger: raw.ledger,
      ledgerClosedAt: raw.ledgerClosedAt,
      contractId: raw.contractId,
      eventType: raw.type,
      eventName: raw.topic[0] ?? "unknown",
      topic: raw.topic,
      value: raw.value,
      txHash: raw.txHash,
      inSuccessfulContractCall: raw.inSuccessfulContractCall,
      indexedAt: new Date().toISOString(),
    };

    this.events.set(indexed.id, indexed);

    const ledgerIds = this.byLedger.get(raw.ledger) ?? [];
    ledgerIds.push(indexed.id);
    this.byLedger.set(raw.ledger, ledgerIds);

    const contractIds = this.byContract.get(raw.contractId) ?? [];
    contractIds.push(indexed.id);
    this.byContract.set(raw.contractId, contractIds);

    this.advanceHighWater(raw.ledger);
    return indexed;
  }

  ingestBatch(raws: RawSorobanEvent[]): IndexedEvent[] {
    return raws.map((r) => this.ingest(r));
  }

  query(q: EventQuery = {}): EventQueryResult {
    let ids: string[];

    if (q.contractId) {
      ids = this.byContract.get(q.contractId) ?? [];
    } else {
      ids = [...this.events.keys()];
    }

    let results = ids.map((id) => this.events.get(id)!).filter(Boolean);

    if (q.eventName !== undefined) {
      results = results.filter((e) => e.eventName === q.eventName);
    }
    if (q.fromLedger !== undefined) {
      results = results.filter((e) => e.ledger >= q.fromLedger!);
    }
    if (q.toLedger !== undefined) {
      results = results.filter((e) => e.ledger <= q.toLedger!);
    }
    if (q.txHash !== undefined) {
      results = results.filter((e) => e.txHash === q.txHash);
    }

    results.sort((a, b) => a.ledger - b.ledger || a.id.localeCompare(b.id));

    const total = results.length;
    const offset = q.offset ?? 0;
    const limit = q.limit ?? 100;

    return {
      events: results.slice(offset, offset + limit),
      total,
      hasMore: offset + limit < total,
    };
  }

  // Explicitly register a known gap when a ledger range was unavailable.
  recordGap(fromLedger: number, toLedger: number): void {
    this.gaps.push({ fromLedger, toLedger, detectedAt: new Date().toISOString() });
  }

  state(): EventIndexerState {
    return {
      highWaterLedger: this.highWaterLedger,
      gaps: [...this.gaps],
      eventCount: this.events.size,
    };
  }

  private advanceHighWater(ledger: number): void {
    if (this.highWaterLedger > 0 && ledger > this.highWaterLedger + 1) {
      this.recordGap(this.highWaterLedger + 1, ledger - 1);
    }
    if (ledger > this.highWaterLedger) {
      this.highWaterLedger = ledger;
    }
  }
}

export function createEventIndexer(): SorobanEventIndexer {
  return new SorobanEventIndexer();
}
