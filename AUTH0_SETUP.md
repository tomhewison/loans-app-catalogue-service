# Auth0 Setup Guide

This guide walks you through setting up Auth0 for production use with the Catalogue Service.

## Prerequisites

- Auth0 account (free tier available)
- Access to Auth0 Dashboard

## Step 1: Create Auth0 API

1. **Log in to Auth0 Dashboard**: https://manage.auth0.com/

2. **Navigate to APIs**: Click "Applications" → "APIs" in the sidebar

3. **Create API**:
   - Click "Create API"
   - **Name**: `Device Loan Management API` (or your preferred name)
   - **Identifier**: `https://device-loan-api` (this is your `AUTH0_AUDIENCE`)
     - ⚠️ **Important**: This identifier must be a URL (can be any valid URL format)
     - This will be used as the `AUTH0_AUDIENCE` environment variable
   - **Signing Algorithm**: `RS256` (default, recommended)
   - Click "Create"

4. **Enable RBAC** (Role-Based Access Control):
   - In the API settings, scroll to "RBAC Settings"
   - Toggle "Enable RBAC"
   - Toggle "Add Permissions in the Access Token"
   - Click "Save"

5. **Add Permissions/Scopes** (Optional but Recommended):
   - Go to "Permissions" tab
   - Add permissions:
     - `read:device-models` - Read device models
     - `write:device-models` - Create/update/delete device models
     - `read:devices` - Read devices
     - `write:devices` - Create/update/delete devices
     - `read:reservations` - Read reservations
     - `write:reservations` - Create/update reservations
     - `read:favorites` - Read favorites
     - `write:favorites` - Manage favorites
     - `read:notifications` - Read notification subscriptions
     - `write:notifications` - Manage notification subscriptions

## Step 2: Create Roles

1. **Navigate to Roles**: Click "User Management" → "Roles" in the sidebar

2. **Create Staff Role**:
   - Click "Create Role"
   - **Name**: `staff`
   - **Description**: `Staff members with administrative access`
   - Click "Create"

3. **Create Student Role**:
   - Click "Create Role"
   - **Name**: `student`
   - **Description**: `Students with standard access`
   - Click "Create"

4. **Assign Permissions to Roles** (Optional):
   - Click on `staff` role
   - Go to "Permissions" tab
   - Add all permissions (staff has full access)
   - Click "Assign"
   - Repeat for `student` role with read-only permissions

## Step 3: Configure Application (SPA)

1. **Navigate to Applications**: Click "Applications" → "Applications"

2. **Create Application** (or use existing):
   - Click "Create Application"
   - **Name**: `Device Loan Management Frontend`
   - **Type**: `Single Page Application`
   - Click "Create"

3. **Configure Application Settings**:
   - **Allowed Callback URLs**: 
     ```
     http://localhost:5173,http://localhost:3000,https://your-production-url
     ```
   - **Allowed Logout URLs**: 
     ```
     http://localhost:5173,http://localhost:3000,https://your-production-url
     ```
   - **Allowed Web Origins**: 
     ```
     http://localhost:5173,http://localhost:3000,https://your-production-url
     ```
   - **Allowed Origins (CORS)**: 
     ```
     http://localhost:5173,http://localhost:3000,https://your-production-url
     ```

4. **Enable RBAC for Application**:
   - Scroll to "Advanced Settings" → "Grant Types"
   - Ensure "Authorization Code" and "Refresh Token" are enabled
   - Go to "Advanced Settings" → "OAuth"
   - Enable "OIDC Conformant"
   - Click "Save Changes"

5. **Authorize Application for API**:
   - Go to "APIs" tab in the Application settings
   - Find your API (`Device Loan Management API`)
   - Toggle it ON
   - Authorize the application
   - Select the permissions you want to grant (or all for testing)

## Step 4: Assign Roles to Users

1. **Navigate to Users**: Click "User Management" → "Users"

2. **Select a User**: Click on a user to edit

3. **Assign Role**:
   - Go to "Roles" tab
   - Click "Assign Roles"
   - Select `staff` or `student` role
   - Click "Assign"

## Step 5: Configure Environment Variables

Set the following environment variables in your Azure Function App or `local.settings.json`:

```json
{
  "Values": {
    "AUTH0_DOMAIN": "your-tenant.auth0.com",
    "AUTH0_AUDIENCE": "https://device-loan-api"
  }
}
```

**Important Notes**:
- `AUTH0_DOMAIN`: Your Auth0 tenant domain (found in Auth0 Dashboard → Settings)
  - Format: `your-tenant.auth0.com` or `your-tenant.us.auth0.com` (no `https://` prefix)
- `AUTH0_AUDIENCE`: The API identifier you set in Step 1
  - Must match exactly (case-sensitive)

## Step 6: Test Token Validation

### Get a Test Token

1. **Using Auth0 Dashboard**:
   - Go to your API → "Test" tab
   - Copy the test token (for testing only)

2. **Using Postman/curl**:
   ```bash
   curl --request POST \
     --url https://your-tenant.auth0.com/oauth/token \
     --header 'content-type: application/json' \
     --data '{
       "client_id": "YOUR_CLIENT_ID",
       "client_secret": "YOUR_CLIENT_SECRET",
       "audience": "https://device-loan-api",
       "grant_type": "client_credentials"
     }'
   ```

### Test API Endpoint

```bash
curl -X GET http://localhost:7071/api/device-models \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Token Claims Structure

After setup, your tokens will include:

```json
{
  "sub": "auth0|user-id",
  "email": "user@example.com",
  "https://your-tenant.auth0.com/roles": ["staff"],
  "permissions": ["read:device-models", "write:device-models"],
  "aud": "https://device-loan-api",
  "iss": "https://your-tenant.auth0.com/",
  "exp": 1234567890,
  "iat": 1234567890
}
```

## Troubleshooting

### Token Validation Fails

1. **Check Environment Variables**:
   ```bash
   echo $AUTH0_DOMAIN
   echo $AUTH0_AUDIENCE
   ```

2. **Verify Token Claims**:
   - Decode token at https://jwt.io/
   - Check `aud` matches `AUTH0_AUDIENCE`
   - Check `iss` matches `https://[AUTH0_DOMAIN]/`

3. **Check Token Expiration**:
   - Tokens expire after a set time (default: 24 hours)
   - Get a new token if expired

### Roles Not Appearing in Token

1. **Enable RBAC** in API settings
2. **Enable "Add roles in access token"** in API settings
3. **Assign roles** to users in User Management
4. **Request new token** after making changes

### Permissions Not Appearing in Token

1. **Enable "Add permissions in access token"** in API settings
2. **Assign permissions** to roles (if using RBAC)
3. **Authorize application** for the API with correct permissions
4. **Request new token** after making changes

## Security Best Practices

1. **Never commit tokens** to version control
2. **Use environment variables** for all Auth0 configuration
3. **Rotate secrets** regularly
4. **Use HTTPS** in production
5. **Enable MFA** for Auth0 dashboard access
6. **Monitor token usage** in Auth0 Dashboard → Monitoring
7. **Set appropriate token expiration** times
8. **Use refresh tokens** for long-lived sessions

## Production Checklist

- [ ] API created with correct identifier
- [ ] RBAC enabled in API settings
- [ ] Roles created (`staff`, `student`)
- [ ] Permissions/scopes defined
- [ ] Application configured with correct URLs
- [ ] Environment variables set in Azure Function App
- [ ] CORS origins configured
- [ ] Test tokens working
- [ ] Users assigned to roles
- [ ] Monitoring enabled in Auth0 Dashboard

