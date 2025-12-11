import { CosmosClient, Database, Container, SqlQuerySpec } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { OutboxMessage } from '../../domain/entities/outbox-message';
import { OutboxRepo } from '../../domain/repositories/outbox-repo';

export type CosmosOutboxRepoOptions = {
  endpoint: string;
  key?: string;
  databaseId: string;
  containerId: string;
};

type OutboxDocument = {
  id: string;
  topic: string;
  eventType: string;
  subject: string;
  data: any;
  dataVersion: string;
  eventTime: string;
  processed: boolean;
  processedAt?: string;
  error?: string;
  retryCount: number;
  ttl?: number; // Time to live in seconds (optional, for auto-cleanup)
};

export class CosmosOutboxRepo implements OutboxRepo {
  private readonly client: CosmosClient;
  private readonly database: Database;
  private readonly container: Container;

  constructor(options: CosmosOutboxRepoOptions) {
    if (options.key) {
      this.client = new CosmosClient({ endpoint: options.endpoint, key: options.key });
    } else {
      this.client = new CosmosClient({ endpoint: options.endpoint, aadCredentials: new DefaultAzureCredential() });
    }
    this.database = this.client.database(options.databaseId);
    this.container = this.database.container(options.containerId);
  }

  public async save(message: OutboxMessage): Promise<void> {
    const doc: OutboxDocument = {
      id: message.id,
      topic: message.topic,
      eventType: message.eventType,
      subject: message.subject,
      data: message.data,
      dataVersion: message.dataVersion,
      eventTime: message.eventTime.toISOString(),
      processed: message.processed,
      processedAt: message.processedAt?.toISOString(),
      error: message.error,
      retryCount: message.retryCount,
    };

    await this.container.items.upsert(doc);
  }

  public async listUnprocessed(batchSize: number = 50): Promise<OutboxMessage[]> {
    const query: SqlQuerySpec = {
      query: 'SELECT TOP @batchSize * FROM c WHERE c.processed = false ORDER BY c.eventTime ASC',
      parameters: [{ name: '@batchSize', value: batchSize }]
    };

    const { resources } = await this.container.items.query<OutboxDocument>(query).fetchAll();
    return (resources || []).map(this.mapToDomain);
  }

  public async markAsProcessed(id: string): Promise<void> {
    const item = this.container.item(id, id); // Assuming id is partition key
    const { resource } = await item.read<OutboxDocument>();
    if (resource) {
      resource.processed = true;
      resource.processedAt = new Date().toISOString();
      resource.ttl = 60 * 60 * 24 * 7; // Set TTL to 7 days for cleanup
      await item.replace(resource);
    }
  }

  public async markAsFailed(id: string, error: string): Promise<void> {
    const item = this.container.item(id, id);
    const { resource } = await item.read<OutboxDocument>();
    if (resource) {
      resource.retryCount = (resource.retryCount || 0) + 1;
      resource.error = error;
      await item.replace(resource);
    }
  }

  private mapToDomain(doc: OutboxDocument): OutboxMessage {
    return {
      id: doc.id,
      topic: doc.topic,
      eventType: doc.eventType,
      subject: doc.subject,
      data: doc.data,
      dataVersion: doc.dataVersion,
      eventTime: new Date(doc.eventTime),
      processed: doc.processed,
      processedAt: doc.processedAt ? new Date(doc.processedAt) : undefined,
      error: doc.error,
      retryCount: doc.retryCount || 0
    };
  }
}

