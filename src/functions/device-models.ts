import { app } from '@azure/functions';
import { HttpRequest, HttpResponseInit } from '@azure/functions';
import { getDeviceRepo, getDeviceModelRepo, getEventPublisher } from '../config/appServices';
import { listDeviceModels } from '../app/list-device-models';
import { getDeviceModel } from '../app/get-device-model';
import { saveDeviceModel } from '../app/save-device-model';
import { deleteDeviceModel } from '../app/delete-device-model';
import { createDeviceModel, updateDeviceModel, DeviceModel, DeviceCategory } from '../domain/entities/device-model';
import { listDeviceModelsWithFilters } from '../app/list-device-models-with-filters';
import { listDevicesByDeviceModelId } from '../app/list-devices-by-device-model-id';
import { DeviceStatus } from '../domain/entities/device';
import { addCorsHeaders } from '../infra/middleware/cors';
import { requireAuth, requireStaff } from '../infra/middleware/auth0-middleware';

async function handleListDeviceModels(request: HttpRequest): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin');
  
  try {
    // Parse query parameters
    const category = request.query.get('category') as DeviceCategory | null;
    const search = request.query.get('search') || undefined;
    const sort = request.query.get('sort') as any || 'popular';
    const featured = request.query.get('featured') === 'true' ? true : request.query.get('featured') === 'false' ? false : undefined;
    
    // Check if user is authenticated (optional, logic removed but structure kept)
    const authResult = await requireAuth(request);
    // const isAuthenticated = authResult.valid;

    // Use filtered list if filters are provided, otherwise use simple list
    if (category || search || featured !== undefined || sort !== 'popular') {
      const result = await listDeviceModelsWithFilters(
        {
          deviceModelRepo: getDeviceModelRepo(),
        },
        {
          category: category || undefined,
          search,
          sort,
          featured,
        }
      );

      if (!result.success) {
        return addCorsHeaders({
          status: 500,
          jsonBody: {
            success: false,
            message: 'Failed to list device models',
            error: result.error,
          },
        }, origin);
      }

      return addCorsHeaders({
        status: 200,
        jsonBody: result.data?.map((model) => ({
          ...model,
          updatedAt: model.updatedAt.toISOString(),
        })),
      }, origin);
    } else {
      // Simple list without filters
      const result = await listDeviceModels({
        deviceModelRepo: getDeviceModelRepo(),
      });

      if (!result.success) {
        return addCorsHeaders({
          status: 500,
          jsonBody: {
            success: false,
            message: 'Failed to list device models',
            error: result.error,
          },
        }, origin);
      }

      return addCorsHeaders({
        status: 200,
        jsonBody: result.data?.map((model) => ({
          ...model,
          updatedAt: model.updatedAt.toISOString(),
        })),
      }, origin);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return addCorsHeaders({
      status: 500,
      jsonBody: {
        success: false,
        message: 'Failed to list device models',
        error: message,
      },
    }, origin);
  }
}

async function handleGetDeviceModel(request: HttpRequest): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin');
  const id = request.params.id;
  
  if (!id) {
    return addCorsHeaders({
      status: 400,
      jsonBody: {
        success: false,
        message: 'Device model ID is required',
      },
    }, origin);
  }

  const result = await getDeviceModel({
    deviceModelRepo: getDeviceModelRepo(),
  }, id);

  if (!result.success) {
    return addCorsHeaders({
      status: 500,
      jsonBody: {
        success: false,
        message: 'Failed to get device model',
        error: result.error,
      },
    }, origin);
  }

  if (!result.data) {
    return addCorsHeaders({
      status: 404,
      jsonBody: {
        success: false,
        message: 'Device model not found',
      },
    }, origin);
  }

  return addCorsHeaders({
    status: 200,
    jsonBody: {
      ...result.data,
      updatedAt: result.data.updatedAt.toISOString(),
    },
  }, origin);
}

