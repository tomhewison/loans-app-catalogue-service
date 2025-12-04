import { getDeviceRepo, getDeviceModelRepo, getEventPublisher } from '../config/appServices';
import { listDevices } from '../app/list-devices';
import { listDeviceModels } from '../app/list-device-models';
import { deleteDevice } from '../app/delete-device';
import { deleteDeviceModel } from '../app/delete-device-model';

/**
 * Wipe script for deleting all devices and device models from the database
 * 
 * Usage: npm run build && node dist/src/seed/wipe-db.js
 */
async function wipeDatabase() {
  console.log('🗑️  Starting database wipe...\n');
  
  try {
    const deviceRepo = getDeviceRepo();
    const deviceModelRepo = getDeviceModelRepo();
    const eventPublisher = getEventPublisher();
    
    // First delete all devices
    console.log('📱 Deleting all devices...');
    const devicesResult = await listDevices({ deviceRepo });
    
    if (devicesResult.success && devicesResult.data) {
      let deviceDeleteCount = 0;
      let deviceErrorCount = 0;
      
      for (const device of devicesResult.data) {
        try {
          const deleteResult = await deleteDevice({ deviceRepo, eventPublisher }, device.id);
          if (deleteResult.success) {
            console.log(`  ✅ Deleted device: ${device.id}`);
            deviceDeleteCount++;
          } else {
            console.error(`  ❌ Failed to delete device ${device.id}: ${deleteResult.error}`);
            deviceErrorCount++;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`  ❌ Error deleting device ${device.id}: ${message}`);
          deviceErrorCount++;
        }
      }
      
      console.log(`\n  Devices deleted: ${deviceDeleteCount}`);
      if (deviceErrorCount > 0) {
        console.log(`  Errors: ${deviceErrorCount}`);
      }
    } else {
      console.log('  No devices found or error listing devices:', devicesResult.error);
    }
    
    console.log('\n');
    
    // Then delete all device models
    console.log('📦 Deleting all device models...');
    const modelsResult = await listDeviceModels({ deviceModelRepo });
    
    if (modelsResult.success && modelsResult.data) {
      let modelDeleteCount = 0;
      let modelErrorCount = 0;
      
      for (const model of modelsResult.data) {
        try {
          const deleteResult = await deleteDeviceModel({ deviceModelRepo, eventPublisher }, model.id);
          if (deleteResult.success) {
            console.log(`  ✅ Deleted device model: ${model.id}`);
            modelDeleteCount++;
          } else {
            console.error(`  ❌ Failed to delete device model ${model.id}: ${deleteResult.error}`);
            modelErrorCount++;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`  ❌ Error deleting device model ${model.id}: ${message}`);
          modelErrorCount++;
        }
      }
      
      console.log(`\n  Device models deleted: ${modelDeleteCount}`);
      if (modelErrorCount > 0) {
        console.log(`  Errors: ${modelErrorCount}`);
      }
    } else {
      console.log('  No device models found or error listing models:', modelsResult.error);
    }
    
    console.log('\n✅ Database wipe completed!');
  } catch (error) {
    console.error('❌ Fatal error during database wipe:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  wipeDatabase().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { wipeDatabase };

