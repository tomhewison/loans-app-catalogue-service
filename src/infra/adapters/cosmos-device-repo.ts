import { CosmosClient, Database, Container, ItemResponse, SqlQuerySpec } from '@azure/cosmos';
import { Device, DeviceStatus } from '../../domain/entities/device';
import { DeviceRepo } from '../../domain/repositories/device-repo';

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

  constructor(private readonly options: CosmosDeviceRepoOptions) {
    this.client = new CosmosClient({ endpoint: options.endpoint, key: options.key });
    this.database = this.client.database(options.databaseId);
    this.container = this.database.container(options.containerId);
  }

  public async getById(id: string): Promise<Device | null> {
    try {
      const { resource } = await this.container.item(id, id).read<DeviceDocument>();
      if (!resource) return null;
      return this.mapToDomain(resource);
    } catch (error) {
      if (this.isNotFound(error)) return null;
      try {
        const query: SqlQuerySpec = { 
          query: 'SELECT TOP 1 * FROM c WHERE c.id = @id', 
          parameters: [{ name: '@id', value: id }] 
        };
        const { resources } = await this.container.items.query<DeviceDocument>(query).fetchAll();
        if (!resources || resources.length === 0) return null;
        return this.mapToDomain(resources[0]);
      } catch (inner) {
        throw this.wrapError('Failed to get Device by id', inner);
      }
    }
  }

  public async list(): Promise<Device[]> {
    try {
      const query: SqlQuerySpec = { query: 'SELECT * FROM c' };
      const { resources } = await this.container.items.query<DeviceDocument>(query).fetchAll();
      return (resources ?? []).map((doc) => this.mapToDomain(doc));
    } catch (error) {
      throw this.wrapError('Failed to list Devices', error);
    }
  }

  public async listByDeviceModelId(deviceModelId: string): Promise<Device[]> {
    try {
      const query: SqlQuerySpec = {
        query: 'SELECT * FROM c WHERE c.deviceModelId = @deviceModelId',
        parameters: [{ name: '@deviceModelId', value: deviceModelId }],
      };
      const { resources } = await this.container.items.query<DeviceDocument>(query).fetchAll();
      return (resources ?? []).map((doc) => this.mapToDomain(doc));
    } catch (error) {
      throw this.wrapError('Failed to list Devices by deviceModelId', error);
    }
  }

  public async listByStatus(status: DeviceStatus): Promise<Device[]> {
    try {
      const query: SqlQuerySpec = {
        query: 'SELECT * FROM c WHERE c.status = @status',
        parameters: [{ name: '@status', value: status }],
      };
      const { resources } = await this.container.items.query<DeviceDocument>(query).fetchAll();
      return (resources ?? []).map((doc) => this.mapToDomain(doc));
    } catch (error) {
      throw this.wrapError('Failed to list Devices by status', error);
    }
  }

  public async save(device: Device): Promise<Device> {
    try {
      const document = this.mapToDocument(device);
      const response: ItemResponse<DeviceDocument> = await this.container.items.upsert<DeviceDocument>(document, {
        preTriggerInclude: [],
      });
      if (!response.resource) {
        throw new Error('Upsert returned no resource');
      }
      return this.mapToDomain(response.resource);
    } catch (error) {
      throw this.wrapError('Failed to save Device', error);
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      await this.container.item(id, id).delete();
    } catch (error) {
      if (this.isNotFound(error)) return; // idempotent delete
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

