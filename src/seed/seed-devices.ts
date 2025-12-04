import { getDeviceRepo, getEventPublisher } from '../config/appServices';
import { saveDevice } from '../app/save-device';
import { generateTestDevices } from './test-devices';

/**
 * Seed script for populating device instances in the database
 * 
 * Usage: npm run build && node dist/src/seed/seed-devices.js
 */
async function seedDevices() {
  console.log('Starting device seeding...');
  
  const deviceRepo = getDeviceRepo();
  const eventPublisher = getEventPublisher();
  const devices = generateTestDevices();
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const device of devices) {
    try {
      const result = await saveDevice({ deviceRepo, eventPublisher }, device);
      
      if (result.success) {
        console.log(`✅ Created device: ${device.assetId} (${device.id})`);
        successCount++;
      } else {
        console.error(`❌ Failed to create device ${device.id}: ${result.error}`);
        errorCount++;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error creating device ${device.id}: ${message}`);
      errorCount++;
    }
  }
  
  console.log('\n=== Seeding Summary ===');
  console.log(`✅ Successfully created: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`📊 Total: ${devices.length}`);
  
  if (errorCount > 0) {
    process.exit(1);
  } else {
    console.log('\n✅ Device seeding completed successfully!');
  }
}

// Run if executed directly
if (require.main === module) {
  seedDevices().catch((error) => {
    console.error('Fatal error during seeding:', error);
    process.exit(1);
  });
}

export { seedDevices };













