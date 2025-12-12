import { Device, DeviceStatus } from '../domain/entities/device';
import { DeviceRepo } from '../domain/repositories/device-repo';
import { EventPublisher } from '../domain/repositories/event-publisher';

export type UpdateDeviceStatusDeps = {
    deviceRepo: DeviceRepo;
    eventPublisher: EventPublisher;
};

export type UpdateDeviceStatusResult = {
    success: boolean;
    data?: Device;
    error?: string;
    code?: string;
};

/**
 * Updates a device's status.
 * 
 * This use case is typically called in response to reservation events:
 * - Reservation.Created / Reservation.Collected → Unavailable
 * - Reservation.Returned / Reservation.Cancelled / Reservation.Expired → Available
 * 
 * @param deps - The dependencies (repositories, publishers)
 * @param deviceId - The ID of the device to update
 * @param status - The new status to set
 */
export async function updateDeviceStatus(
    deps: UpdateDeviceStatusDeps,
    deviceId: string,
    status: DeviceStatus
): Promise<UpdateDeviceStatusResult> {
    try {
        // Get the existing device
        const existing = await deps.deviceRepo.getById(deviceId);

        if (!existing) {
            return {
                success: false,
                error: `Device not found: ${deviceId}`,
                code: 'NOT_FOUND',
            };
        }

        // Skip update if status is already the same
        if (existing.status === status) {
            return { success: true, data: existing };
        }

        // Update the device status
        const updated: Device = {
            ...existing,
            status,
            updatedAt: new Date(),
        };

        // Save to repository
        const saved = await deps.deviceRepo.save(updated);

        // Publish event
        await deps.eventPublisher.publish(
            'Catalogue',
            'Catalogue.Device.StatusChanged',
            saved.id,
            {
                deviceId: saved.id,
                previousStatus: existing.status,
                newStatus: saved.status,
                updatedAt: saved.updatedAt.toISOString(),
            }
        );

        return { success: true, data: saved };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Failed to update device status for ${deviceId}:`, message);
        return { success: false, error: message };
    }
}
