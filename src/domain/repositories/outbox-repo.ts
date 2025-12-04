import { OutboxMessage } from '../entities/outbox-message';

export interface OutboxRepo {
  save(message: OutboxMessage): Promise<void>;
  listUnprocessed(batchSize?: number): Promise<OutboxMessage[]>;
  markAsProcessed(id: string): Promise<void>;
  markAsFailed(id: string, error: string): Promise<void>;
}

