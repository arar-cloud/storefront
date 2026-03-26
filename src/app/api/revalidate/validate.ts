import { NextRequest, NextResponse } from 'next/server';
import { validateRevalidatePayload } from '@/lib/revalidate-config';

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;

/**
 * Validate revalidate request
 * - Check authentication token
 * - Validate payload against whitelists
 * - Prevent command injection and path traversal
 */
export async function validateRevalidateRequest(request: NextRequest): Promise<{
  valid: boolean;
  tags?: string[];
  paths?: string[];
  response?: NextResponse;
}> {
  try {
    // Validate secret token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token || token !== REVALIDATE_SECRET) {
      return {
        valid: false,
        response: NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        ),
      };
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validation = validateRevalidatePayload(body);
    
    if (!validation.valid) {
      return {
        valid: false,
        response: NextResponse.json(
          { error: validation.error },
          { status: 400 }
        ),
      };
    }
    
    return {
      valid: true,
      tags: validation.tags,
      paths: validation.paths,
    };
  } catch (error) {
    console.error('Revalidate validation error:', error);
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      ),
    };
  }
}
