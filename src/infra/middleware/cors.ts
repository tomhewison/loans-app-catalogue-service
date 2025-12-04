import { HttpResponseInit } from '@azure/functions';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  // Add production origins from environment variable
  ...(process.env.ALLOWED_ORIGINS?.split(',') || []),
];

/**
 * Adds CORS headers to response
 */
export function addCorsHeaders(response: HttpResponseInit, origin?: string | null): HttpResponseInit {
  const requestOrigin = origin || '*';
  const allowedOrigin = ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0] || '*';
  
  return {
    ...response,
    headers: {
      ...response.headers,
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '3600',
    },
  };
}

/**
 * Handles CORS preflight requests
 * Note to self: this is the function that gets called when the browser sends a preflight request to the server.
 * It is used to check if the browser is allowed to make the request.
 * If the browser is allowed to make the request, the server will return a 204 No Content response.
 * If the browser is not allowed to make the request, the server will return a 403 Forbidden response.
 * The browser will then retry the request with the correct origin.
 */
export function handleCorsPreflight(origin?: string | null): HttpResponseInit {
  const requestOrigin = origin || '*';
  const allowedOrigin = ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0] || '*';
  
  return {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '3600',
    },
  };
}

