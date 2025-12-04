import { Device } from '../domain/entities/device';
import { DeviceRepo } from '../domain/repositories/device-repo';

export type GetDeviceDeps = {
  deviceRepo: DeviceRepo;
};

export type GetDeviceResult = {
  success: boolean;
  data?: Device | null;
  error?: string;
};

export async function getDevice(deps: GetDeviceDeps, id: string): Promise<GetDeviceResult> {
  try {
    const item = await deps.deviceRepo.getById(id);
    return { success: true, data: item ?? null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

