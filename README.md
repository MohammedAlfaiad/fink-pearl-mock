This is a [Next.js](https://nextjs.org) project that provides mock HTTP APIs for **Pearl** (university verification) and **Fink** (payment transfer) services, designed to be deployed on Vercel.

These APIs are intentionally structured differently from the Java interfaces (`UniversityVerifier`, `PaymentService`) to justify the use of the **Adapter pattern** on the Java side. See [`FINK_PEARL_API.md`](FINK_PEARL_API.md) for the complete API specification.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The API endpoints are available at:
- **Pearl**: `http://localhost:3000/api/pearl/university-verifications`
- **Fink**: `http://localhost:3000/api/fink/transfers`

## API Endpoints

### Pearl: University Verification API

**Endpoint**: `POST /api/pearl/university-verifications`

Verifies whether a student is eligible for membership based on their university ID.

**Example Request (Success)**:
```bash
curl -X POST http://localhost:3000/api/pearl/university-verifications \
  -H "Content-Type: application/json" \
  -d '{
    "student": {
      "universityId": "U2024001",
      "fullName": "Alice Johnson"
    },
    "context": {
      "requestedBySystem": "library-membership",
      "requestId": "c0b5a8e8-9f4f-4a12-b154-4b21f3a7a001"
    }
  }'
```

**Example Response (Success)**:
```json
{
  "universityId": "U2024001",
  "verified": true,
  "reason": "University ID accepted",
  "checkedAt": "2025-11-30T12:34:57Z",
  "metadata": {
    "provider": "Pearl",
    "rule": "simple-suffix-check"
  }
}
```

**Example Request (Blocked Pattern - ends with "000")**:
```bash
curl -X POST http://localhost:3000/api/pearl/university-verifications \
  -H "Content-Type: application/json" \
  -d '{
    "student": {
      "universityId": "U2024000"
    }
  }'
```

**Example Response (Blocked)**:
```json
{
  "universityId": "U2024000",
  "verified": false,
  "reason": "University verification failed (blocked pattern)",
  "checkedAt": "2025-11-30T12:34:57Z",
  "metadata": {
    "provider": "Pearl",
    "rule": "simple-suffix-check"
  }
}
```

**Example Request (Missing Required Field)**:
```bash
curl -X POST http://localhost:3000/api/pearl/university-verifications \
  -H "Content-Type: application/json" \
  -d '{
    "student": {
      "fullName": "Alice Johnson"
    }
  }'
```

**Example Response (400 Bad Request)**:
```json
{
  "error": "BadRequest",
  "message": "student.universityId is required",
  "details": null
}
```

### Fink: Payment Transfer API

**Endpoint**: `POST /api/fink/transfers`

Simulates transferring funds from a student account to the library deposit account.

**Example Request (Success)**:
```bash
curl -X POST http://localhost:3000/api/fink/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "sourceAccount": {
      "id": "FINK-U2024001",
      "type": "STUDENT_DEPOSIT"
    },
    "transaction": {
      "amount": 200.0,
      "currency": "USD",
      "description": "Library membership deposit"
    },
    "idempotencyKey": "d9f1d0b4-5eae-4b39-842e-32fd406f9f2a"
  }'
```

**Example Response (Success)**:
```json
{
  "status": "SUCCESS",
  "transactionId": "tr_01JK5ME5VQ3KQ1N8D9",
  "processedAt": "2025-11-30T12:35:10Z",
  "failureCode": null,
  "failureReason": null,
  "echo": {
    "sourceAccountId": "FINK-U2024001",
    "amount": 200.0,
    "currency": "USD"
  }
}
```

**Example Request (Blocked Account - ends with "999")**:
```bash
curl -X POST http://localhost:3000/api/fink/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "sourceAccount": {
      "id": "FINK-U2024999"
    },
    "transaction": {
      "amount": 200.0
    }
  }'
```

**Example Response (Failed)**:
```json
{
  "status": "FAILED",
  "transactionId": null,
  "processedAt": "2025-11-30T12:35:10Z",
  "failureCode": "ACCOUNT_BLOCKED",
  "failureReason": "Transfers from this account are blocked",
  "echo": {
    "sourceAccountId": "FINK-U2024999",
    "amount": 200.0,
    "currency": "USD"
  }
}
```

**Example Request (Empty Account ID)**:
```bash
curl -X POST http://localhost:3000/api/fink/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "sourceAccount": {
      "id": ""
    },
    "transaction": {
      "amount": 200.0
    }
  }'
```

**Example Response (Failed)**:
```json
{
  "status": "FAILED",
  "transactionId": null,
  "processedAt": "2025-11-30T12:35:10Z",
  "failureCode": "INVALID_ACCOUNT",
  "failureReason": "Account ID is missing or empty",
  "echo": {
    "sourceAccountId": "",
    "amount": 200.0,
    "currency": "USD"
  }
}
```

**Example Request (Missing Required Field)**:
```bash
curl -X POST http://localhost:3000/api/fink/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "sourceAccount": {
      "id": "FINK-U2024001"
    }
  }'
```

**Example Response (400 Bad Request)**:
```json
{
  "error": "BadRequest",
  "message": "transaction.amount is required and must be a number",
  "details": null
}
```

## Business Logic

### Pearl
- If `student.universityId` is `null`, empty, or whitespace-only → `verified = false`
- If `student.universityId` ends with `"000"` → `verified = false`
- Otherwise → `verified = true`

### Fink
- If `sourceAccount.id` is `null`, empty, or whitespace-only → `status = "FAILED"`, `failureCode = "INVALID_ACCOUNT"`
- If `sourceAccount.id` ends with `"999"` → `status = "FAILED"`, `failureCode = "ACCOUNT_BLOCKED"`
- Otherwise → `status = "SUCCESS"`

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
