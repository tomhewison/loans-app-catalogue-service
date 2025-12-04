export type Device = {
  id: string;
  deviceModelId: string;
  serialNumber: string;
  assetId: string;
  /**
   * Device status/availability is determined by the device availability microservice.
   * This field may be cached/synced locally but the availability service is the source of truth.
   * Use DeviceAvailabilityClient to fetch the current status.
   */
  status: DeviceStatus;
  condition: string;
  notes?: string;
  purchaseDate: Date;
  updatedAt: Date;
};

export enum DeviceStatus {
  Available = 'Available',
  Unavailable = 'Unavailable',
  Maintenance = 'Maintenance',
  Retired = 'Retired',
  Lost = 'Lost'
}

export type CreateDeviceParams = {
  id: string;
  deviceModelId: string;
  serialNumber: string;
  assetId: string;
  status: DeviceStatus;
  condition: string;
  notes?: string;
  purchaseDate: Date;
};

export type UpdateDeviceParams = Partial<Omit<CreateDeviceParams, 'id'>>;

export class DeviceError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = 'DeviceError';
  }
}

const validateDevice = (params: CreateDeviceParams): void => {
  if (!params.id || typeof params.id !== 'string' || params.id.trim() === '') {
    throw new DeviceError('id', 'Device id must be a non-empty string.');
  }
  
  if (!params.deviceModelId || typeof params.deviceModelId !== 'string' || params.deviceModelId.trim() === '') {
    throw new DeviceError('deviceModelId', 'Device deviceModelId must be a non-empty string.');
  }
  
  if (!params.serialNumber || typeof params.serialNumber !== 'string' || params.serialNumber.trim() === '') {
    throw new DeviceError('serialNumber', 'Device serialNumber must be a non-empty string.');
  }
  
  if (!params.assetId || typeof params.assetId !== 'string' || params.assetId.trim() === '') {
    throw new DeviceError('assetId', 'Device assetId must be a non-empty string.');
  }
  
  if (!Object.values(DeviceStatus).includes(params.status)) {
    throw new DeviceError('status', 'Device status must be a valid DeviceStatus.');
  }
  
  if (!params.condition || typeof params.condition !== 'string' || params.condition.trim() === '') {
    throw new DeviceError('condition', 'Device condition must be a non-empty string.');
  }
  
  if (params.notes && (typeof params.notes !== 'string' || params.notes.trim() === '')) {
    throw new DeviceError('notes', 'Device notes must be a non-empty string when provided.');
  }
  
  if (!params.purchaseDate || !(params.purchaseDate instanceof Date) || Number.isNaN(params.purchaseDate.getTime())) {
    throw new DeviceError('purchaseDate', 'Device purchaseDate must be a valid Date.');
  }
  
  if (params.purchaseDate > new Date()) {
    throw new DeviceError('purchaseDate', 'Device purchaseDate cannot be in the future.');
  }
};

export function createDevice(params: CreateDeviceParams): Device {
  validateDevice(params);
  
  return {
    id: params.id.trim(),
    deviceModelId: params.deviceModelId.trim(),
    serialNumber: params.serialNumber.trim(),
    assetId: params.assetId.trim(),
    status: params.status,
    condition: params.condition.trim(),
    notes: params.notes?.trim(),
    purchaseDate: params.purchaseDate,
    updatedAt: new Date(),
  };
}

export function updateDevice(existing: Device, params: UpdateDeviceParams): Device {
  const updatedParams: CreateDeviceParams = {
    id: existing.id,
    deviceModelId: params.deviceModelId ?? existing.deviceModelId,
    serialNumber: params.serialNumber ?? existing.serialNumber,
    assetId: params.assetId ?? existing.assetId,
    status: params.status ?? existing.status,
    condition: params.condition ?? existing.condition,
    notes: params.notes ?? existing.notes,
    purchaseDate: params.purchaseDate ?? existing.purchaseDate,
  };
  
  validateDevice(updatedParams);
  
  return {
    ...existing,
    ...updatedParams,
    updatedAt: new Date(),
  };
}
