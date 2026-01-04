import { CosmosClient, Database, Container, SqlQuerySpec } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { OutboxMessage } from '../../domain/entities/outbox-message';
import { OutboxRepo } from '../../domain/repositories/outbox-repo';
import { logger, createLogger } from '../logging/logger';
import type { Logger } from '../logging/logger';

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
  private readonly log: Logger;

  constructor(options: CosmosOutboxRepoOptions) {
    this.log = createLogger({
      component: 'CosmosOutboxRepo',
      database: options.databaseId,
      container: options.containerId,
    });

    this.log.info('Initializing CosmosOutboxRepo', {
      endpoint: options.endpoint,
      authMethod: options.key ? 'key' : 'managed-identity',
    });

    if (options.key) {
      this.client = new CosmosClient({ endpoint: options.endpoint, key: options.key });
    } else {
      this.client = new CosmosClient({ endpoint: options.endpoint, aadCredentials: new DefaultAzureCredential() });
    }
    this.database = this.client.database(options.databaseId);
    this.container = this.database.container(options.containerId);

    this.log.info('CosmosOutboxRepo initialized successfully');
  }

  public async save(message: OutboxMessage): Promise<void> {
    const startTime = Date.now();
    this.log.debug('Saving outbox message', {
      messageId: message.id,
      eventType: message.eventType,
      subject: message.subject,
    });

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

    try {
      await this.container.items.upsert(doc);
      const duration = Date.now() - startTime;

      this.log.debug('Outbox message saved', {
        messageId: message.id,
        eventType: message.eventType,
        durationMs: duration,
      });
      this.log.trackDependency('CosmosDB.OutboxSave', 'CosmosDB', duration, true);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log.error('Failed to save outbox message', error as Error, {
        messageId: message.id,
        eventType: message.eventType,
        durationMs: duration,
      });
      this.log.trackDependency('CosmosDB.OutboxSave', 'CosmosDB', duration, false);
      throw error;
    }
  }

  public async listUnprocessed(batchSize: number = 50): Promise<OutboxMessage[]> {
    const startTime = Date.now();
    this.log.debug('Listing unprocessed outbox messages', { batchSize });

    try {
      const query: SqlQuerySpec = {
        query: 'SELECT TOP @batchSize * FROM c WHERE c.processed = false ORDER BY c.eventTime ASC',
        parameters: [{ name: '@batchSize', value: batchSize }]
      };

      const { resources } = await this.container.items.query<OutboxDocument>(query).fetchAll();
      const duration = Date.now() - startTime;
      const count = resources?.length ?? 0;

      this.log.debug('Unprocessed outbox messages retrieved', {
        count,
        durationMs: duration,
      });
      this.log.trackDependency('CosmosDB.ListUnprocessed', 'CosmosDB', duration, true, { count });

      return (resources || []).map(this.mapToDomain);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log.error('Failed to list unprocessed outbox messages', error as Error, { durationMs: duration });
      this.log.trackDependency('CosmosDB.ListUnprocessed', 'CosmosDB', duration, false);
      throw error;
    }
  }

  public async markAsProcessed(id: string): Promise<void> {
    const startTime = Date.now();
    this.log.debug('Marking outbox message as processed', { messageId: id });

    try {
      const item = this.container.item(id, id); // Assuming id is partition key
      const { resource } = await item.read<OutboxDocument>();

      if (resource) {
        resource.processed = true;
        resource.processedAt = new Date().toISOString();
        resource.ttl = 60 * 60 * 24 * 7; // Set TTL to 7 days for cleanup
        await item.replace(resource);

        const duration = Date.now() - startTime;
        this.log.debug('Outbox message marked as processed', {
          messageId: id,
          eventType: resource.eventType,
          durationMs: duration,
        });
        this.log.trackDependency('CosmosDB.MarkAsProcessed', 'CosmosDB', duration, true);
      } else {
        this.log.warn('Outbox message not found for marking as processed', { messageId: id });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log.error('Failed to mark outbox message as processed', error as Error, {
        messageId: id,
        durationMs: duration,
      });
      this.log.trackDependency('CosmosDB.MarkAsProcessed', 'CosmosDB', duration, false);
      throw error;
    }
  }

  public async markAsFailed(id: string, error: string): Promise<void> {
    const startTime = Date.now();
    this.log.warn('Marking outbox message as failed', { messageId: id, error });

    try {
      const item = this.container.item(id, id);
      const { resource } = await item.read<OutboxDocument>();

      if (resource) {
        resource.retryCount = (resource.retryCount || 0) + 1;
        resource.error = error;
        await item.replace(resource);

        const duration = Date.now() - startTime;
        this.log.warn('Outbox message marked as failed', {
          messageId: id,
          eventType: resource.eventType,
          retryCount: resource.retryCount,
          durationMs: duration,
        });
        this.log.trackDependency('CosmosDB.MarkAsFailed', 'CosmosDB', duration, true);
      } else {
        this.log.warn('Outbox message not found for marking as failed', { messageId: id });
      }
    } catch (err) {
      const duration = Date.now() - startTime;
      this.log.error('Failed to mark outbox message as failed', err as Error, {
        messageId: id,
        durationMs: duration,
      });
      this.log.trackDependency('CosmosDB.MarkAsFailed', 'CosmosDB', duration, false);
      throw err;
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
