import { NextRequest, NextResponse } from 'next/server';
import { decodeSessionId } from '@/lib/finkSession';

interface FinkTransferRequest {
  sessionId?: string;
  amount?: number;
}

interface FinkTransferResponse {
  status: 'SUCCESS' | 'FAILED';
  transactionId: string | null;
  processedAt: string;
  failureCode: string | null;
  failureReason: string | null;
  echo: {
    sessionId: string;
    amount: number;
  };
}

interface ErrorResponse {
  error: string;
  message: string;
  details: null;
}

function generateTransactionId(): string {
  // Generate a synthetic transaction ID like "tr_01JK5ME5VQ3KQ1N8D9"
  const prefix = 'tr_';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randomPart = Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return prefix + randomPart;
}

export async function POST(request: NextRequest) {
  try {
    let body: FinkTransferRequest;
    try {
      body = await request.json();
    } catch (parseError) {
      const errorResponse: ErrorResponse = {
        error: 'BadRequest',
        message: 'Invalid JSON in request body',
        details: null,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate required fields
    if (typeof body.sessionId !== 'string') {
      const errorResponse: ErrorResponse = {
        error: 'BadRequest',
        message: 'sessionId is required',
        details: null,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (typeof body.amount !== 'number') {
      const errorResponse: ErrorResponse = {
        error: 'BadRequest',
        message: 'amount is required and must be a number',
        details: null,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const sessionId = body.sessionId.trim();
    const amount = body.amount;
    const processedAt = new Date().toISOString();

    // Decode the session ID to get the tag
    const { tag } = decodeSessionId(sessionId);

    // Business logic based on the tag from session ID
    let status: 'SUCCESS' | 'FAILED';
    let failureCode: string | null = null;
    let failureReason: string | null = null;
    let transactionId: string | null = null;

    if (tag === 'SUCCESS') {
      status = 'SUCCESS';
      transactionId = generateTransactionId();
    } else if (tag === 'INVALID_ACCOUNT') {
      status = 'FAILED';
      failureCode = 'INVALID_ACCOUNT';
      failureReason = 'Account ID is missing or empty';
    } else if (tag === 'ACCOUNT_BLOCKED') {
      status = 'FAILED';
      failureCode = 'ACCOUNT_BLOCKED';
      failureReason = 'Transfers from this account are blocked';
    } else {
      // Unknown or malformed session ID
      status = 'FAILED';
      failureCode = 'INVALID_SESSION';
      failureReason = 'Invalid or malformed session ID';
    }

    const response: FinkTransferResponse = {
      status,
      transactionId,
      processedAt,
      failureCode,
      failureReason,
      echo: {
        sessionId,
        amount,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    // Handle any unexpected errors
    console.error('Unexpected error in transfers endpoint:', error);
    const errorResponse: ErrorResponse = {
      error: 'InternalError',
      message: 'An unexpected error occurred',
      details: null,
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
