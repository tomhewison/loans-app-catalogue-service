import { app, EventGridEvent, InvocationContext } from '@azure/functions';
import { getDeviceRepo, getEventPublisher } from '../config/appServices';
import { updateDeviceStatus } from '../app/update-device-status';
import { DeviceStatus } from '../domain/entities/device';

/**
 * Event types published by the Reservation Service that we need to handle.
 */
const ReservationEventTypes = {
    ReservationCreated: 'Reservation.Created',
    ReservationCancelled: 'Reservation.Cancelled',
    ReservationCollected: 'Reservation.Collected',
    ReservationReturned: 'Reservation.Returned',
    ReservationExpired: 'Reservation.Expired',
} as const;

/**
 * Reservation event payload structure
 */
type ReservationEventData = {
    reservationId: string;
    userId: string;
    userEmail?: string;
    deviceId: string;
    deviceModelId: string;
    reservedAt?: string;
    expiresAt?: string;
    collectedAt?: string;
    returnDueAt?: string;
    returnedAt?: string;
    cancelledAt?: string;
};

/**
 * Maps reservation event types to the appropriate device status.
 * 
 * Business logic:
 * - When a reservation is created, the device becomes unavailable
 * - When a reservation is collected, the device remains unavailable (still on loan)
 * - When a reservation is returned, cancelled, or expired, the device becomes available
 */
function getDeviceStatusFromEvent(eventType: string): DeviceStatus | null {
    switch (eventType) {
        case ReservationEventTypes.ReservationCreated:
        case ReservationEventTypes.ReservationCollected:
            return DeviceStatus.Unavailable;

        case ReservationEventTypes.ReservationReturned:
        case ReservationEventTypes.ReservationCancelled:
        case ReservationEventTypes.ReservationExpired:
            return DeviceStatus.Available;

        default:
            return null;
    }
}

/**
 * Handles Event Grid events from the Reservation Service.
 * Updates device status based on reservation state changes.
 */
async function handleReservationEvent(
    event: EventGridEvent,
    context: InvocationContext
): Promise<void> {
    const eventType = event.eventType;
    const data = event.data as ReservationEventData;

    context.log(`[reservation-events] Received event: ${eventType}`);
    context.log(`[reservation-events] Event data:`, JSON.stringify(data));

    // Validate event data
    if (!data?.deviceId) {
        context.warn(`[reservation-events] Missing deviceId in event data, skipping`);
        return;
    }

    // Determine the new device status based on event type
    const newStatus = getDeviceStatusFromEvent(eventType);

    if (!newStatus) {
        context.log(`[reservation-events] Unhandled event type: ${eventType}, skipping`);
        return;
    }

    context.log(`[reservation-events] Updating device ${data.deviceId} status to ${newStatus}`);

    // Update the device status
    const result = await updateDeviceStatus(
        {
            deviceRepo: getDeviceRepo(),
            eventPublisher: getEventPublisher(),
        },
        data.deviceId,
        newStatus
    );

    if (!result.success) {
        context.error(`[reservation-events] Failed to update device status: ${result.error}`);
        // Throwing will cause the event to be retried (if configured)
        if (result.code !== 'NOT_FOUND') {
            throw new Error(`Failed to update device ${data.deviceId}: ${result.error}`);
        }
        // For NOT_FOUND, we log but don't retry - the device may have been deleted
        context.warn(`[reservation-events] Device ${data.deviceId} not found, skipping status update`);
        return;
    }

    context.log(`[reservation-events] Successfully updated device ${data.deviceId} to ${newStatus}`);
}

/**
 * Event Grid trigger for reservation events.
 * 
 * This function subscribes to reservation events published by the Reservation Service
 * and updates device availability in the Catalogue Service accordingly.
 * 
 * Event Grid subscription should be configured to filter on these event types:
 * - Reservation.Created
 * - Reservation.Collected
 * - Reservation.Returned
 * - Reservation.Cancelled
 * - Reservation.Expired
 */
app.eventGrid('reservationEventsTrigger', {
    handler: handleReservationEvent,
});
