import { EventGridPublisherClient, AzureKeyCredential } from '@azure/eventgrid';
import { EventPublisher } from '../../domain/repositories/event-publisher';
import { logger, createLogger } from '../logging/logger';
import type { Logger } from '../logging/logger';

export type EventGridPublisherOptions = {
  topicEndpoint: string;
  key: string;
};

export class EventGridPublisher implements EventPublisher {
  private readonly client: EventGridPublisherClient<any>;
  private readonly log: Logger;
  private readonly isConfigured: boolean;

  constructor(options: EventGridPublisherOptions) {
    this.log = createLogger({
      component: 'EventGridPublisher',
    });

    this.isConfigured = !!(options.topicEndpoint && options.key);

    if (!this.isConfigured) {
      this.log.warn('EventGridPublisher: Missing endpoint or key. Events will not be published.', {
        hasEndpoint: !!options.topicEndpoint,
        hasKey: !!options.key,
      });
    } else {
      this.log.info('EventGridPublisher initialized', {
        topicEndpoint: options.topicEndpoint,
      });
    }

    this.client = new EventGridPublisherClient(
      options.topicEndpoint || '',
      'EventGrid',
      new AzureKeyCredential(options.key || '')
    );
  }

  public async publish(topic: string, eventType: string, subject: string, data: any, dataVersion: string = '1.0'): Promise<void> {
    if (!this.isConfigured) {
      this.log.debug('Skipping event publish - EventGrid not configured', { eventType, subject });
      return;
    }

    const startTime = Date.now();
    this.log.info('Publishing event to Event Grid', {
      eventType,
      subject,
      dataVersion,
    });

    try {
      await this.client.send([{
        eventType,
        subject,
        dataVersion,
        data,
        eventTime: new Date()
      }]);

      const duration = Date.now() - startTime;
      this.log.debug('Event published', {
        eventType,
        subject,
        durationMs: duration,
      });
      this.log.trackDependency('EventGrid.Publish', topic, duration, true, { eventType });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log.warn('Failed to publish event', {
        eventType,
        subject,
        durationMs: duration,
        error: (error as Error).message,
      });
      this.log.trackDependency('EventGrid.Publish', topic, duration, false, { eventType });
      // Note: In this architecture, the Outbox Processor uses this publisher.
      // If this fails, the Outbox Processor (in process-outbox.ts) catches the error
      // and marks the message as failed in the outbox, allowing for retries.
    }
  }

  public async publishBatch(events: { topic: string; eventType: string; subject: string; data: any; dataVersion?: string }[]): Promise<void> {
    if (!this.isConfigured) {
      this.log.debug('Skipping batch event publish - EventGrid not configured', { eventCount: events.length });
      return;
    }

    const startTime = Date.now();
    this.log.info('Publishing batch events to Event Grid', {
      eventCount: events.length,
      eventTypes: [...new Set(events.map(e => e.eventType))].join(','),
    });

    try {
      await this.client.send(events.map(e => ({
        eventType: e.eventType,
        subject: e.subject,
        dataVersion: e.dataVersion || '1.0',
        data: e.data,
        eventTime: new Date()
      })));

      const duration = Date.now() - startTime;
      this.log.debug('Batch events published', {
        eventCount: events.length,
        durationMs: duration,
      });
      this.log.trackDependency('EventGrid.PublishBatch', 'EventGrid', duration, true, { eventCount: events.length });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log.warn('Failed to publish batch events', {
        eventCount: events.length,
        durationMs: duration,
        error: (error as Error).message,
      });
      this.log.trackDependency('EventGrid.PublishBatch', 'EventGrid', duration, false, { eventCount: events.length });
    }
  }
}
