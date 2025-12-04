import { EventPublisher } from '../../domain/repositories/event-publisher';
import { OutboxRepo } from '../../domain/repositories/outbox-repo';
import { randomUUID } from 'crypto';

export class OutboxEventPublisher implements EventPublisher {
  constructor(private readonly outboxRepo: OutboxRepo) {}

  public async publish(topic: string, eventType: string, subject: string, data: any, dataVersion: string = '1.0'): Promise<void> {
    await this.outboxRepo.save({
      id: randomUUID(),
      topic,
      eventType,
      subject,
      data,
      dataVersion,
      eventTime: new Date(),
      processed: false,
      retryCount: 0
    });
  }

  public async publishBatch(events: { topic: string; eventType: string; subject: string; data: any; dataVersion?: string }[]): Promise<void> {
    // Process sequentially to ensure all are saved
    for (const event of events) {
      await this.publish(
        event.topic,
        event.eventType,
        event.subject,
        event.data,
        event.dataVersion
      );
    }
  }
}

