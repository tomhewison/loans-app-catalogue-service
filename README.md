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
- `npm run seed` - Populate database with device models and devices
- `npm run seed:models` - Seed only device models
- `npm run seed:devices` - Seed only device instances
- `npm run clean` - Clean build artifacts

## Environment Variables

### Required
- `COSMOS_ENDPOINT` - Azure Cosmos DB endpoint URL
- `COSMOS_KEY` - Azure Cosmos DB access key
- `DEVICE_AVAILABILITY_SERVICE_URL` - Base URL for the device availability microservice
- `AUTH0_DOMAIN` - Auth0 domain (e.g., `your-tenant.auth0.com` or `your-tenant.us.auth0.com`)
- `AUTH0_AUDIENCE` - Auth0 API identifier/audience (the API identifier configured in Auth0)

### Optional
- `COSMOS_DATABASE_ID` - Cosmos DB database ID (default: `catalogue-db`)
- `COSMOS_CONTAINER_ID` - Cosmos DB container ID for device models (default: `device-models`)
- `COSMOS_DEVICES_CONTAINER_ID` - Cosmos DB container ID for devices (default: `devices`)
- `DEVICE_AVAILABILITY_SERVICE_API_KEY` - API key for authenticating with the device availability service
- `RESERVATION_SERVICE_URL` - Base URL for the reservation microservice (optional, required for rental date filtering)
- `RESERVATION_SERVICE_API_KEY` - API key for authenticating with the reservation service (optional)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins (default: `http://localhost:5173,http://localhost:3000`)
