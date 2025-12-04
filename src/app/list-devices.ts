import { Device } from '../domain/entities/device';
import { DeviceRepo } from '../domain/repositories/device-repo';

export type ListDevicesDeps = {
  deviceRepo: DeviceRepo;
};

export type ListDevicesResult = {
  success: boolean;
  data?: Device[];
  error?: string;
};

export async function listDevices(deps: ListDevicesDeps): Promise<ListDevicesResult> {
  try {
    const items = await deps.deviceRepo.list();
    return { success: true, data: items };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

