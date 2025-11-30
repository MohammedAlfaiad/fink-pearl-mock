import { NextRequest, NextResponse } from 'next/server';

interface PearlRequest {
  student: {
    universityId?: string;
    fullName?: string;
  };
  context?: {
    requestedBySystem?: string;
    requestId?: string;
    requestedAt?: string;
  };
}

interface PearlResponse {
  universityId: string;
  verified: boolean;
  reason: string;
  checkedAt: string;
  metadata: {
    provider: string;
    rule: string;
  };
}

interface ErrorResponse {
  error: string;
  message: string;
  details: null;
}

export async function POST(request: NextRequest) {
  try {
    const body: PearlRequest = await request.json();

    // Validate required fields - check that student.universityId exists and is a string
    if (!body.student || typeof body.student.universityId !== 'string') {
      const errorResponse: ErrorResponse = {
        error: 'BadRequest',
        message: 'student.universityId is required',
        details: null,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const universityId = body.student.universityId.trim();
    const checkedAt = new Date().toISOString();

    // Business logic - handle empty/whitespace as verified=false (not a 400 error)
    let verified: boolean;
    let reason: string;

    if (!universityId || universityId.length === 0) {
      verified = false;
      reason = 'Invalid or empty university ID';
    } else if (universityId.endsWith('000')) {
      verified = false;
      reason = 'University verification failed (blocked pattern)';
    } else {
      verified = true;
      reason = 'University ID accepted';
    }

    const response: PearlResponse = {
      universityId,
      verified,
      reason,
      checkedAt,
      metadata: {
        provider: 'Pearl',
        rule: 'simple-suffix-check',
      },
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

