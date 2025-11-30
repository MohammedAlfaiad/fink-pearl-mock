import { NextRequest, NextResponse } from 'next/server';

interface PearlRequest {
  personId?: string;
  fullName?: string;
}

interface PearlResponse {
  personId: string;
  verified: boolean;
  reason: string;
  checkedAt: string;
  role: 'STUDENT';
}

interface ErrorResponse {
  error: string;
  message: string;
  details: null;
}

export async function POST(request: NextRequest) {
  try {
    const body: PearlRequest = await request.json();

    // Validate required fields - check that personId exists and is a string
    if (typeof body.personId !== 'string') {
      const errorResponse: ErrorResponse = {
        error: 'BadRequest',
        message: 'personId is required',
        details: null,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const personId = body.personId.trim();
    const checkedAt = new Date().toISOString();

    // Business logic for students - handle empty/whitespace as verified=false (not a 400 error)
    let verified: boolean;
    let reason: string;

    if (!personId || personId.length === 0) {
      verified = false;
      reason = 'Invalid or empty person ID';
    } else if (personId.endsWith('000')) {
      verified = false;
      reason = 'Student verification failed (blocked pattern)';
    } else {
      verified = true;
      reason = 'Student ID accepted';
    }

    const response: PearlResponse = {
      personId,
      verified,
      reason,
      checkedAt,
      role: 'STUDENT',
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

