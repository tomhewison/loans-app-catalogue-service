import { CosmosClient, Database, Container, ItemResponse, SqlQuerySpec } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { DeviceCategory, DeviceModel } from '../../domain/entities/device-model';
import { DeviceModelRepo } from '../../domain/repositories/device-model-repo';
import { logger, createLogger } from '../logging/logger';
import type { Logger } from '../logging/logger';

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
  private readonly log: Logger;

  constructor(private readonly options: CosmosDeviceModelRepoOptions) {
    this.log = createLogger({
      component: 'CosmosDeviceModelRepo',
      database: options.databaseId,
      container: options.containerId,
    });

    this.log.info('Initializing CosmosDeviceModelRepo', {
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

    this.log.info('CosmosDeviceModelRepo initialized successfully');
  }

  public async getById(id: string): Promise<DeviceModel | null> {
    const startTime = Date.now();
    this.log.debug('Getting device model by ID', { deviceModelId: id });

    try {
      // If collection is partitioned by id, we can pass partitionKey: id
      const { resource } = await this.container.item(id, id).read<DeviceModelDocument>();
      
      const duration = Date.now() - startTime;
      
      if (!resource) {
        this.log.debug('Device model not found', { deviceModelId: id, durationMs: duration });
        this.log.trackDependency('CosmosDB.GetById', this.options.endpoint, duration, true, { found: false });
        return null;
      }

      this.log.debug('Device model retrieved successfully', { deviceModelId: id, durationMs: duration });
      this.log.trackDependency('CosmosDB.GetById', this.options.endpoint, duration, true, { found: true });
      
      return this.mapToDomain(resource);
    } catch (error) {
      // If item(id, id) fails due to partition, fallback to query by id
      if (this.isNotFound(error)) {
        const duration = Date.now() - startTime;
        this.log.debug('Device model not found (404)', { deviceModelId: id, durationMs: duration });
        this.log.trackDependency('CosmosDB.GetById', this.options.endpoint, duration, true, { found: false });
        return null;
      }

      this.log.debug('Falling back to query for device model', { deviceModelId: id });
      
      try {
        const query: SqlQuerySpec = { query: 'SELECT TOP 1 * FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] };
        const { resources } = await this.container.items.query<DeviceModelDocument>(query).fetchAll();
        
        const duration = Date.now() - startTime;
        
        if (!resources || resources.length === 0) {
          this.log.debug('Device model not found (query)', { deviceModelId: id, durationMs: duration });
          this.log.trackDependency('CosmosDB.GetById.Query', this.options.endpoint, duration, true, { found: false });
          return null;
        }

        this.log.debug('Device model retrieved via query', { deviceModelId: id, durationMs: duration });
        this.log.trackDependency('CosmosDB.GetById.Query', this.options.endpoint, duration, true, { found: true });
        
        return this.mapToDomain(resources[0]);
      } catch (inner) {
        const duration = Date.now() - startTime;
        this.log.error('Failed to get device model by ID', inner as Error, { deviceModelId: id, durationMs: duration });
        this.log.trackDependency('CosmosDB.GetById', this.options.endpoint, duration, false);
        throw this.wrapError('Failed to get DeviceModel by id', inner);
      }
    }
  }

  public async list(): Promise<DeviceModel[]> {
    const startTime = Date.now();
    this.log.debug('Listing all device models');

    try {
      const query: SqlQuerySpec = { query: 'SELECT * FROM c' };
      const { resources } = await this.container.items.query<DeviceModelDocument>(query).fetchAll();
      
      const duration = Date.now() - startTime;
      
      if (!resources || resources.length === 0) {
        this.log.info('No device models found', { durationMs: duration, count: 0 });
        this.log.trackDependency('CosmosDB.List', this.options.endpoint, duration, true, { count: 0 });
        this.log.trackMetric('cosmos_device_models_count', 0);
        return [];
      }

      // Filter out any null/undefined documents and log warnings
      const validResources = resources.filter((doc, index) => {
        if (!doc) {
          this.log.warn('Skipping null document', { index });
          return false;
        }
        if (!doc.id) {
          this.log.error('Document missing id field', new Error('Missing id'), { index, documentKeys: Object.keys(doc).join(',') });
          return false;
        }
        return true;
      });

      this.log.debug('Device models listed', { 
        durationMs: duration, 
        count: validResources.length,
      });
      this.log.trackDependency('CosmosDB.List', this.options.endpoint, duration, true, { count: validResources.length });

      return validResources.map((doc) => this.mapToDomain(doc));
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log.error('Failed to list device models', error as Error, { durationMs: duration });
      this.log.trackDependency('CosmosDB.List', this.options.endpoint, duration, false);
      throw this.wrapError('Failed to list DeviceModels', error);
    }
  }

  public async listByCategory(category: DeviceCategory): Promise<DeviceModel[]> {
    const startTime = Date.now();
    this.log.debug('Listing device models by category', { category });

    try {
      const query: SqlQuerySpec = {
        query: 'SELECT * FROM c WHERE c.category = @category',
        parameters: [{ name: '@category', value: category }],
      };
      const { resources } = await this.container.items.query<DeviceModelDocument>(query).fetchAll();
      
      const duration = Date.now() - startTime;
      const count = resources?.length ?? 0;
      
      this.log.debug('Device models by category retrieved', { category, durationMs: duration, count });
      this.log.trackDependency('CosmosDB.ListByCategory', this.options.endpoint, duration, true, { category, count });
      
      return (resources ?? []).map((doc) => this.mapToDomain(doc));
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log.error('Failed to list device models by category', error as Error, { category, durationMs: duration });
      this.log.trackDependency('CosmosDB.ListByCategory', this.options.endpoint, duration, false, { category });
      throw this.wrapError('Failed to list DeviceModels by category', error);
    }
  }

  public async save(deviceModel: DeviceModel): Promise<DeviceModel> {
    const startTime = Date.now();
    const isNew = !deviceModel.updatedAt || deviceModel.updatedAt.getTime() === Date.now();
    const operation = isNew ? 'create' : 'update';
    
    this.log.info(`Saving device model (${operation})`, { 
      deviceModelId: deviceModel.id, 
      brand: deviceModel.brand,
      model: deviceModel.model,
      category: deviceModel.category,
    });

    try {
      const document = this.mapToDocument(deviceModel);
      const response: ItemResponse<DeviceModelDocument> = await this.container.items.upsert<DeviceModelDocument>(document, {
        // If the container uses /id as partitionKey this helps route correctly
        preTriggerInclude: [],
      });
      
      const duration = Date.now() - startTime;
      
      if (!response.resource) {
        this.log.error('Upsert returned no resource', new Error('No resource returned'), { deviceModelId: deviceModel.id });
        throw new Error('Upsert returned no resource');
      }

      this.log.info('Device model saved', { 
        deviceModelId: deviceModel.id, 
        operation,
        durationMs: duration,
      });
      this.log.trackDependency('CosmosDB.Save', this.options.endpoint, duration, true, { operation });

      return this.mapToDomain(response.resource);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log.error('Failed to save device model', error as Error, { deviceModelId: deviceModel.id, durationMs: duration });
      this.log.trackDependency('CosmosDB.Save', this.options.endpoint, duration, false);
      throw this.wrapError('Failed to save DeviceModel', error);
    }
  }

  public async delete(id: string): Promise<void> {
    const startTime = Date.now();
    this.log.info('Deleting device model', { deviceModelId: id });

    try {
      await this.container.item(id, id).delete();
      
      const duration = Date.now() - startTime;
      this.log.info('Device model deleted', { deviceModelId: id, durationMs: duration });
      this.log.trackDependency('CosmosDB.Delete', this.options.endpoint, duration, true);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (this.isNotFound(error)) {
        this.log.debug('Device model not found for deletion (idempotent)', { deviceModelId: id, durationMs: duration });
        this.log.trackDependency('CosmosDB.Delete', this.options.endpoint, duration, true, { notFound: true });
        return; // idempotent delete
      }
      
      this.log.error('Failed to delete device model', error as Error, { deviceModelId: id, durationMs: duration });
      this.log.trackDependency('CosmosDB.Delete', this.options.endpoint, duration, false);
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
      this.log.error('Invalid document received', new Error('Invalid document structure'), { 
        documentType: typeof document 
      });
      throw new Error(`Invalid document structure: ${JSON.stringify(document)}`);
    }

    // Validate required fields with detailed error messages
    if (!document.id) {
      this.log.error('Document missing id field', new Error('Missing id'), { 
        documentKeys: Object.keys(document).join(', ')
      });
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
