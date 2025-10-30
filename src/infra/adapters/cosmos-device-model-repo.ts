import { CosmosClient, Database, Container, ItemResponse, SqlQuerySpec } from '@azure/cosmos';
import { DeviceCategory, DeviceModel } from '../../domain/entities/device-model';
import { DeviceModelRepo } from '../../domain/repositories/device-model-repo';

export type CosmosDeviceModelRepoOptions = {
  endpoint: string;
  key?: string;
  databaseId: string;
  containerId: string;
};

type DeviceModelDocument = {
  id: string;
  brand: string;
  model: string;
  category: DeviceCategory;
  description: string;
  specifications: Record<string, string>;
  imageUrl?: string;
  updatedAt: string; // ISO string
  partitionKey?: string; // if using a custom partition key
};

export class CosmosDeviceModelRepo implements DeviceModelRepo {
  private readonly client: CosmosClient;
  private readonly database: Database;
  private readonly container: Container;

  constructor(private readonly options: CosmosDeviceModelRepoOptions) {
    this.client = new CosmosClient({ endpoint: options.endpoint, key: options.key });
    this.database = this.client.database(options.databaseId);
    this.container = this.database.container(options.containerId);
  }

  public async getById(id: string): Promise<DeviceModel | null> {
    try {
      // If collection is partitioned by id, we can pass partitionKey: id
      const { resource } = await this.container.item(id, id).read<DeviceModelDocument>();
      if (!resource) return null;
      return this.mapToDomain(resource);
    } catch (error) {
      // If item(id, id) fails due to partition, fallback to query by id
      if (this.isNotFound(error)) return null;
      try {
        const query: SqlQuerySpec = { query: 'SELECT TOP 1 c FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] };
        const { resources } = await this.container.items.query<DeviceModelDocument>(query).fetchAll();
        if (!resources || resources.length === 0) return null;
        return this.mapToDomain(resources[0]);
      } catch (inner) {
        throw this.wrapError('Failed to get DeviceModel by id', inner);
      }
    }
  }

  public async list(): Promise<DeviceModel[]> {
    try {
      const query: SqlQuerySpec = { query: 'SELECT c FROM c' };
      const { resources } = await this.container.items.query<DeviceModelDocument>(query).fetchAll();
      return (resources ?? []).map((doc) => this.mapToDomain(doc));
    } catch (error) {
      throw this.wrapError('Failed to list DeviceModels', error);
    }
  }

  public async listByCategory(category: DeviceCategory): Promise<DeviceModel[]> {
    try {
      const query: SqlQuerySpec = {
        query: 'SELECT c FROM c WHERE c.category = @category',
        parameters: [{ name: '@category', value: category }],
      };
      const { resources } = await this.container.items.query<DeviceModelDocument>(query).fetchAll();
      return (resources ?? []).map((doc) => this.mapToDomain(doc));
    } catch (error) {
      throw this.wrapError('Failed to list DeviceModels by category', error);
    }
  }

  public async save(deviceModel: DeviceModel): Promise<DeviceModel> {
    try {
      const document = this.mapToDocument(deviceModel);
      const response: ItemResponse<DeviceModelDocument> = await this.container.items.upsert<DeviceModelDocument>(document, {
        // If the container uses /id as partitionKey this helps route correctly
        preTriggerInclude: [],
      });
      if (!response.resource) {
        throw new Error('Upsert returned no resource');
      }
      return this.mapToDomain(response.resource);
    } catch (error) {
      throw this.wrapError('Failed to save DeviceModel', error);
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      await this.container.item(id, id).delete();
    } catch (error) {
      if (this.isNotFound(error)) return; // idempotent delete
      throw this.wrapError('Failed to delete DeviceModel', error);
    }
  }

  private mapToDocument(model: DeviceModel): DeviceModelDocument {
    return {
      id: model.id,
      brand: model.brand,
      model: model.model,
      category: model.category,
      description: model.description,
      specifications: model.specifications,
      imageUrl: model.imageUrl,
      updatedAt: model.updatedAt.toISOString(),
    };
  }

  private mapToDomain(document: DeviceModelDocument): DeviceModel {
    const updatedAt = new Date(document.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) {
      throw new Error(`Invalid updatedAt value from Cosmos DB: ${document.updatedAt}`);
    }

    return {
      id: document.id,
      brand: document.brand,
      model: document.model,
      category: document.category,
      description: document.description,
      specifications: document.specifications ?? {},
      imageUrl: document.imageUrl,
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


