import { DeviceModelRepo } from '../domain/repositories/device-model-repo';

export type DeleteDeviceModelDeps = {
  deviceModelRepo: DeviceModelRepo;
};

export type DeleteDeviceModelResult = {
  success: boolean;
  error?: string;
};

export async function deleteDeviceModel(
  deps: DeleteDeviceModelDeps,
  id: string
): Promise<DeleteDeviceModelResult> {
  try {
    await deps.deviceModelRepo.delete(id);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}


