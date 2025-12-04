# Installation Instructions

## Install Dependencies

After pulling the latest changes, install the new dependencies:

```bash
npm install
```

This will install:
- `jsonwebtoken` - For JWT token verification
- `jwks-rsa` - For fetching Auth0 signing keys
- `@types/jsonwebtoken` - TypeScript types for jsonwebtoken

## Verify Installation

After installation, verify the packages are installed:

```bash
npm list jsonwebtoken jwks-rsa
```

## Build

Build the project to ensure everything compiles:

```bash
npm run build
```

## Next Steps

1. **Set up Auth0**: Follow the guide in `AUTH0_SETUP.md`
2. **Configure Environment Variables**: Set `AUTH0_DOMAIN` and `AUTH0_AUDIENCE`
3. **Test**: Use the test endpoints with Auth0 tokens

