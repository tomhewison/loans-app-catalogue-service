import { app } from '@azure/functions';
import { HttpRequest, HttpResponseInit } from '@azure/functions';
import { getDeviceRepo, getEventPublisher } from '../config/appServices';
import { listDevices } from '../app/list-devices';
import { getDevice } from '../app/get-device';
import { saveDevice } from '../app/save-device';
import { deleteDevice } from '../app/delete-device';
import { createDevice, updateDevice, Device } from '../domain/entities/device';
import { addCorsHeaders } from '../infra/middleware/cors';
import { requireStaff } from '../infra/middleware/auth0-middleware';

async function handleListDevices(request: HttpRequest): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin');
  
  // Require staff authorization - device instances are private
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
    const deviceRepo = getDeviceRepo();
    const result = await listDevices({
      deviceRepo,
    });

    if (!result.success) {
      console.error('Failed to list devices:', result.error);
      return addCorsHeaders({
        status: 500,
        jsonBody: {
          success: false,
          message: 'Failed to list devices',
          error: result.error,
        },
      }, origin);
    }

    if (!result.data || result.data.length === 0) {
      return addCorsHeaders({
        status: 200,
        jsonBody: [],
      }, origin);
    }

    return addCorsHeaders({
      status: 200,
      jsonBody: result.data.map((device) => {
        // Validate required fields
        if (!device.id || !device.deviceModelId || !device.serialNumber || !device.assetId || !device.condition || !device.purchaseDate || !device.updatedAt) {
          console.error('Device missing required fields:', device);
          throw new Error(`Device ${device.id || 'unknown'} is missing required fields`);
        }

        return {
          id: device.id,
          deviceModelId: device.deviceModelId,
          serialNumber: device.serialNumber,
          assetId: device.assetId,
          status: device.status,
          condition: device.condition,
          notes: device.notes,
          purchaseDate: device.purchaseDate.toISOString(),
          updatedAt: device.updatedAt.toISOString(),
        };
      }),
    }, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error in handleListDevices:', message, error);
    return addCorsHeaders({
      status: 500,
      jsonBody: {
        success: false,
        message: 'Failed to list devices',
        error: message,
      },
    }, origin);
  }
}

async function handleGetDevice(request: HttpRequest): Promise<HttpResponseInit> {
  const origin = request.headers.get('origin');
  
  // Require staff authorization - device instances are private
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

  const id = request.params.id;
  if (!id) {
    return addCorsHeaders({
      status: 400,
      jsonBody: {
        success: false,
        message: 'Device ID is required',
      },
    }, origin);
  }

  const result = await getDevice({
    deviceRepo: getDeviceRepo(),
  }, id);

  if (!result.success) {
    return addCorsHeaders({
      status: 500,
      jsonBody: {
        success: false,
        message: 'Failed to get device',
        error: result.error,
      },
    }, origin);
  }

  if (!result.data) {
    return addCorsHeaders({
      status: 404,
      jsonBody: {
        success: false,
        message: 'Device not found',
      },
    }, origin);
  }

  return addCorsHeaders({
    status: 200,
    jsonBody: {
      id: result.data.id,
      deviceModelId: result.data.deviceModelId,
      serialNumber: result.data.serialNumber,
      assetId: result.data.assetId,
      status: result.data.status,
      condition: result.data.condition,
      notes: result.data.notes,
      purchaseDate: result.data.purchaseDate.toISOString(),
      updatedAt: result.data.updatedAt.toISOString(),
    },
  }, origin);
}

async function handleCreateDevice(request: HttpRequest): Promise<HttpResponseInit> {
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
    const body = await request.json() as Partial<Device>;
    
    if (!body.id || !body.deviceModelId || !body.serialNumber || !body.assetId || !body.status || !body.condition || !body.purchaseDate) {
      return addCorsHeaders({
        status: 400,
        jsonBody: {
          success: false,
          message: 'Missing required fields: id, deviceModelId, serialNumber, assetId, status, condition, purchaseDate',
        },
      }, origin);
    }

    const device = createDevice({
      id: body.id,
      deviceModelId: body.deviceModelId,
      serialNumber: body.serialNumber,
      assetId: body.assetId,
      status: body.status,
      condition: body.condition,
      notes: body.notes,
      purchaseDate: new Date(body.purchaseDate),
    });

    const result = await saveDevice({
      deviceRepo: getDeviceRepo(),
      eventPublisher: getEventPublisher(),
    }, device);

    if (!result.success) {
      return addCorsHeaders({
        status: 500,
        jsonBody: {
          success: false,
          message: 'Failed to create device',
          error: result.error,
        },
      }, origin);
    }

    return addCorsHeaders({
      status: 201,
      jsonBody: {
        ...result.data!,
        purchaseDate: result.data!.purchaseDate.toISOString(),
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

async function handleUpdateDevice(request: HttpRequest): Promise<HttpResponseInit> {
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
        message: 'Device ID is required',
      },
    }, origin);
  }

  try {
    // First get the existing device
    const getResult = await getDevice({
      deviceRepo: getDeviceRepo(),
    }, id);

    if (!getResult.success || !getResult.data) {
      return addCorsHeaders({
        status: 404,
        jsonBody: {
          success: false,
          message: 'Device not found',
        },
      }, origin);
    }

    const body = await request.json() as Partial<Device>;
    
    const updatedDevice = updateDevice(getResult.data, {
      deviceModelId: body.deviceModelId,
      serialNumber: body.serialNumber,
      assetId: body.assetId,
      status: body.status,
      condition: body.condition,
      notes: body.notes,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
    });

    const result = await saveDevice({
      deviceRepo: getDeviceRepo(),
      eventPublisher: getEventPublisher(),
    }, updatedDevice);

    if (!result.success) {
      return addCorsHeaders({
        status: 500,
        jsonBody: {
          success: false,
          message: 'Failed to update device',
          error: result.error,
        },
      }, origin);
    }

    return addCorsHeaders({
      status: 200,
      jsonBody: {
        ...result.data!,
        purchaseDate: result.data!.purchaseDate.toISOString(),
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

async function handleDeleteDevice(request: HttpRequest): Promise<HttpResponseInit> {
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
        message: 'Device ID is required',
      },
    }, origin);
  }

  const result = await deleteDevice({
    deviceRepo: getDeviceRepo(),
    eventPublisher: getEventPublisher(),
  }, id);

  if (!result.success) {
    return addCorsHeaders({
      status: 500,
      jsonBody: {
        success: false,
        message: 'Failed to delete device',
        error: result.error,
      },
    }, origin);
  }

  return addCorsHeaders({
    status: 204,
  }, origin);
}

// GET /api/devices - List all devices (Auth0, staff only)
app.http('listDevicesHttp', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'devices',
  handler: handleListDevices,
});

// GET /api/devices/{id} - Get device by ID (Auth0, staff only)
app.http('getDeviceHttp', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'devices/{id}',
  handler: handleGetDevice,
});

// POST /api/devices - Create device (Auth0, staff only)
app.http('createDeviceHttp', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'devices',
  handler: handleCreateDevice,
});

// PUT /api/devices/{id} - Update device (Auth0, staff only)
app.http('updateDeviceHttp', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'devices/{id}',
  handler: handleUpdateDevice,
});

// DELETE /api/devices/{id} - Delete device (Auth0, staff only)
app.http('deleteDeviceHttp', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'devices/{id}',
  handler: handleDeleteDevice,
});
