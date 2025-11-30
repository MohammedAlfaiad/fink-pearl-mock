## Pearl & Fink HTTP API Specification (Vercel)

This document defines the HTTP APIs for the **Pearl** (university verification) and **Fink** (payment) services, to be deployed on a **single Vercel project**.  
These APIs are intentionally different from the Java interfaces (`UniversityVerifier`, `PaymentService`) to justify the use of the **Adapter pattern** on the Java side.

---

## Overview

- **Base URL (example)**: `https://<your-vercel-project>.vercel.app`
- **Pearl endpoints**: under `/api/pearl/*`
- **Fink endpoints**: under `/api/fink/*`
- **Transport**: JSON over HTTPS
- **Auth**: none for now (can be extended later with API keys or headers)
- **Content-Type**: requests and responses use `application/json`

Common request headers:

- `Content-Type: application/json`
- `Accept: application/json`

---

## Pearl: University Verification API

### Purpose

The Pearl API verifies whether a student is eligible for membership based on their university ID and some contextual information.

In Java, we only have:

- `boolean UniversityVerifier.verifyUniversityStatus(String universityID);`

The HTTP API is intentionally richer and differently shaped so an **adapter** must:

- Build a structured JSON request from just a `universityID`.
- Interpret a JSON response (`verified`, `reason`, etc.) as a `boolean` return value.

### Endpoint: Create University Verification

- **Method**: `POST`
- **URL**: `/api/pearl/university-verifications`

#### Request Body

```json
{
  "student": {
    "universityId": "U2024001",
    "fullName": "Alice Johnson"
  },
  "context": {
    "requestedBySystem": "library-membership",
    "requestId": "c0b5a8e8-9f4f-4a12-b154-4b21f3a7a001",
    "requestedAt": "2025-11-30T12:34:56Z"
  }
}
```

- **Required fields**
  - `student.universityId` (string, non-empty)
- **Optional fields**
  - `student.fullName` (string)
  - `context.requestedBySystem` (string)
  - `context.requestId` (string, e.g. UUID for tracing)
  - `context.requestedAt` (ISO-8601 timestamp)

#### Response: 200 OK (Verification Performed)

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

- **Fields**
  - `universityId` (string): echo of the input ID.
  - `verified` (boolean): whether the student is considered eligible.
  - `reason` (string): human-readable explanation.
  - `checkedAt` (string): ISO-8601 timestamp when the check was performed.
  - `metadata` (object): optional extra diagnostic information.

#### Business Logic (for current mock implementation)

To preserve the behavior of the existing Java `Pearl` mock:

- If `student.universityId` is `null`, empty, or whitespace-only → `verified = false`, `reason = "Invalid or empty university ID"`.
- If `student.universityId` ends with `"000"` → `verified = false`, `reason = "University verification failed (blocked pattern)"`.
- Otherwise → `verified = true`, `reason = "University ID accepted"`.

The Java **adapter** for `UniversityVerifier` will:

- Accept only a `String universityID`.
- Construct a JSON body with:
  - `student.universityId = universityID`
  - Reasonable defaults for other fields (`fullName = null`, `context` auto-filled).
- Call `POST /api/pearl/university-verifications`.
- Return the `verified` field as the method result (`true`/`false`).
- Treat any HTTP/network error as a verification failure (`false`).

#### Error Responses

- **400 Bad Request**

  - Returned when the JSON body is malformed or missing required fields (e.g. no `student.universityId`).

  ```json
  {
    "error": "BadRequest",
    "message": "student.universityId is required",
    "details": null
  }
  ```

- **500 Internal Server Error**

  - Unexpected error while processing the request.

  ```json
  {
    "error": "InternalError",
    "message": "An unexpected error occurred",
    "details": null
  }
  ```

The adapter will treat any non-2xx status as `verified = false`.

---

## Fink: Payment Transfer API

### Purpose

The Fink API simulates transferring funds from a student account to the library deposit account.

In Java, we only have:

- `boolean PaymentService.transferFunds(String accountID, double amount);`

The HTTP API exposes a more complex structure. The **adapter** must:

- Wrap `(accountID, amount)` into nested objects (sourceAccount + transaction).
- Interpret a structured response (`status`, `failureReason`) as a `boolean`.

### Endpoint: Create Transfer

