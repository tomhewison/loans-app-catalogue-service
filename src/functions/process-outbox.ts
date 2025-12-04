import { app, InvocationContext, Timer } from '@azure/functions';
import { getOutboxRepo, getEventGridPublisher } from '../config/appServices';

export async function processOutbox(myTimer: Timer, context: InvocationContext): Promise<void> {
  const outboxRepo = getOutboxRepo();
  const eventGridPublisher = getEventGridPublisher(); // This is the real publisher

  try {
    const messages = await outboxRepo.listUnprocessed(20); // Process 20 at a time
    
    if (messages.length === 0) {
      return;
    }

    context.log(`Processing ${messages.length} outbox messages...`);

    for (const message of messages) {
      try {
        await eventGridPublisher.publish(
          message.topic,
          message.eventType,
          message.subject,
          message.data,
          message.dataVersion
        );
        
        await outboxRepo.markAsProcessed(message.id);
      } catch (error) {
        context.error(`Failed to process outbox message ${message.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        await outboxRepo.markAsFailed(message.id, errorMessage);
      }
    }
  } catch (error) {
    context.error('Error in processOutbox:', error);
  }
}

app.timer('processOutbox', {
  schedule: '0 */1 * * * *', // Run every 1 minute
  handler: processOutbox,
});

