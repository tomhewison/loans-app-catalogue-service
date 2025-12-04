import { EventGridPublisherClient, AzureKeyCredential } from '@azure/eventgrid';
import { EventPublisher } from '../../domain/repositories/event-publisher';

export type EventGridPublisherOptions = {
  topicEndpoint: string;
  key: string;
};

export class EventGridPublisher implements EventPublisher {
  private readonly client: EventGridPublisherClient<any>;

  constructor(options: EventGridPublisherOptions) {
    if (!options.topicEndpoint || !options.key) {
      console.warn('EventGridPublisher: Missing endpoint or key. Events will not be published.');
    }
    this.client = new EventGridPublisherClient(
      options.topicEndpoint,
      'EventGrid',
      new AzureKeyCredential(options.key)
    );
  }

  public async publish(topic: string, eventType: string, subject: string, data: any, dataVersion: string = '1.0'): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.send([{
        eventType,
        subject,
        dataVersion,
        data,
        eventTime: new Date()
      }]);
    } catch (error) {
      console.error(`Failed to publish event ${eventType}:`, error);
      // Note: In this architecture, the Outbox Processor uses this publisher.
      // If this fails, the Outbox Processor (in process-outbox.ts) catches the error
      // and marks the message as failed in the outbox, allowing for retries.
    }
  }

  public async publishBatch(events: { topic: string; eventType: string; subject: string; data: any; dataVersion?: string }[]): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.send(events.map(e => ({
        eventType: e.eventType,
        subject: e.subject,
        dataVersion: e.dataVersion || '1.0',
        data: e.data,
        eventTime: new Date()
      })));
    } catch (error) {
      console.error('Failed to publish batch events:', error);
    }
  }
}

