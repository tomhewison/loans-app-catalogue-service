import { CosmosClient, Database, Container, ItemResponse, SqlQuerySpec } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { Device, DeviceStatus } from '../../domain/entities/device';
import { DeviceRepo } from '../../domain/repositories/device-repo';
import { logger, createLogger } from '../logging/logger';
import type { Logger } from '../logging/logger';

export type CosmosDeviceRepoOptions = {
  endpoint: string;
  key?: string;
  databaseId: string;
  containerId: string;
};

type DeviceDocument = {
  id: string;
  deviceModelId: string;
  serialNumber: string;
  assetId: string;
  status: DeviceStatus;
  condition: string;
  notes?: string;
  purchaseDate: string; // ISO string
  updatedAt: string; // ISO string
  partitionKey?: string; // if using a custom partition key
};

export class CosmosDeviceRepo implements DeviceRepo {
  private readonly client: CosmosClient;
  private readonly database: Database;
  private readonly container: Container;
  private readonly log: Logger;

  constructor(private readonly options: CosmosDeviceRepoOptions) {
    this.log = createLogger({
      component: 'CosmosDeviceRepo',
      database: options.databaseId,
      container: options.containerId,
    });

    this.log.info('Initializing CosmosDeviceRepo', {
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

    this.log.info('CosmosDeviceRepo initialized successfully');
  }

  public async getById(id: string): Promise<Device | null> {
    const startTime = Date.now();
    this.log.debug('Getting device by ID', { deviceId: id });

    try {
      const { resource } = await this.container.item(id, id).read<DeviceDocument>();
      const duration = Date.now() - startTime;

      if (!resource) {
        this.log.debug('Device not found', { deviceId: id, durationMs: duration });
        this.log.trackDependency('CosmosDB.GetById', this.options.endpoint, duration, true, { found: false });
        return null;
      }

      this.log.debug('Device retrieved successfully', { deviceId: id, durationMs: duration });
      this.log.trackDependency('CosmosDB.GetById', this.options.endpoint, duration, true, { found: true });

      return this.mapToDomain(resource);
    } catch (error) {
      if (this.isNotFound(error)) {
        const duration = Date.now() - startTime;
        this.log.debug('Device not found (404)', { deviceId: id, durationMs: duration });
        return null;
      }

      this.log.debug('Falling back to query for device', { deviceId: id });

      try {
        const query: SqlQuerySpec = { 
          query: 'SELECT TOP 1 * FROM c WHERE c.id = @id', 
          parameters: [{ name: '@id', value: id }] 
        };
        const { resources } = await this.container.items.query<DeviceDocument>(query).fetchAll();
        const duration = Date.now() - startTime;

        if (!resources || resources.length === 0) {
          this.log.debug('Device not found (query)', { deviceId: id, durationMs: duration });
          return null;
        }

        this.log.debug('Device retrieved via query', { deviceId: id, durationMs: duration });
        return this.mapToDomain(resources[0]);
      } catch (inner) {
        const duration = Date.now() - startTime;
        this.log.error('Failed to get device by ID', inner as Error, { deviceId: id, durationMs: duration });
        this.log.trackDependency('CosmosDB.GetById', this.options.endpoint, duration, false);
        throw this.wrapError('Failed to get Device by id', inner);
      }
    }
  }

  public async list(): Promise<Device[]> {
    const startTime = Date.now();
    this.log.debug('Listing all devices');

    try {
      const query: SqlQuerySpec = { query: 'SELECT * FROM c' };
      const { resources } = await this.container.items.query<DeviceDocument>(query).fetchAll();
      const duration = Date.now() - startTime;
      const count = resources?.length ?? 0;

      this.log.debug('Devices listed', { durationMs: duration, count });
      this.log.trackDependency('CosmosDB.List', this.options.endpoint, duration, true, { count });

      return (resources ?? []).map((doc) => this.mapToDomain(doc));
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log.error('Failed to list devices', error as Error, { durationMs: duration });
      this.log.trackDependency('CosmosDB.List', this.options.endpoint, duration, false);
      throw this.wrapError('Failed to list Devices', error);
    }
  }

  public async listByDeviceModelId(deviceModelId: string): Promise<Device[]> {
    const startTime = Date.now();
    this.log.debug('Listing devices by device model', { deviceModelId });

    try {
      const query: SqlQuerySpec = {
        query: 'SELECT * FROM c WHERE c.deviceModelId = @deviceModelId',
        parameters: [{ name: '@deviceModelId', value: deviceModelId }],
      };
      const { resources } = await this.container.items.query<DeviceDocument>(query).fetchAll();
      const duration = Date.now() - startTime;
      const count = resources?.length ?? 0;

      this.log.debug('Devices by model retrieved', { deviceModelId, durationMs: duration, count });
      this.log.trackDependency('CosmosDB.ListByDeviceModelId', this.options.endpoint, duration, true, { count });

      return (resources ?? []).map((doc) => this.mapToDomain(doc));
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log.error('Failed to list devices by model', error as Error, { deviceModelId, durationMs: duration });
      this.log.trackDependency('CosmosDB.ListByDeviceModelId', this.options.endpoint, duration, false);
      throw this.wrapError('Failed to list Devices by deviceModelId', error);
    }
  }

  public async listByStatus(status: DeviceStatus): Promise<Device[]> {
    const startTime = Date.now();
    this.log.debug('Listing devices by status', { status });

    try {
      const query: SqlQuerySpec = {
        query: 'SELECT * FROM c WHERE c.status = @status',
        parameters: [{ name: '@status', value: status }],
      };
      const { resources } = await this.container.items.query<DeviceDocument>(query).fetchAll();
      const duration = Date.now() - startTime;
      const count = resources?.length ?? 0;

      this.log.debug('Devices by status retrieved', { status, durationMs: duration, count });
      this.log.trackDependency('CosmosDB.ListByStatus', this.options.endpoint, duration, true, { status, count });

      return (resources ?? []).map((doc) => this.mapToDomain(doc));
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log.error('Failed to list devices by status', error as Error, { status, durationMs: duration });
      this.log.trackDependency('CosmosDB.ListByStatus', this.options.endpoint, duration, false);
      throw this.wrapError('Failed to list Devices by status', error);
    }
  }

  public async save(device: Device): Promise<Device> {
    const startTime = Date.now();
    this.log.info('Saving device', {
      deviceId: device.id,
      deviceModelId: device.deviceModelId,
      status: device.status,
    });

    try {
      const document = this.mapToDocument(device);
      const response: ItemResponse<DeviceDocument> = await this.container.items.upsert<DeviceDocument>(document, {
        preTriggerInclude: [],
      });
      const duration = Date.now() - startTime;

      if (!response.resource) {
        this.log.error('Upsert returned no resource', new Error('No resource returned'), { deviceId: device.id });
        throw new Error('Upsert returned no resource');
      }

      this.log.debug('Device saved', {
        deviceId: device.id,
        status: device.status,
        durationMs: duration,
      });
      this.log.trackDependency('CosmosDB.Save', this.options.endpoint, duration, true);

      return this.mapToDomain(response.resource);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log.error('Failed to save device', error as Error, { deviceId: device.id, durationMs: duration });
      this.log.trackDependency('CosmosDB.Save', this.options.endpoint, duration, false);
      throw this.wrapError('Failed to save Device', error);
    }
  }

  public async delete(id: string): Promise<void> {
    const startTime = Date.now();
    this.log.info('Deleting device', { deviceId: id });

    try {
      await this.container.item(id, id).delete();
      const duration = Date.now() - startTime;

      this.log.debug('Device deleted', { deviceId: id, durationMs: duration });
      this.log.trackDependency('CosmosDB.Delete', this.options.endpoint, duration, true);
    } catch (error) {
      const duration = Date.now() - startTime;

      if (this.isNotFound(error)) {
        this.log.debug('Device not found for deletion (idempotent)', { deviceId: id, durationMs: duration });
        return; // idempotent delete
      }

      this.log.error('Failed to delete device', error as Error, { deviceId: id, durationMs: duration });
      this.log.trackDependency('CosmosDB.Delete', this.options.endpoint, duration, false);
      throw this.wrapError('Failed to delete Device', error);
    }
  }

  private mapToDocument(device: Device): DeviceDocument {
    return {
      id: device.id,
      deviceModelId: device.deviceModelId,
      serialNumber: device.serialNumber,
      assetId: device.assetId,
      status: device.status,
      condition: device.condition,
      notes: device.notes,
      purchaseDate: device.purchaseDate.toISOString(),
      updatedAt: device.updatedAt.toISOString(),
    };
  }

  private mapToDomain(document: DeviceDocument): Device {
    // Validate required fields
    if (!document.id) {
      this.log.error('Device document missing id field', new Error('Missing id'));
      throw new Error('Device document missing required field: id');
    }
    if (!document.deviceModelId) {
      throw new Error('Device document missing required field: deviceModelId');
    }
    if (!document.serialNumber) {
      throw new Error('Device document missing required field: serialNumber');
    }
    if (!document.assetId) {
      throw new Error('Device document missing required field: assetId');
    }
    if (!document.status) {
      throw new Error('Device document missing required field: status');
    }
    if (!document.condition) {
      throw new Error('Device document missing required field: condition');
    }
    if (!document.purchaseDate) {
      throw new Error('Device document missing required field: purchaseDate');
    }
    if (!document.updatedAt) {
      throw new Error('Device document missing required field: updatedAt');
    }

    const purchaseDate = new Date(document.purchaseDate);
    if (Number.isNaN(purchaseDate.getTime())) {
      throw new Error(`Invalid purchaseDate value from Cosmos DB: ${document.purchaseDate}`);
    }

    const updatedAt = new Date(document.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) {
      throw new Error(`Invalid updatedAt value from Cosmos DB: ${document.updatedAt}`);
    }

    return {
      id: document.id,
      deviceModelId: document.deviceModelId,
      serialNumber: document.serialNumber,
      assetId: document.assetId,
      status: document.status,
      condition: document.condition,
      notes: document.notes,
      purchaseDate,
      updatedAt,
    };
  }

  private wrapError(message: string, error: unknown): Error {
    if (error instanceof Error) {
      return new Error(`${message}: ${error.message}`);
    }
    return new Error(`${message}: ${String(error)}`);
  }

  private isNotFound(error: unknown): boolean {
    const anyErr = error as { code?: number; statusCode?: number } | undefined;
    const code = anyErr?.code ?? anyErr?.statusCode;
    return code === 404;
  }
}
