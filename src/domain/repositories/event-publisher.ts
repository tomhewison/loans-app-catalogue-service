export interface EventPublisher {
  publish(topic: string, eventType: string, subject: string, data: any, dataVersion?: string): Promise<void>;
  publishBatch(events: { topic: string; eventType: string; subject: string; data: any; dataVersion?: string }[]): Promise<void>;
}

