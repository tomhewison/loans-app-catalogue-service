# Functions Layer

Azure Functions triggers and API endpoints.

## HTTP Triggers

| Function | Route | Method | Auth | Description |
|----------|-------|--------|------|-------------|
| `listDeviceModelsHttp` | `/device-models` | GET | Public | List all device models |
| `getDeviceModelHttp` | `/device-models/{id}` | GET | Public | Get device model by ID |
| `createDeviceModelHttp` | `/device-models` | POST | Staff | Create a new device model |
| `updateDeviceModelHttp` | `/device-models/{id}` | PUT | Staff | Update a device model |
| `deleteDeviceModelHttp` | `/device-models/{id}` | DELETE | Staff | Delete a device model |
| `listDevicesHttp` | `/devices` | GET | Staff | List all devices |
| `getDeviceHttp` | `/devices/{id}` | GET | Staff | Get device by ID |
| `createDeviceHttp` | `/devices` | POST | Staff | Create a new device |
| `updateDeviceHttp` | `/devices/{id}` | PUT | Staff | Update a device |
| `deleteDeviceHttp` | `/devices/{id}` | DELETE | Staff | Delete a device |
| `healthHttp` | `/health` | GET | Public | Health check endpoint |

## Event Grid Triggers

| Function | Event Types | Description |
|----------|-------------|-------------|
| `reservationEventsTrigger` | `Reservation.*` | Handles reservation events to update device status |

### Reservation Events Handling

The `reservationEventsTrigger` listens for events from the Reservation Service and updates device availability:

| Event Type | Device Status Update |
|------------|---------------------|
| `Reservation.Created` | → `Unavailable` |
| `Reservation.Collected` | → `Unavailable` |
| `Reservation.Returned` | → `Available` |
| `Reservation.Cancelled` | → `Available` |
| `Reservation.Expired` | → `Available` |

## Timer Triggers

| Function | Schedule | Description |
|----------|----------|-------------|
| `processOutbox` | Every 30 seconds | Processes outbox messages for reliable event delivery |

## Files

- `cors.ts` - CORS preflight handler
- `device-models.ts` - Device model CRUD endpoints
- `devices.ts` - Device CRUD endpoints
- `health.ts` - Health check endpoint
- `process-outbox.ts` - Outbox processor for event publishing
- `reservation-events.ts` - Event Grid trigger for reservation events
