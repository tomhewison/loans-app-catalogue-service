import { DeviceModel } from '../domain/entities/device-model';
import { DeviceModelRepo } from '../domain/repositories/device-model-repo';
import { EventPublisher } from '../domain/repositories/event-publisher';

export type SaveDeviceModelDeps = {
  deviceModelRepo: DeviceModelRepo;
  eventPublisher: EventPublisher;
};

export type SaveDeviceModelResult = {
  success: boolean;
  data?: DeviceModel;
  error?: string;
};

export async function saveDeviceModel(
  deps: SaveDeviceModelDeps,
  model: DeviceModel
): Promise<SaveDeviceModelResult> {
  try {
    const saved = await deps.deviceModelRepo.save(model);
    
    await deps.eventPublisher.publish(
      'Catalogue',
      'Catalogue.DeviceModel.Upserted',
      model.id,
      saved
    );

    return { success: true, data: saved };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}


