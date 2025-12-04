import { seedDeviceModels } from './seed-device-models';
import { seedDevices } from './seed-devices';

/**
 * Seed script for populating both device models and device instances
 * 
 * Usage: npm run build && node dist/src/seed/seed-all.js
 */
async function seedAll() {
  console.log('🌱 Starting full database seeding...\n');
  
  try {
    // First seed device models
    console.log('📦 Seeding device models...\n');
    await seedDeviceModels();
    
    console.log('\n');
    
    // Then seed devices (which reference device models)
    console.log('📱 Seeding device instances...\n');
    await seedDevices();
    
    console.log('\n✅ Full database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Fatal error during seeding:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  seedAll();
}

export { seedAll };


