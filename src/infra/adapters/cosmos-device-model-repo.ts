import { CosmosClient, Database, Container, ItemResponse, SqlQuerySpec } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
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
  featured?: boolean;
  updatedAt?: string; // ISO string (optional for backward compatibility)
  partitionKey?: string; // if using a custom partition key
};

export class CosmosDeviceModelRepo implements DeviceModelRepo {
  private readonly client: CosmosClient;
  private readonly database: Database;
  private readonly container: Container;

  constructor(private readonly options: CosmosDeviceModelRepoOptions) {
    if (options.key) {
      this.client = new CosmosClient({ endpoint: options.endpoint, key: options.key });
    } else {
      this.client = new CosmosClient({ endpoint: options.endpoint, aadCredentials: new DefaultAzureCredential() });
    }
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
        const query: SqlQuerySpec = { query: 'SELECT TOP 1 * FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] };
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
      const query: SqlQuerySpec = { query: 'SELECT * FROM c' };
      const { resources } = await this.container.items.query<DeviceModelDocument>(query).fetchAll();
      
      if (!resources || resources.length === 0) {
        return [];
      }

      // Filter out any null/undefined documents and log warnings
      const validResources = resources.filter((doc, index) => {
        if (!doc) {
          console.warn(`Skipping null document at index ${index}`);
          return false;
        }
        if (!doc.id) {
          console.error(`Document missing id field at index ${index}:`, JSON.stringify(doc, null, 2));
          return false;
        }
        return true;
      });

      return validResources.map((doc) => this.mapToDomain(doc));
    } catch (error) {
      throw this.wrapError('Failed to list DeviceModels', error);
    }
  }

  public async listByCategory(category: DeviceCategory): Promise<DeviceModel[]> {
    try {
      const query: SqlQuerySpec = {
        query: 'SELECT * FROM c WHERE c.category = @category',
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
      featured: model.featured,
      updatedAt: model.updatedAt.toISOString(),
    };
  }

  private mapToDomain(document: DeviceModelDocument): DeviceModel {
    // Log the document structure if id is missing for debugging
    if (!document || typeof document !== 'object') {
      console.error('Invalid document received:', document);
      throw new Error(`Invalid document structure: ${JSON.stringify(document)}`);
    }

    // Validate required fields with detailed error messages
    if (!document.id) {
      console.error('Document missing id field:', JSON.stringify(document, null, 2));
      throw new Error(`DeviceModel document missing required field: id. Document keys: ${Object.keys(document).join(', ')}`);
    }
    if (!document.brand) {
      throw new Error(`DeviceModel document missing required field: brand (id: ${document.id})`);
    }
    if (!document.model) {
      throw new Error(`DeviceModel document missing required field: model (id: ${document.id})`);
    }
    if (!document.category) {
      throw new Error(`DeviceModel document missing required field: category (id: ${document.id})`);
    }
    if (!document.description) {
      throw new Error(`DeviceModel document missing required field: description (id: ${document.id})`);
    }

    // Handle missing or undefined updatedAt - use current date as fallback
    let updatedAt: Date;
    if (!document.updatedAt || document.updatedAt === undefined) {
      // If updatedAt is missing, use current date (for old data)
      updatedAt = new Date();
    } else {
      updatedAt = new Date(document.updatedAt);
      if (Number.isNaN(updatedAt.getTime())) {
        throw new Error(`Invalid updatedAt value from Cosmos DB: ${document.updatedAt} (id: ${document.id})`);
      }
    }

    return {
      id: document.id,
      brand: document.brand,
      model: document.model,
      category: document.category,
      description: document.description,
      specifications: document.specifications ?? {},
      imageUrl: document.imageUrl,
      featured: document.featured ?? false,
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


