import { getDeviceModelRepo, getEventPublisher } from '../config/appServices';
import { saveDeviceModel } from '../app/save-device-model';
import { testDeviceModels } from './test-device-models';

/**
 * Seed script for populating device models in the database
 * 
 * Usage: npm run build && node dist/src/seed/seed-device-models.js
 */
async function seedDeviceModels() {
  console.log('Starting device model seeding...');
  
  const deviceModelRepo = getDeviceModelRepo();
  const eventPublisher = getEventPublisher();
  let successCount = 0;
  let errorCount = 0;
  
  for (const model of testDeviceModels) {
    try {
      const result = await saveDeviceModel({ deviceModelRepo, eventPublisher }, model);
      
      if (result.success) {
        console.log(`✅ Created device model: ${model.brand} ${model.model} (${model.id})`);
        successCount++;
      } else {
        console.error(`❌ Failed to create device model ${model.id}: ${result.error}`);
        errorCount++;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error creating device model ${model.id}: ${message}`);
      errorCount++;
    }
  }
  
  console.log('\n=== Seeding Summary ===');
  console.log(`✅ Successfully created: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`📊 Total: ${testDeviceModels.length}`);
  
  if (errorCount > 0) {
    process.exit(1);
  } else {
    console.log('\n✅ Device model seeding completed successfully!');
  }
}

// Run if executed directly
if (require.main === module) {
  seedDeviceModels().catch((error) => {
    console.error('Fatal error during seeding:', error);
    process.exit(1);
  });
}

export { seedDeviceModels };













