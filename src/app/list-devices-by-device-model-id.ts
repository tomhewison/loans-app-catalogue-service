import { Device } from '../domain/entities/device';
import { DeviceRepo } from '../domain/repositories/device-repo';

export type ListDevicesByDeviceModelIdDeps = {
  deviceRepo: DeviceRepo;
};

export type ListDevicesByDeviceModelIdResult = {
  success: boolean;
  data?: Device[];
  error?: string;
};

export async function listDevicesByDeviceModelId(
  deps: ListDevicesByDeviceModelIdDeps,
  deviceModelId: string
): Promise<ListDevicesByDeviceModelIdResult> {
  try {
    const items = await deps.deviceRepo.listByDeviceModelId(deviceModelId);
    return { success: true, data: items };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

