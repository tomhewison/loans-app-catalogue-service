import { Device, DeviceStatus } from '../domain/entities/device';
import { DeviceRepo } from '../domain/repositories/device-repo';

export type ListDevicesByStatusDeps = {
  deviceRepo: DeviceRepo;
};

export type ListDevicesByStatusResult = {
  success: boolean;
  data?: Device[];
  error?: string;
};

export async function listDevicesByStatus(
  deps: ListDevicesByStatusDeps,
  status: DeviceStatus
): Promise<ListDevicesByStatusResult> {
  try {
    const items = await deps.deviceRepo.listByStatus(status);
    return { success: true, data: items };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

