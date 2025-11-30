import { NextRequest, NextResponse } from 'next/server';

interface FinkRequest {
  sourceAccount: {
    id?: string;
    type?: string;
  };
  transaction: {
    amount?: number;
    currency?: string;
    description?: string;
  };
  idempotencyKey?: string;
}

interface FinkResponse {
  status: 'SUCCESS' | 'FAILED';
  transactionId: string | null;
  processedAt: string;
  failureCode: string | null;
  failureReason: string | null;
  echo: {
    sourceAccountId: string;
    amount: number;
    currency: string;
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
    const body: FinkRequest = await request.json();

    // Validate required fields - check that sourceAccount.id exists and is a string
    if (!body.sourceAccount || typeof body.sourceAccount.id !== 'string') {
      const errorResponse: ErrorResponse = {
        error: 'BadRequest',
        message: 'sourceAccount.id is required',
        details: null,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (typeof body.transaction?.amount !== 'number') {
      const errorResponse: ErrorResponse = {
        error: 'BadRequest',
        message: 'transaction.amount is required and must be a number',
        details: null,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const sourceAccountId = body.sourceAccount.id.trim();
    const amount = body.transaction.amount;
    const currency = body.transaction.currency || 'USD';
    const processedAt = new Date().toISOString();

    // Business logic
    let status: 'SUCCESS' | 'FAILED';
    let failureCode: string | null = null;
    let failureReason: string | null = null;
    let transactionId: string | null = null;

    if (!sourceAccountId || sourceAccountId.length === 0) {
      status = 'FAILED';
      failureCode = 'INVALID_ACCOUNT';
      failureReason = 'Account ID is missing or empty';
    } else if (sourceAccountId.endsWith('999')) {
      status = 'FAILED';
      failureCode = 'ACCOUNT_BLOCKED';
      failureReason = 'Transfers from this account are blocked';
    } else {
      status = 'SUCCESS';
      transactionId = generateTransactionId();
    }

    const response: FinkResponse = {
      status,
      transactionId,
      processedAt,
      failureCode,
      failureReason,
      echo: {
        sourceAccountId,
        amount,
        currency,
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

