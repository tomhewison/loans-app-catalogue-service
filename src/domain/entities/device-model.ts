export type DeviceModel = {
  id: string;
  brand: string;
  model: string;
  category: DeviceCategory;
  description: string;
  specifications: Record<string, string>;
  imageUrl?: string;
  updatedAt: Date;
};

export enum DeviceCategory {
  Laptop = 'Laptop',
  Tablet = 'Tablet',
  Camera = 'Camera',
  MobilePhone = 'MobilePhone',
  Keyboard = 'Keyboard',
  Mouse = 'Mouse',
  Charger = 'Charger',
  Other = 'Other'
}

export type CreateDeviceModelParams = {
  id: string;
  brand: string;
  model: string;
  category: DeviceCategory;
  description: string;
  specifications?: Record<string, string>;
  imageUrl?: string;
};

export type UpdateDeviceModelParams = Partial<Omit<CreateDeviceModelParams, 'id'>>;

export class DeviceModelError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = 'DeviceModelError';
  }
}

const validateDeviceModel = (params: CreateDeviceModelParams): void => {
  if (!params.id || typeof params.id !== 'string' || params.id.trim() === '') {
    throw new DeviceModelError('id', 'DeviceModel id must be a non-empty string.');
  }
  
  if (!params.brand || typeof params.brand !== 'string' || params.brand.trim() === '') {
    throw new DeviceModelError('brand', 'DeviceModel brand must be a non-empty string.');
  }
  
  if (!params.model || typeof params.model !== 'string' || params.model.trim() === '') {
    throw new DeviceModelError('model', 'DeviceModel model must be a non-empty string.');
  }
  
  if (!Object.values(DeviceCategory).includes(params.category)) {
    throw new DeviceModelError('category', 'DeviceModel category must be a valid DeviceCategory.');
  }
  
  if (!params.description || typeof params.description !== 'string' || params.description.trim() === '') {
    throw new DeviceModelError('description', 'DeviceModel description must be a non-empty string.');
  }
  
  if (params.specifications && typeof params.specifications !== 'object') {
    throw new DeviceModelError('specifications', 'DeviceModel specifications must be an object.');
  }
  
  if (params.imageUrl && (typeof params.imageUrl !== 'string' || params.imageUrl.trim() === '')) {
    throw new DeviceModelError('imageUrl', 'DeviceModel imageUrl must be a non-empty string when provided.');
  }
};

export function createDeviceModel(params: CreateDeviceModelParams): DeviceModel {
  validateDeviceModel(params);
  
  return {
    id: params.id.trim(),
    brand: params.brand.trim(),
    model: params.model.trim(),
    category: params.category,
    description: params.description.trim(),
    specifications: params.specifications || {},
    imageUrl: params.imageUrl?.trim(),
    updatedAt: new Date(),
  };
}

export function updateDeviceModel(existing: DeviceModel, params: UpdateDeviceModelParams): DeviceModel {
  const updatedParams: CreateDeviceModelParams = {
    id: existing.id,
    brand: params.brand ?? existing.brand,
    model: params.model ?? existing.model,
    category: params.category ?? existing.category,
    description: params.description ?? existing.description,
    specifications: params.specifications ?? existing.specifications,
    imageUrl: params.imageUrl ?? existing.imageUrl,
  };
  
  validateDeviceModel(updatedParams);
  
  return {
    ...existing,
    ...updatedParams,
    updatedAt: new Date(),
  };
}
