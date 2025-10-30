import { DeviceModel } from '../domain/entities/device-model';
import { DeviceModelRepo } from '../domain/repositories/device-model-repo';

export type ListDeviceModelsDeps = {
  deviceModelRepo: DeviceModelRepo;
};

export type ListDeviceModelsResult = {
  success: boolean;
  data?: DeviceModel[];
  error?: string;
};

export async function listDeviceModels(deps: ListDeviceModelsDeps): Promise<ListDeviceModelsResult> {
  try {
    const items = await deps.deviceModelRepo.list();
    return { success: true, data: items };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}