async function handleCreateDeviceModel(request: HttpRequest): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin');
  
  // Check staff authorization
  const authResult = await requireStaff(request);
  if (!authResult.valid) {
    return addCorsHeaders({
      status: 401,
      jsonBody: {
        success: false,
        message: 'Unauthorized',
        error: authResult.error,
      },
    }, origin);
  }

  try {
    const body = await request.json() as Partial<DeviceModel>;
    
    if (!body.id || !body.brand || !body.model || !body.category || !body.description) {
      return addCorsHeaders({
        status: 400,
        jsonBody: {
          success: false,
          message: 'Missing required fields: id, brand, model, category, description',
        },
      }, origin);
    }

    const deviceModel = createDeviceModel({
      id: body.id,
      brand: body.brand,
      model: body.model,
      category: body.category,
      description: body.description,
      specifications: body.specifications,
      imageUrl: body.imageUrl,
      featured: body.featured,
    });

    const result = await saveDeviceModel({
      deviceModelRepo: getDeviceModelRepo(),
      eventPublisher: getEventPublisher(),
    }, deviceModel);

    if (!result.success) {
      return addCorsHeaders({
        status: 500,
        jsonBody: {
          success: false,
          message: 'Failed to create device model',
          error: result.error,
        },
      }, origin);
    }

    return addCorsHeaders({
      status: 201,
      jsonBody: {
        ...result.data!,
        updatedAt: result.data!.updatedAt.toISOString(),
      },
    }, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return addCorsHeaders({
      status: 400,
      jsonBody: {
        success: false,
        message: 'Invalid request body',
        error: message,
      },
    }, origin);
  }
}

async function handleUpdateDeviceModel(request: HttpRequest): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin');
  const id = request.params.id;
  
  // Check staff authorization
  const authResult = await requireStaff(request);
  if (!authResult.valid) {
    return addCorsHeaders({
      status: 401,
      jsonBody: {
        success: false,
        message: 'Unauthorized',
        error: authResult.error,
      },
    }, origin);
  }

  if (!id) {
    return addCorsHeaders({
      status: 400,
      jsonBody: {
        success: false,
        message: 'Device model ID is required',
      },
    }, origin);
  }

  try {
    const getResult = await getDeviceModel({
      deviceModelRepo: getDeviceModelRepo(),
    }, id);

    if (!getResult.success || !getResult.data) {
      return addCorsHeaders({
        status: 404,
        jsonBody: {
          success: false,
          message: 'Device model not found',
        },
      }, origin);
    }

    const body = await request.json() as Partial<DeviceModel>;
    
    const updatedDeviceModel = updateDeviceModel(getResult.data, {
      brand: body.brand,
      model: body.model,
      category: body.category,
      description: body.description,
      specifications: body.specifications,
      imageUrl: body.imageUrl,
      featured: body.featured,
    });

    const result = await saveDeviceModel({
      deviceModelRepo: getDeviceModelRepo(),
      eventPublisher: getEventPublisher(),
    }, updatedDeviceModel);

    if (!result.success) {
      return addCorsHeaders({
        status: 500,
        jsonBody: {
          success: false,
          message: 'Failed to update device model',
          error: result.error,
        },
      }, origin);
    }

    return addCorsHeaders({
      status: 200,
      jsonBody: {
        ...result.data!,
        updatedAt: result.data!.updatedAt.toISOString(),
      },
    }, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return addCorsHeaders({
      status: 400,
      jsonBody: {
        success: false,
        message: 'Invalid request body',
        error: message,
      },
    }, origin);
  }
}

