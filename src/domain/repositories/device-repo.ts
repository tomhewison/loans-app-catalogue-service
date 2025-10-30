import { Device, DeviceStatus } from '../entities/device';

/**
 * Repository interface for Device persistence operations.
 * 
 * This interface defines the contract for data access operations on Device entities,
 * following the Repository pattern to abstract data persistence concerns from business logic.
 * 
 * Implementations should handle:
 * - Data mapping between domain objects and persistence format
 * - Error handling and wrapping infrastructure errors
 * - Connection management and resource cleanup
 */
export interface DeviceRepo {
  /**
   * Retrieves a Device by its unique identifier.
   * 
   * @param id - The unique identifier of the Device
   * @returns Promise resolving to the Device if found, null otherwise
   * @throws Error if the operation fails due to infrastructure issues
   */
  getById(id: string): Promise<Device | null>;

  /**
   * Retrieves all Device entities.
   * 
   * @returns Promise resolving to an array of all Device entities
   * @throws Error if the operation fails due to infrastructure issues
   */
  list(): Promise<Device[]>;

  /**
   * Retrieves Device entities filtered by device model ID.
   * 
   * @param deviceModelId - The DeviceModel ID to filter by
   * @returns Promise resolving to an array of Device entities for the specified model
   * @throws Error if the operation fails due to infrastructure issues
   */
  listByDeviceModelId(deviceModelId: string): Promise<Device[]>;

  /**
   * Retrieves Device entities filtered by status.
   * 
   * @param status - The DeviceStatus to filter by
   * @returns Promise resolving to an array of Device entities matching the status
   * @throws Error if the operation fails due to infrastructure issues
   */
  listByStatus(status: DeviceStatus): Promise<Device[]>;

  /**
   * Saves a Device entity (create or update).
   * 
   * @param device - The Device entity to save
   * @returns Promise resolving to the saved Device entity
   * @throws Error if the operation fails due to infrastructure issues
   */
  save(device: Device): Promise<Device>;

  /**
   * Deletes a Device by its unique identifier.
   * 
   * @param id - The unique identifier of the Device to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if the operation fails due to infrastructure issues
   */
  delete(id: string): Promise<void>;
}
