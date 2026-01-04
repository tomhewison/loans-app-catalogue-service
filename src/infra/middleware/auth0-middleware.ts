import { HttpRequest } from '@azure/functions';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { logger } from '../logging/logger';

export type Auth0User = {
  sub: string; // User ID
  email?: string;
  roles?: string[];
  permissions?: string[];
};

export type Auth0ValidationResult = {
  valid: boolean;
  user?: Auth0User;
  error?: string;
};

/**
 * Gets the Auth0 domain from environment variables
 */
function getAuth0Domain(): string {
  const domain = process.env.AUTH0_DOMAIN;
  if (!domain) {
    logger.error('AUTH0_DOMAIN environment variable is required');
    throw new Error('AUTH0_DOMAIN environment variable is required');
  }
  // Remove trailing slash if present
  return domain.replace(/\/$/, '');
}

/**
 * Gets the Auth0 audience (API identifier) from environment variables
 */
function getAuth0Audience(): string {
  const audience = process.env.AUTH0_AUDIENCE;
  if (!audience) {
    logger.error('AUTH0_AUDIENCE environment variable is required');
    throw new Error('AUTH0_AUDIENCE environment variable is required');
  }
  return audience;
}

/**
 * Creates a JWKS client for Auth0
 */
function createJwksClient() {
  const domain = getAuth0Domain();
  logger.debug('Creating JWKS client', { domain });
  
  return jwksClient({
    jwksUri: `https://${domain}/.well-known/jwks.json`,
    cache: true,
    cacheMaxAge: 86400000, // 24 hours
    rateLimit: true,
    jwksRequestsPerMinute: 5,
  });
}

/**
 * Gets the signing key from Auth0 JWKS endpoint
 */
async function getSigningKey(kid: string): Promise<string> {
  const startTime = Date.now();
  
  try {
    const client = createJwksClient();
    const key = await client.getSigningKey(kid);
    const publicKey = key.getPublicKey();
    
    logger.debug('Retrieved signing key from JWKS', {
      kid,
      durationMs: Date.now() - startTime,
    });
    
    return publicKey;
  } catch (error) {
    logger.error('Failed to retrieve signing key from JWKS', error as Error, { kid });
    throw error;
  }
}

/**
 * Validates Auth0 JWT token from Authorization header
 * 
 * Validates:
 * - Token signature using Auth0 JWKS endpoint
 * - Token expiration
 * - Audience (API identifier)
 * - Issuer (Auth0 domain)
 * 
 * Extracts user claims:
 * - sub (user ID)
 * - email
 * - roles (from custom claim or token)
 * - permissions/scopes
 */
export async function validateAuth0Token(request: HttpRequest): Promise<Auth0ValidationResult> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.debug('Missing or invalid Authorization header');
    return {
      valid: false,
      error: 'Missing or invalid Authorization header',
    };
  }

  const token = authHeader.substring(7);
  
  if (!token || token.length === 0) {
    logger.warn('Empty token provided');
    return {
      valid: false,
      error: 'Invalid token',
    };
  }

  try {
    // Get configuration
    const domain = getAuth0Domain();
    const audience = getAuth0Audience();
    const issuer = `https://${domain}/`;

    logger.debug('Validating Auth0 token', {
      issuer,
      audience,
      tokenLength: token.length,
    });

    // Decode token to get kid (key ID) without verification
    const decoded = jwt.decode(token, { complete: true });
    
    if (!decoded || typeof decoded === 'string' || !decoded.header || !decoded.header.kid) {
      logger.warn('Invalid token format - could not decode');
      return {
        valid: false,
        error: 'Invalid token format',
      };
    }

    const kid = decoded.header.kid;
    logger.debug('Token decoded, fetching signing key', { kid });

    // Get the signing key from Auth0 JWKS endpoint
    const signingKey = await getSigningKey(kid);

    // Verify and decode the token
    const verified = jwt.verify(token, signingKey, {
      audience,
      issuer,
      algorithms: ['RS256'],
    }) as jwt.JwtPayload;

    // Extract user information from token claims
    const user: Auth0User = {
      sub: verified.sub || '',
      email: verified.email as string | undefined,
      roles: extractRoles(verified),
      permissions: extractPermissions(verified),
    };

    if (!user.sub) {
      logger.warn('Token missing user identifier (sub)');
      return {
        valid: false,
        error: 'Token missing user identifier (sub)',
      };
    }

    logger.debug('Auth0 token validated successfully', {
      userId: user.sub,
      roles: user.roles?.join(','),
    });

    return {
      valid: true,
      user,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.debug('Token has expired', {
        expiredAt: error.expiredAt?.toISOString(),
      });
      return {
        valid: false,
        error: 'Token has expired',
      };
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      logger.debug('Token validation failed', {
        errorMessage: error.message,
      });
      return {
        valid: false,
        error: `Token validation failed: ${error.message}`,
      };
    }

    // Handle JWKS errors
    if (error instanceof Error) {
      logger.warn('Authentication error', { errorMessage: error.message });
      return {
        valid: false,
        error: `Authentication error: ${error.message}`,
      };
    }

    logger.error('Unknown authentication error', new Error('Unknown error'));
    return {
      valid: false,
      error: 'Unknown authentication error',
    };
  }
}