- **Method**: `POST`
- **URL**: `/api/fink/transfers`

#### Request Body

```json
{
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
}
```

- **Required fields**
  - `sourceAccount.id` (string, non-empty).
  - `transaction.amount` (number, can be positive, zero, or negative for the purposes of this mock).
- **Optional fields**
  - `sourceAccount.type` (string, e.g. `"STUDENT_DEPOSIT"`).
  - `transaction.currency` (string, default `"USD"` if omitted).
  - `transaction.description` (string).
  - `idempotencyKey` (string, recommended, e.g. UUID).

#### Response: 200 OK (Transfer Attempted)

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

- **Fields**
  - `status` (string):
    - `"SUCCESS"`: transfer accepted.
    - `"FAILED"`: transfer rejected for a business reason.
  - `transactionId` (string): synthetic ID for the mock transaction (may be `null` on failure).
  - `processedAt` (string): ISO-8601 timestamp when the transfer was processed.
  - `failureCode` (string or null): machine-readable reason on failure (e.g. `"ACCOUNT_BLOCKED"`).
  - `failureReason` (string or null): human-readable explanation on failure.
  - `echo` (object): echoes key input values.

#### Business Logic (for current mock implementation)

To preserve the behavior of the existing Java `Fink` mock:

- If `sourceAccount.id` is `null`, empty, or whitespace-only:
  - `status = "FAILED"`
  - `failureCode = "INVALID_ACCOUNT"`
  - `failureReason = "Account ID is missing or empty"`
- If `sourceAccount.id` ends with `"999"`:
  - `status = "FAILED"`
  - `failureCode = "ACCOUNT_BLOCKED"`
  - `failureReason = "Transfers from this account are blocked"`
- Otherwise:
  - `status = "SUCCESS"`
  - `failureCode = null`
  - `failureReason = null`

`transaction.amount` may be any numeric value for the mock; additional validation (e.g. non-negative) can be added later if needed.

The Java **adapter** for `PaymentService` will:

- Accept `(String accountID, double amount)`.
- Construct a JSON body:
  - `sourceAccount.id = accountID`
  - `sourceAccount.type = "STUDENT_DEPOSIT"`
  - `transaction.amount = amount`
  - `transaction.currency = "USD"`
  - `transaction.description = "Library membership deposit"` (or similar)
  - `idempotencyKey = UUID.randomUUID().toString()`
- Call `POST /api/fink/transfers`.
- Return `true` if `status == "SUCCESS"`, otherwise `false`.
- Treat any HTTP/network error as a failed transfer (`false`).

#### Error Responses

- **400 Bad Request**

  - Returned when the JSON body is malformed or missing required fields (e.g. no `sourceAccount.id`).

  ```json
  {
    "error": "BadRequest",
    "message": "sourceAccount.id is required",
    "details": null
  }
  ```

- **500 Internal Server Error**

  - Unexpected error while processing the request.

  ```json
  {
    "error": "InternalError",
    "message": "An unexpected error occurred",
    "details": null
  }
  ```

Any non-2xx status will be interpreted by the adapter as `status = "FAILED"` → `false` return value in Java.

---

## Summary of Java ↔ HTTP Mapping for Adapters

- **Pearl (UniversityVerifier)**
  - Java: `boolean verifyUniversityStatus(String universityID)`
  - HTTP:
    - `POST /api/pearl/university-verifications`
    - Request: embeds `universityID` as `student.universityId` plus optional context.
    - Response: `verified` (boolean) + `reason`, `metadata`.
  - Adapter responsibility: translate `String` → JSON, and `verified` → `boolean`.

- **Fink (PaymentService)**
  - Java: `boolean transferFunds(String accountID, double amount)`
  - HTTP:
    - `POST /api/fink/transfers`
    - Request: wraps `accountID` and `amount` into `sourceAccount` and `transaction`.
    - Response: `status` (`"SUCCESS"` / `"FAILED"`) + `failureCode`, `failureReason`.
  - Adapter responsibility: translate parameters → JSON, and `status` → `boolean`.

This API design ensures:

- The **Vercel services** are realistic HTTP services with structured JSON.
- The **Java side** must use textbook **Adapter pattern**:
  - Separate **service classes** that make HTTP calls.
  - Separate **adapter classes** that implement the Java interfaces and delegate to those services while reshaping parameters and responses.


