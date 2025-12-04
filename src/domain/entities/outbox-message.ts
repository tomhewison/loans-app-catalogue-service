export type OutboxMessage = {
  id: string;
  topic: string;
  eventType: string;
  subject: string;
  data: any;
  dataVersion: string;
  eventTime: Date;
  processed: boolean;
  processedAt?: Date;
  error?: string;
  retryCount: number;
};

