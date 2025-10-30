import { DeviceModel, DeviceCategory } from '../entities/device-model';

/**
 * Repository interface for DeviceModel persistence operations.
 * 
 * This interface defines the contract for data access operations on DeviceModel entities,
 * following the Repository pattern to abstract data persistence concerns from business logic.
 * 
 * Implementations should handle:
 * - Data mapping between domain objects and persistence format
 * - Error handling and wrapping infrastructure errors
 * - Connection management and resource cleanup
 */
export interface DeviceModelRepo {
  /**
   * Retrieves a DeviceModel by its unique identifier.
   * 
   * @param id - The unique identifier of the DeviceModel
   * @returns Promise resolving to the DeviceModel if found, null otherwise
   * @throws Error if the operation fails due to infrastructure issues
   */
  getById(id: string): Promise<DeviceModel | null>;

  /**
   * Retrieves all DeviceModel entities.
   * 
   * @returns Promise resolving to an array of all DeviceModel entities
   * @throws Error if the operation fails due to infrastructure issues
   */
  list(): Promise<DeviceModel[]>;

  /**
   * Retrieves DeviceModel entities filtered by category.
   * 
   * @param category - The DeviceCategory to filter by
   * @returns Promise resolving to an array of DeviceModel entities matching the category
   * @throws Error if the operation fails due to infrastructure issues
   */
  listByCategory(category: DeviceCategory): Promise<DeviceModel[]>;

  /**
   * Saves a DeviceModel entity (create or update).
   * 
   * @param deviceModel - The DeviceModel entity to save
   * @returns Promise resolving to the saved DeviceModel entity
   * @throws Error if the operation fails due to infrastructure issues
   */
  save(deviceModel: DeviceModel): Promise<DeviceModel>;

  /**
   * Deletes a DeviceModel by its unique identifier.
   * 
   * @param id - The unique identifier of the DeviceModel to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if the operation fails due to infrastructure issues
   */
  delete(id: string): Promise<void>;
}
