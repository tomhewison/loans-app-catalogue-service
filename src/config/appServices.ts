import { DeviceModelRepo } from '../domain/repositories/device-model-repo';
import { DeviceRepo } from '../domain/repositories/device-repo';
import { CosmosDeviceModelRepo } from '../infra/adapters/cosmos-device-model-repo';
import { CosmosDeviceRepo } from '../infra/adapters/cosmos-device-repo';
import { EventPublisher } from '../domain/repositories/event-publisher';
import { EventGridPublisher } from '../infra/adapters/event-grid-publisher';
import { OutboxRepo } from '../domain/repositories/outbox-repo';
import { CosmosOutboxRepo } from '../infra/adapters/cosmos-outbox-repo';
import { OutboxEventPublisher } from '../infra/adapters/outbox-event-publisher';

let cachedDeviceModelRepo: DeviceModelRepo | undefined;
let cachedDeviceRepo: DeviceRepo | undefined;
let cachedEventPublisher: EventPublisher | undefined;
let cachedEventGridPublisher: EventPublisher | undefined; // The real publisher
let cachedOutboxRepo: OutboxRepo | undefined;

export const getDeviceModelRepo = (): DeviceModelRepo => {
  if (!cachedDeviceModelRepo) {
    const endpoint = process.env.COSMOS_ENDPOINT || '';
    const databaseId = process.env.COSMOS_DATABASE_ID || 'catalogue-db';
    const containerId = process.env.COSMOS_CONTAINER_ID || 'device-models';
    const key = process.env.COSMOS_KEY;

    if (!endpoint) {
      throw new Error('COSMOS_ENDPOINT environment variable is required');
    }

    cachedDeviceModelRepo = new CosmosDeviceModelRepo({
      endpoint,
      key,
      databaseId,
      containerId,
    });
  }
  return cachedDeviceModelRepo;
};

export const getDeviceRepo = (): DeviceRepo => {
  if (!cachedDeviceRepo) {
    const endpoint = process.env.COSMOS_ENDPOINT || '';
    const databaseId = process.env.COSMOS_DATABASE_ID || 'catalogue-db';
    const containerId = process.env.COSMOS_DEVICES_CONTAINER_ID || 'devices';
    const key = process.env.COSMOS_KEY;

    if (!endpoint) {
      throw new Error('COSMOS_ENDPOINT environment variable is required');
    }

    cachedDeviceRepo = new CosmosDeviceRepo({
      endpoint,
      key,
      databaseId,
      containerId,
    });
  }
  return cachedDeviceRepo;
};

export const getOutboxRepo = (): OutboxRepo => {
  if (!cachedOutboxRepo) {
    const endpoint = process.env.COSMOS_ENDPOINT || '';
    const databaseId = process.env.COSMOS_DATABASE_ID || 'catalogue-db';
    const containerId = process.env.COSMOS_OUTBOX_CONTAINER_ID || 'outbox';
    const key = process.env.COSMOS_KEY;

    if (!endpoint) {
      throw new Error('COSMOS_ENDPOINT environment variable is required');
    }

    cachedOutboxRepo = new CosmosOutboxRepo({
      endpoint,
      key,
      databaseId,
      containerId,
    });
  }
  return cachedOutboxRepo;
};

// Returns the EventGrid publisher for direct publishing (used by the Outbox Processor)
export const getEventGridPublisher = (): EventPublisher => {
  if (!cachedEventGridPublisher) {
    const topicEndpoint = process.env.EVENT_GRID_TOPIC_ENDPOINT || '';
    const key = process.env.EVENT_GRID_TOPIC_KEY || '';
    
    cachedEventGridPublisher = new EventGridPublisher({
      topicEndpoint,
      key
    });
  }
  return cachedEventGridPublisher;
};

// Returns the Outbox publisher (used by the Application Layer)
export const getEventPublisher = (): EventPublisher => {
  if (!cachedEventPublisher) {
    // Uses OutboxRepo internally
    cachedEventPublisher = new OutboxEventPublisher(getOutboxRepo());
  }
  return cachedEventPublisher;
};
