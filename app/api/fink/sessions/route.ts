import { NextRequest, NextResponse } from 'next/server';
import { encodeSessionId, type SessionTag } from '@/lib/finkSession';

interface FinkSessionRequest {
  finkAccountId?: string;
  currency?: string;
  description?: string;
}

interface FinkSessionResponse {
  sessionId: string;
  finkAccountId: string;
  statusHint: SessionTag;
}

interface ErrorResponse {
  error: string;
  message: string;
  details: null;
}

export async function POST(request: NextRequest) {
  try {
    const body: FinkSessionRequest = await request.json();

    // Validate required fields - check that finkAccountId exists and is a string
    if (typeof body.finkAccountId !== 'string') {
      const errorResponse: ErrorResponse = {
        error: 'BadRequest',
        message: 'finkAccountId is required',
        details: null,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const finkAccountId = body.finkAccountId.trim();

    // Business logic - determine the tag based on finkAccountId
    let tag: SessionTag;
    if (!finkAccountId || finkAccountId.length === 0) {
      tag = 'INVALID_ACCOUNT';
    } else if (finkAccountId.endsWith('999')) {
      tag = 'ACCOUNT_BLOCKED';
    } else {
      tag = 'SUCCESS';
    }

    const sessionId = encodeSessionId(tag);

    const response: FinkSessionResponse = {
      sessionId,
      finkAccountId,
      statusHint: tag,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    // Handle JSON parsing errors or other unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof SyntaxError || errorMessage.includes('JSON')) {
      const errorResponse: ErrorResponse = {
        error: 'BadRequest',
        message: 'Invalid JSON in request body',
        details: null,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const errorResponse: ErrorResponse = {
      error: 'InternalError',
      message: 'An unexpected error occurred',
      details: null,
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

