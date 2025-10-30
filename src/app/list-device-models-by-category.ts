import { DeviceCategory, DeviceModel } from '../domain/entities/device-model';
import { DeviceModelRepo } from '../domain/repositories/device-model-repo';

export type ListDeviceModelsByCategoryDeps = {
  deviceModelRepo: DeviceModelRepo;
};

export type ListDeviceModelsByCategoryResult = {
  success: boolean;
  data?: DeviceModel[];
  error?: string;
};

export async function listDeviceModelsByCategory(
  deps: ListDeviceModelsByCategoryDeps,
  category: DeviceCategory
): Promise<ListDeviceModelsByCategoryResult> {
  try {
    const items = await deps.deviceModelRepo.listByCategory(category);
    return { success: true, data: items };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}