async function handleDeleteDeviceModel(request: HttpRequest): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin');
  const id = request.params.id;
  
  // Check staff authorization
  const authResult = await requireStaff(request);
  if (!authResult.valid) {
    return addCorsHeaders({
      status: 401,
      jsonBody: {
        success: false,
        message: 'Unauthorized',
        error: authResult.error,
      },
    }, origin);
  }

  if (!id) {
    return addCorsHeaders({
      status: 400,
      jsonBody: {
        success: false,
        message: 'Device model ID is required',
      },
    }, origin);
  }

  const result = await deleteDeviceModel({
    deviceModelRepo: getDeviceModelRepo(),
    eventPublisher: getEventPublisher(),
  }, id);

  if (!result.success) {
    return addCorsHeaders({
      status: 500,
      jsonBody: {
        success: false,
        message: 'Failed to delete device model',
        error: result.error,
      },
    }, origin);
  }

  return addCorsHeaders({
    status: 204,
  }, origin);
}

/**
 * GET /api/device-models/{id}/availability - Check device availability (authenticated)
 * Returns available count and an available device ID for reservation
 */
async function handleGetDeviceModelAvailability(request: HttpRequest): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin');
  const id = request.params.id;

  // Require authentication - users need to be logged in to see availability
  const authResult = await requireAuth(request);
  if (!authResult.valid) {
    return addCorsHeaders({
      status: 401,
      jsonBody: {
        success: false,
        message: 'Authentication required to check availability',
        error: authResult.error,
      },
    }, origin);
  }

  if (!id) {
    return addCorsHeaders({
      status: 400,
      jsonBody: {
        success: false,
        message: 'Device model ID is required',
      },
    }, origin);
  }

  try {
    // Check if device model exists
    const modelResult = await getDeviceModel({
      deviceModelRepo: getDeviceModelRepo(),
    }, id);

    if (!modelResult.success || !modelResult.data) {
      return addCorsHeaders({
        status: 404,
        jsonBody: {
          success: false,
          message: 'Device model not found',
        },
      }, origin);
    }

    // Get all devices for this model
    const devicesResult = await listDevicesByDeviceModelId({
      deviceRepo: getDeviceRepo(),
    }, id);

    if (!devicesResult.success) {
      return addCorsHeaders({
        status: 500,
        jsonBody: {
          success: false,
          message: 'Failed to check availability',
          error: devicesResult.error,
        },
      }, origin);
    }

    // Filter to available devices only
    const availableDevices = (devicesResult.data || []).filter(
      device => device.status === DeviceStatus.Available
    );

    const totalDevices = devicesResult.data?.length || 0;
    const availableCount = availableDevices.length;
    const firstAvailableDeviceId = availableDevices.length > 0 ? availableDevices[0].id : undefined;

    return addCorsHeaders({
      status: 200,
      jsonBody: {
        deviceModelId: id,
        totalDevices,
        availableCount,
        canReserve: availableCount > 0,
        availableDeviceId: firstAvailableDeviceId,
      },
    }, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return addCorsHeaders({
      status: 500,
      jsonBody: {
        success: false,
        message: 'Failed to check availability',
        error: message,
      },
    }, origin);
  }
}

// GET /api/device-models - List device models with filters (public)
app.http('listDeviceModelsHttp', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'device-models',
  handler: handleListDeviceModels,
});

// GET /api/device-models/{id} - Get device model details (public)
app.http('getDeviceModelHttp', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'device-models/{id}',
  handler: handleGetDeviceModel,
});

// POST /api/device-models - Create device model (Auth0, staff only)
app.http('createDeviceModelHttp', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'device-models',
  handler: handleCreateDeviceModel,
});

// PUT /api/device-models/{id} - Update device model (Auth0, staff only)
app.http('updateDeviceModelHttp', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'device-models/{id}',
  handler: handleUpdateDeviceModel,
});

// DELETE /api/device-models/{id} - Delete device model (Auth0, staff only)
app.http('deleteDeviceModelHttp', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'device-models/{id}',
  handler: handleDeleteDeviceModel,
});

// GET /api/device-models/{id}/availability - Check availability (authenticated)
app.http('getDeviceModelAvailabilityHttp', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'device-models/{id}/availability',
  handler: handleGetDeviceModelAvailability,
});
