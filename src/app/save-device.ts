import { Device } from '../domain/entities/device';
import { DeviceRepo } from '../domain/repositories/device-repo';
import { EventPublisher } from '../domain/repositories/event-publisher';

export type SaveDeviceDeps = {
  deviceRepo: DeviceRepo;
  eventPublisher: EventPublisher;
};

export type SaveDeviceResult = {
  success: boolean;
  data?: Device;
  error?: string;
};

export async function saveDevice(
  deps: SaveDeviceDeps,
  device: Device
): Promise<SaveDeviceResult> {
  try {
    const saved = await deps.deviceRepo.save(device);
    
    await deps.eventPublisher.publish(
      'Catalogue',
      'Catalogue.Device.Upserted',
      device.id,
      saved
    );

    return { success: true, data: saved };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

