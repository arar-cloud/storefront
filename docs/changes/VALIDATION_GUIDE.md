# CSRF and Input Validation Guide

## Overview

This guide explains how to use the CSRF token generation, validation, and input sanitization utilities to secure API endpoints.

## CSRF Protection

### Generating CSRF Tokens

```typescript
import { generateCsrfToken } from './csrf';

// Generate a token (typically done on form load or session creation)
const token = generateCsrfToken();
```

### Validating CSRF Tokens

```typescript
import { validateCsrfToken } from './csrf';

// Validate incoming request token against stored token
const isValid = validateCsrfToken(requestToken, storedToken);
```

## Input Validation

### Validating User Input

```typescript
import { validateInput } from './input-validator';

const result = validateInput('email', 'user@example.com');
if (result.isValid) {
  // Process input
} else {
  // Handle validation error: result.error
}
```

### Supported Input Types

- `email` - RFC 5322 compliant email
- `password` - Min 8 chars, max 128 chars, must contain uppercase, lowercase, and number
- `username` - Alphanumeric with underscores/hyphens, 3-32 chars
- `phone` - Various international formats
- `url` - Valid HTTP/HTTPS URLs
- `text` - General text with XSS prevention

## Best Practices

1. **Always validate CSRF tokens on POST/PUT/DELETE endpoints**
2. **Sanitize all user input before processing**
3. **Use HTTPS to protect tokens in transit**
4. **Rotate tokens regularly for sensitive operations**
5. **Log validation failures for security monitoring**

## Integration with API Routes

See the auth endpoint implementations in:
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/reset-password/route.ts`
- `src/app/api/auth/set-password/route.ts`
