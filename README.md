# Device Catalogue Service

Azure Functions microservice for managing student device catalogue following Clean Architecture principles.

## Project Structure

```
src/
├── domain/           # Core business logic and entities
├── app/             # Application use cases (business workflows)
├── infra/           # Infrastructure adapters (database, external services)
├── functions/       # Azure Functions HTTP triggers
├── config/          # Dependency injection and configuration
└── seed/            # Data seeding utilities
```

## Development Commands

- `npm run build` - Compile TypeScript
- `npm run start` - Start Azure Functions runtime
- `npm run seed` - Populate database with test data
- `npm run clean` - Clean build artifacts

## Environment Variables

- `COSMOS_KEY` - Azure Cosmos DB access key
- `COSMOS_ENDPOINT` - Azure Cosmos DB endpoint URL
