import { DeviceModelRepo } from '../domain/repositories/device-model-repo';
import { CosmosDeviceModelRepo } from '../infra/adapters/cosmos-device-model-repo';

let cachedDeviceModelRepo: DeviceModelRepo | undefined;

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