/**
 * Extracts roles from token claims
 * Auth0 roles can be in:
 * - https://[domain]/roles (namespace claim)
 * - roles (direct claim)
 * - Custom namespace claim
 */
function extractRoles(claims: jwt.JwtPayload): string[] {
  const domain = process.env.AUTH0_DOMAIN?.replace(/\/$/, '') || '';
  const rolesNamespace = `https://${domain}/roles`;
  
  // Check namespace claim first
  if (claims[rolesNamespace] && Array.isArray(claims[rolesNamespace])) {
    return claims[rolesNamespace] as string[];
  }
  
  // Check direct roles claim
  if (claims.roles && Array.isArray(claims.roles)) {
    return claims.roles as string[];
  }
  
  // Check app_metadata or user_metadata (if included)
  if (claims['https://[domain]/app_metadata']?.roles && Array.isArray(claims['https://[domain]/app_metadata'].roles)) {
    return claims['https://[domain]/app_metadata'].roles as string[];
  }
  
  return [];
}

/**
 * Extracts permissions/scopes from token claims
 * Auth0 permissions can be in:
 * - permissions (direct claim)
 * - scope (space-separated string)
 * - Custom namespace claim
 */
function extractPermissions(claims: jwt.JwtPayload): string[] {
  // Check permissions claim (for RBAC)
  if (claims.permissions && Array.isArray(claims.permissions)) {
    return claims.permissions as string[];
  }
  
  // Check scope claim (space-separated string)
  if (claims.scope && typeof claims.scope === 'string') {
    return claims.scope.split(' ').filter(s => s.length > 0);
  }
  
  return [];
}

/**
 * Checks if user has required role
 */
export function hasRole(user: Auth0User, requiredRole: 'staff' | 'student'): boolean {
  return user.roles?.includes(requiredRole) ?? false;
}

/**
 * Checks if user has required permission/scope
 */
export function hasPermission(user: Auth0User, requiredPermission: string): boolean {
  return user.permissions?.includes(requiredPermission) ?? false;
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(request: HttpRequest): Promise<Auth0ValidationResult> {
  try {
    const validation = await validateAuth0Token(request);
    
    if (!validation.valid) {
      logger.debug('Authentication required but validation failed', {
        error: validation.error,
      });
      return validation;
    }
    
    return validation;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Authentication configuration error', error as Error);
    return {
      valid: false,
      error: `Authentication configuration error: ${message}`,
    };
  }
}

/**
 * Middleware to require staff role
 */
export async function requireStaff(request: HttpRequest): Promise<Auth0ValidationResult> {
  try {
    const validation = await validateAuth0Token(request);
    
    if (!validation.valid || !validation.user) {
      logger.debug('Staff access denied - authentication failed', {
        error: validation.error,
      });
      return {
        valid: false,
        error: validation.error || 'Authentication required',
      };
    }
    
    if (!hasRole(validation.user, 'staff')) {
      logger.debug('Staff access denied - insufficient role', {
        userId: validation.user.sub,
      });
      return {
        valid: false,
        error: 'Staff role required',
      };
    }
    
    return validation;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Authentication configuration error', error as Error);
    return {
      valid: false,
      error: `Authentication configuration error: ${message}`,
    };
  }
}

/**
 * Middleware to require specific permission/scope
 */
export async function requirePermission(
  request: HttpRequest,
  requiredPermission: string
): Promise<Auth0ValidationResult> {
  try {
    const validation = await validateAuth0Token(request);
    
    if (!validation.valid || !validation.user) {
      logger.debug('Permission check failed - authentication failed', {
        error: validation.error,
        requiredPermission,
      });
      return {
        valid: false,
        error: validation.error || 'Authentication required',
      };
    }
    
    if (!hasPermission(validation.user, requiredPermission)) {
      logger.debug('Permission denied', {
        userId: validation.user.sub,
        requiredPermission,
      });
      return {
        valid: false,
        error: `Permission required: ${requiredPermission}`,
      };
    }
    
    return validation;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Authentication configuration error', error as Error);
    return {
      valid: false,
      error: `Authentication configuration error: ${message}`,
    };
  }
}
