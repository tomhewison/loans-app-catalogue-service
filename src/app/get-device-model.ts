import { DeviceModel } from '../domain/entities/device-model';
import { DeviceModelRepo } from '../domain/repositories/device-model-repo';

export type GetDeviceModelDeps = {
  deviceModelRepo: DeviceModelRepo;
};

export type GetDeviceModelResult = {
  success: boolean;
  data?: DeviceModel | null;
  error?: string;
};

export async function getDeviceModel(deps: GetDeviceModelDeps, id: string): Promise<GetDeviceModelResult> {
  try {
    const item = await deps.deviceModelRepo.getById(id);
    return { success: true, data: item ?? null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}


