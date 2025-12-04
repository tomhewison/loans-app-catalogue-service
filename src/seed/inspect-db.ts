import { getDeviceModelRepo } from '../config/appServices';
import { CosmosClient } from '@azure/cosmos';

/**
 * Diagnostic script to inspect what's actually in Cosmos DB
 * 
 * Usage: npm run build && node dist/src/seed/inspect-db.js
 */
async function inspectDatabase() {
  console.log('🔍 Inspecting Cosmos DB contents...\n');
  
  try {
    const endpoint = process.env.COSMOS_ENDPOINT || '';
    const key = process.env.COSMOS_KEY;
    const databaseId = process.env.COSMOS_DATABASE_ID || 'catalogue-db';
    const containerId = process.env.COSMOS_CONTAINER_ID || 'device-models';
    
    if (!endpoint) {
      throw new Error('COSMOS_ENDPOINT environment variable is required');
    }

    const client = new CosmosClient({ endpoint, key });
    const database = client.database(databaseId);
    const container = database.container(containerId);

    console.log(`📦 Querying container: ${containerId} in database: ${databaseId}\n`);

    // Query all documents
    const query = 'SELECT * FROM c';
    const { resources } = await container.items.query(query).fetchAll();

    console.log(`📊 Found ${resources.length} documents\n`);

    if (resources.length === 0) {
      console.log('✅ Container is empty - ready for seeding');
      return;
    }

    // Inspect each document
    resources.forEach((doc, index) => {
      console.log(`\n--- Document ${index + 1} ---`);
      console.log('Keys:', Object.keys(doc).join(', '));
      console.log('Has id:', !!doc.id);
      console.log('id value:', doc.id);
      console.log('Full document:', JSON.stringify(doc, null, 2));
    });

    // Check for documents missing id
    const missingId = resources.filter(doc => !doc.id);
    if (missingId.length > 0) {
      console.log(`\n⚠️  WARNING: Found ${missingId.length} documents without id field`);
      console.log('These documents should be deleted:');
      missingId.forEach((doc, index) => {
        console.log(`  ${index + 1}.`, JSON.stringify(doc, null, 2));
      });
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Error inspecting database:', message);
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  inspectDatabase().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { inspectDatabase };

