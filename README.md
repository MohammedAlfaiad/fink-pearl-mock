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
- **Pearl Student**: `http://localhost:3000/api/pearl/student-verifications`
- **Pearl Staff**: `http://localhost:3000/api/pearl/staff-verifications`
- **Fink Sessions**: `http://localhost:3000/api/fink/sessions`
- **Fink Transfers**: `http://localhost:3000/api/fink/transfers`

## API Endpoints

### Pearl: Student Verification API

**Endpoint**: `POST /api/pearl/student-verifications`

Verifies whether a student is eligible for membership based on their person ID.

**Example Request (Success)**:
```bash
curl -X POST http://localhost:3000/api/pearl/student-verifications \
  -H "Content-Type: application/json" \
  -d '{
    "personId": "U2024001",
    "fullName": "Alice Johnson"
  }'
```

**Example Response (Success)**:
```json
{
  "personId": "U2024001",
  "verified": true,
  "reason": "Student ID accepted",
  "checkedAt": "2025-11-30T12:34:57Z",
  "role": "STUDENT"
}
```

**Example Request (Blocked Pattern - ends with "000")**:
```bash
curl -X POST http://localhost:3000/api/pearl/student-verifications \
  -H "Content-Type: application/json" \
  -d '{
    "personId": "U2024000"
  }'
```

**Example Response (Blocked)**:
```json
{
  "personId": "U2024000",
  "verified": false,
  "reason": "Student verification failed (blocked pattern)",
  "checkedAt": "2025-11-30T12:34:57Z",
  "role": "STUDENT"
}
```

### Pearl: Staff Verification API

**Endpoint**: `POST /api/pearl/staff-verifications`

Verifies whether a staff member is eligible for membership based on their person ID.

**Example Request (Success)**:
```bash
curl -X POST http://localhost:3000/api/pearl/staff-verifications \
  -H "Content-Type: application/json" \
  -d '{
    "personId": "S2024001",
    "fullName": "Bob Smith"
  }'
```

**Example Response (Success)**:
```json
{
  "personId": "S2024001",
  "verified": true,
  "reason": "Staff ID accepted",
  "checkedAt": "2025-11-30T12:34:57Z",
  "role": "STAFF"
}
```

**Example Request (Blocked Pattern - ends with "999")**:
```bash
curl -X POST http://localhost:3000/api/pearl/staff-verifications \
  -H "Content-Type: application/json" \
  -d '{
    "personId": "S2024999"
  }'
```

**Example Response (Blocked)**:
```json
{
  "personId": "S2024999",
  "verified": false,
  "reason": "Staff verification failed (blocked pattern)",
  "checkedAt": "2025-11-30T12:34:57Z",
  "role": "STAFF"
}
```

### Fink: Open Session API

**Endpoint**: `POST /api/fink/sessions`

Opens a session for a Fink account. Returns a session ID that encodes the expected transfer outcome.

**Example Request (Success)**:
```bash
curl -X POST http://localhost:3000/api/fink/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "finkAccountId": "FINK-U2024001",
    "currency": "USD"
  }'
```

**Example Response (Success)**:
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000::SUCCESS",
  "finkAccountId": "FINK-U2024001",
  "statusHint": "SUCCESS"
}
```

**Example Request (Blocked Account - ends with "999")**:
```bash
curl -X POST http://localhost:3000/api/fink/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "finkAccountId": "FINK-U2024999"
  }'
```

**Example Response (Blocked)**:
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440001::ACCOUNT_BLOCKED",
  "finkAccountId": "FINK-U2024999",
  "statusHint": "ACCOUNT_BLOCKED"
}
```

**Example Request (Empty Account ID)**:
```bash
curl -X POST http://localhost:3000/api/fink/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "finkAccountId": ""
  }'
```

**Example Response (Invalid Account)**:
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440002::INVALID_ACCOUNT",
  "finkAccountId": "",
  "statusHint": "INVALID_ACCOUNT"
}
```

### Fink: Transfer API

**Endpoint**: `POST /api/fink/transfers`

Transfers funds using a session ID obtained from the open session endpoint.

**Example Request (Success)**:
```bash
curl -X POST http://localhost:3000/api/fink/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "550e8400-e29b-41d4-a716-446655440000::SUCCESS",
    "amount": 200.0
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
    "sessionId": "550e8400-e29b-41d4-a716-446655440000::SUCCESS",
    "amount": 200.0
  }
}
```

**Example Request (Using Blocked Session)**:
```bash
curl -X POST http://localhost:3000/api/fink/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "550e8400-e29b-41d4-a716-446655440001::ACCOUNT_BLOCKED",
    "amount": 200.0
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
    "sessionId": "550e8400-e29b-41d4-a716-446655440001::ACCOUNT_BLOCKED",
    "amount": 200.0
  }
}
```

**Example Request (Invalid Session ID)**:
```bash
curl -X POST http://localhost:3000/api/fink/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "invalid-session-id",
    "amount": 200.0
  }'
```

**Example Response (Failed)**:
```json
{
  "status": "FAILED",
  "transactionId": null,
  "processedAt": "2025-11-30T12:35:10Z",
  "failureCode": "INVALID_SESSION",
  "failureReason": "Invalid or malformed session ID",
  "echo": {
    "sessionId": "invalid-session-id",
    "amount": 200.0
  }
}
```

## Business Logic

### Pearl Student Verification
- If `personId` is `null`, empty, or whitespace-only → `verified = false`
- If `personId` ends with `"000"` → `verified = false`
- Otherwise → `verified = true`

### Pearl Staff Verification
- If `personId` is `null`, empty, or whitespace-only → `verified = false`
- If `personId` ends with `"999"` → `verified = false`
- Otherwise → `verified = true`

### Fink Session Opening
- If `finkAccountId` is `null`, empty, or whitespace-only → session tagged as `INVALID_ACCOUNT`
- If `finkAccountId` ends with `"999"` → session tagged as `ACCOUNT_BLOCKED`
- Otherwise → session tagged as `SUCCESS`

### Fink Transfer
- Decodes the tag from `sessionId`:
  - Tag `SUCCESS` → `status = "SUCCESS"`
  - Tag `INVALID_ACCOUNT` → `status = "FAILED"`, `failureCode = "INVALID_ACCOUNT"`
  - Tag `ACCOUNT_BLOCKED` → `status = "FAILED"`, `failureCode = "ACCOUNT_BLOCKED"`
  - Unknown/malformed session ID → `status = "FAILED"`, `failureCode = "INVALID_SESSION"`

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
