import { app, EventGridEvent, InvocationContext } from '@azure/functions';
import { getDeviceRepo } from '../config/appServices';
import { DeviceStatus } from '../domain/entities/device';

/**
 * Event types published by the Availability Service.
 */
const AvailabilityEventTypes = {
  AvailabilityChanged: 'Availability.Changed',
} as const;

/**
 * Availability event payload structure from the Availability Service.
 */
type AvailabilityEventData = {
  deviceId: string;
  previousStatus: string | null;
  newStatus: string;
  reservationId: string | null;
  updatedAt: string;
};

/**
 * Maps availability status strings to DeviceStatus enum.
 */
function mapToDeviceStatus(status: string): DeviceStatus | null {
  switch (status) {
    case 'Available':
      return DeviceStatus.Available;
    case 'Unavailable':
      return DeviceStatus.Unavailable;
    case 'Maintenance':
      return DeviceStatus.Maintenance;
    case 'Retired':
      return DeviceStatus.Retired;
    case 'Lost':
      return DeviceStatus.Lost;
    default:
      return null;
  }
}

/**
 * Handles Event Grid events from the Availability Service.
 * Syncs the cached device status in the Catalogue Service.
 * 
 * This implements eventual consistency:
 * 1. Availability Service is the source of truth for device availability
 * 2. It publishes Availability.Changed events when status changes
 * 3. Catalogue Service listens and updates its cached copy
 */
async function handleAvailabilityEvent(
  event: EventGridEvent,
  context: InvocationContext
): Promise<void> {
  const eventType = event.eventType;
  const data = event.data as AvailabilityEventData;

  context.log(`[availability-events] Received event: ${eventType}`);
  context.log(`[availability-events] Event data:`, JSON.stringify(data));

  // Only handle Availability.Changed events
  if (eventType !== AvailabilityEventTypes.AvailabilityChanged) {
    context.log(`[availability-events] Unhandled event type: ${eventType}, skipping`);
    return;
  }

  // Validate event data
  if (!data?.deviceId) {
    context.warn(`[availability-events] Missing deviceId in event data, skipping`);
    return;
  }

  if (!data?.newStatus) {
    context.warn(`[availability-events] Missing newStatus in event data, skipping`);
    return;
  }

  // Map the status string to DeviceStatus enum
  const newStatus = mapToDeviceStatus(data.newStatus);
  if (!newStatus) {
    context.warn(`[availability-events] Unknown status: ${data.newStatus}, skipping`);
    return;
  }

  context.log(
    `[availability-events] Syncing device ${data.deviceId} status to ${newStatus}`
  );

  try {
    const deviceRepo = getDeviceRepo();

    // Get the existing device
    const existing = await deviceRepo.getById(data.deviceId);

    if (!existing) {
      // Device not found in catalogue - this is acceptable
      // The device may not exist yet or may have been deleted
      context.warn(
        `[availability-events] Device ${data.deviceId} not found in catalogue, skipping sync`
      );
      return;
    }

    // Skip if status is already the same
    if (existing.status === newStatus) {
      context.log(
        `[availability-events] Device ${data.deviceId} already has status ${newStatus}, skipping`
      );
      return;
    }

    // Update the device status (cached copy)
    const updated = {
      ...existing,
      status: newStatus,
      updatedAt: new Date(),
    };

    await deviceRepo.save(updated);

    context.log(
      `[availability-events] Successfully synced device ${data.deviceId} from ${existing.status} to ${newStatus}`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.error(`[availability-events] Failed to sync device status: ${message}`);
    // Throw to trigger retry
    throw new Error(`Failed to sync device ${data.deviceId}: ${message}`);
  }
}

/**
 * Event Grid trigger for availability events.
 * 
 * This function subscribes to availability events published by the Availability Service
 * and updates the cached device status in the Catalogue Service.
 * 
 * Event Grid subscription should be configured to filter on:
 * - Availability.Changed
 */
app.eventGrid('availabilityEventsTrigger', {
  handler: handleAvailabilityEvent,
});
