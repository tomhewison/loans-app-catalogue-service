import { DeviceModel, DeviceCategory } from '../domain/entities/device-model';
import { DeviceModelRepo } from '../domain/repositories/device-model-repo';

export type ListDeviceModelsWithFiltersDeps = {
  deviceModelRepo: DeviceModelRepo;
};

export type DeviceModelFilters = {
  category?: DeviceCategory;
  search?: string;
  featured?: boolean;
  sort?: 'popular' | 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'featured';
};

export type ListDeviceModelsWithFiltersResult = {
  success: boolean;
  data?: DeviceModel[];
  error?: string;
};

/**
 * Searches device models by brand, model, or category
 */
function matchesSearch(deviceModel: DeviceModel, search: string): boolean {
  const searchLower = search.toLowerCase();
  return (
    deviceModel.brand.toLowerCase().includes(searchLower) ||
    deviceModel.model.toLowerCase().includes(searchLower) ||
    deviceModel.category.toLowerCase().includes(searchLower) ||
    deviceModel.description.toLowerCase().includes(searchLower)
  );
}

/**
 * Sorts device models based on sort option
 */
function sortDeviceModels(
  deviceModels: DeviceModel[],
  sort?: string
): DeviceModel[] {
  if (!sort) {
    return deviceModels; // Default: no sorting
  }

  const sorted = [...deviceModels];

  switch (sort) {
    case 'newest':
      sorted.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      break;
    case 'oldest':
      sorted.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
      break;
    case 'name-asc':
      sorted.sort((a, b) => {
        const nameA = `${a.brand} ${a.model}`.toLowerCase();
        const nameB = `${b.brand} ${b.model}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
      break;
    case 'name-desc':
      sorted.sort((a, b) => {
        const nameA = `${a.brand} ${a.model}`.toLowerCase();
        const nameB = `${b.brand} ${b.model}`.toLowerCase();
        return nameB.localeCompare(nameA);
      });
      break;
    case 'featured':
      sorted.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return 0;
      });
      break;
    case 'popular':
    default:
      // Popular default to newest for now as we don't have availability/reservation counts
      sorted.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      break;
  }

  return sorted;
}

export async function listDeviceModelsWithFilters(
  deps: ListDeviceModelsWithFiltersDeps,
  filters: DeviceModelFilters
): Promise<ListDeviceModelsWithFiltersResult> {
  try {
    // Get all device models
    let deviceModels: DeviceModel[] = [];
    
    if (filters.category) {
      deviceModels = await deps.deviceModelRepo.listByCategory(filters.category);
    } else {
      deviceModels = await deps.deviceModelRepo.list();
    }

    // Apply search filter
    if (filters.search) {
      deviceModels = deviceModels.filter((model) => matchesSearch(model, filters.search!));
    }

    // Apply featured filter
    if (filters.featured !== undefined) {
      deviceModels = deviceModels.filter((model) => model.featured === filters.featured);
    }

    // Apply sorting
    const sorted = sortDeviceModels(deviceModels, filters.sort);

    return { success: true, data: sorted };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}
