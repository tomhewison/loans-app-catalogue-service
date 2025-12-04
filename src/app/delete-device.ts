import { DeviceRepo } from '../domain/repositories/device-repo';
import { EventPublisher } from '../domain/repositories/event-publisher';

export type DeleteDeviceDeps = {
  deviceRepo: DeviceRepo;
  eventPublisher: EventPublisher;
};

export type DeleteDeviceResult = {
  success: boolean;
  error?: string;
};

export async function deleteDevice(
  deps: DeleteDeviceDeps,
  id: string
): Promise<DeleteDeviceResult> {
  try {
    await deps.deviceRepo.delete(id);
    
    await deps.eventPublisher.publish(
      'Catalogue',
      'Catalogue.Device.Deleted',
      id,
      { id }
    );

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

