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

The Pearl API verifies whether a person (student or staff) is eligible for membership based on their person ID.

In Java, we only have:

- `boolean UniversityVerifier.verifyUniversityStatus(String universityID);`

The HTTP API is intentionally richer and differently shaped so an **adapter** must:

- Build a structured JSON request from just a `universityID`.
- Choose the appropriate endpoint (student or staff).
- Interpret a JSON response (`verified`, `reason`, etc.) as a `boolean` return value.

### Endpoint: Student Verification

- **Method**: `POST`
- **URL**: `/api/pearl/student-verifications`

#### Request Body

```json
{
  "personId": "U2024001",
  "fullName": "Alice Johnson"
}
```

- **Required fields**
  - `personId` (string, non-empty)
- **Optional fields**
  - `fullName` (string)

#### Response: 200 OK (Verification Performed)

```json
{
  "personId": "U2024001",
  "verified": true,
  "reason": "Student ID accepted",
  "checkedAt": "2025-11-30T12:34:57Z",
  "role": "STUDENT"
}
```

- **Fields**
  - `personId` (string): echo of the input ID.
  - `verified` (boolean): whether the student is considered eligible.
  - `reason` (string): human-readable explanation.
  - `checkedAt` (string): ISO-8601 timestamp when the check was performed.
  - `role` (string): always `"STUDENT"` for this endpoint.

#### Business Logic (for current mock implementation)

- If `personId` is `null`, empty, or whitespace-only → `verified = false`, `reason = "Invalid or empty person ID"`.
- If `personId` ends with `"000"` → `verified = false`, `reason = "Student verification failed (blocked pattern)"`.
- Otherwise → `verified = true`, `reason = "Student ID accepted"`.

#### Error Responses

- **400 Bad Request**

  - Returned when the JSON body is malformed or missing required fields (e.g. no `personId`).

  ```json
  {
    "error": "BadRequest",
    "message": "personId is required",
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

---

### Endpoint: Staff Verification

- **Method**: `POST`
- **URL**: `/api/pearl/staff-verifications`

#### Request Body

```json
{
  "personId": "S2024001",
  "fullName": "Bob Smith"
}
```

- **Required fields**
  - `personId` (string, non-empty)
- **Optional fields**
  - `fullName` (string)

#### Response: 200 OK (Verification Performed)

```json
{
  "personId": "S2024001",
  "verified": true,
  "reason": "Staff ID accepted",
  "checkedAt": "2025-11-30T12:34:57Z",
  "role": "STAFF"
}
```

- **Fields**
  - `personId` (string): echo of the input ID.
  - `verified` (boolean): whether the staff member is considered eligible.
  - `reason` (string): human-readable explanation.
  - `checkedAt` (string): ISO-8601 timestamp when the check was performed.
  - `role` (string): always `"STAFF"` for this endpoint.

#### Business Logic (for current mock implementation)

- If `personId` is `null`, empty, or whitespace-only → `verified = false`, `reason = "Invalid or empty person ID"`.
- If `personId` ends with `"999"` → `verified = false`, `reason = "Staff verification failed (blocked pattern)"`.
- Otherwise → `verified = true`, `reason = "Staff ID accepted"`.

#### Error Responses

- **400 Bad Request**

  - Returned when the JSON body is malformed or missing required fields (e.g. no `personId`).

  ```json
  {
    "error": "BadRequest",
    "message": "personId is required",
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

The Fink API simulates transferring funds using a session-based approach. First, a session must be opened with a Fink account ID, which returns a session ID. Then, transfers are made using that session ID.

In Java, we only have:

- `boolean PaymentService.transferFunds(String accountID, double amount);`

The HTTP API exposes a more complex structure. The **adapter** must:

- Open a session with the `accountID`.
- Use the returned `sessionId` for the transfer.
- Interpret a structured response (`status`, `failureReason`) as a `boolean`.

### Endpoint: Open Session

- **Method**: `POST`
- **URL**: `/api/fink/sessions`

#### Request Body

```json
{
  "finkAccountId": "FINK-U2024001",
  "currency": "USD",
  "description": "Library membership deposit"
}
```

- **Required fields**
  - `finkAccountId` (string, non-empty)
- **Optional fields**
  - `currency` (string, default `"USD"` if omitted)
  - `description` (string)

#### Response: 200 OK (Session Opened)

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000::SUCCESS",
  "finkAccountId": "FINK-U2024001",
  "statusHint": "SUCCESS"
}
```

- **Fields**
  - `sessionId` (string): a UUID with an encoded tag suffix (format: `<uuid>::<tag>`). The tag indicates the expected transfer outcome: `SUCCESS`, `INVALID_ACCOUNT`, or `ACCOUNT_BLOCKED`.
  - `finkAccountId` (string): echo of the input account ID.
  - `statusHint` (string): the tag encoded in the session ID, indicating the expected transfer result.

#### Business Logic (for current mock implementation)

- If `finkAccountId` is `null`, empty, or whitespace-only → session ID tagged as `INVALID_ACCOUNT`.
- If `finkAccountId` ends with `"999"` → session ID tagged as `ACCOUNT_BLOCKED`.
- Otherwise → session ID tagged as `SUCCESS`.

**Note**: This is a mock implementation. No actual session persistence occurs. The session ID format encodes the expected outcome, and the transfer endpoint decodes it to determine the result.

#### Error Responses

- **400 Bad Request**

  - Returned when the JSON body is malformed or missing required fields (e.g. no `finkAccountId`).

  ```json
  {
    "error": "BadRequest",
    "message": "finkAccountId is required",
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

---

### Endpoint: Create Transfer

- **Method**: `POST`
- **URL**: `/api/fink/transfers`

#### Request Body

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000::SUCCESS",
  "amount": 200.0
}
```

- **Required fields**
  - `sessionId` (string): the session ID returned from the open session endpoint.
  - `amount` (number, can be positive, zero, or negative for the purposes of this mock).

#### Response: 200 OK (Transfer Attempted)

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

- **Fields**
  - `status` (string):
    - `"SUCCESS"`: transfer accepted.
    - `"FAILED"`: transfer rejected for a business reason.
  - `transactionId` (string): synthetic ID for the mock transaction (may be `null` on failure).
  - `processedAt` (string): ISO-8601 timestamp when the transfer was processed.
  - `failureCode` (string or null): machine-readable reason on failure (e.g. `"ACCOUNT_BLOCKED"`, `"INVALID_SESSION"`).
  - `failureReason` (string or null): human-readable explanation on failure.
  - `echo` (object): echoes key input values.

#### Business Logic (for current mock implementation)

The transfer endpoint decodes the tag from the `sessionId`:

- If session ID tag is `SUCCESS`:
  - `status = "SUCCESS"`
  - `transactionId` = generated synthetic ID
  - `failureCode = null`
  - `failureReason = null`
- If session ID tag is `INVALID_ACCOUNT`:
  - `status = "FAILED"`
  - `failureCode = "INVALID_ACCOUNT"`
  - `failureReason = "Account ID is missing or empty"`
  - `transactionId = null`
- If session ID tag is `ACCOUNT_BLOCKED`:
  - `status = "FAILED"`
  - `failureCode = "ACCOUNT_BLOCKED"`
  - `failureReason = "Transfers from this account are blocked"`
  - `transactionId = null`
- If session ID is malformed or has an unknown tag:
  - `status = "FAILED"`
  - `failureCode = "INVALID_SESSION"`
  - `failureReason = "Invalid or malformed session ID"`
  - `transactionId = null`

`amount` may be any numeric value for the mock; additional validation (e.g. non-negative) can be added later if needed.

The Java **adapter** for `PaymentService` will:

- Accept `(String accountID, double amount)`.
- Call `POST /api/fink/sessions` with `finkAccountId = accountID`.
- Extract `sessionId` from the response.
- Call `POST /api/fink/transfers` with `sessionId` and `amount`.
- Return `true` if `status == "SUCCESS"`, otherwise `false`.
- Treat any HTTP/network error as a failed transfer (`false`).

#### Error Responses

- **400 Bad Request**

  - Returned when the JSON body is malformed or missing required fields (e.g. no `sessionId` or `amount`).

  ```json
  {
    "error": "BadRequest",
    "message": "sessionId is required",
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
    - `POST /api/pearl/student-verifications` or `POST /api/pearl/staff-verifications`
    - Request: embeds `universityID` as `personId` plus optional `fullName`.
    - Response: `verified` (boolean) + `reason`, `role`, `checkedAt`.
  - Adapter responsibility: translate `String` → JSON, choose appropriate endpoint, and `verified` → `boolean`.

- **Fink (PaymentService)**
  - Java: `boolean transferFunds(String accountID, double amount)`
  - HTTP:
    - Step 1: `POST /api/fink/sessions` with `finkAccountId = accountID` → get `sessionId`.
    - Step 2: `POST /api/fink/transfers` with `sessionId` and `amount`.
    - Response: `status` (`"SUCCESS"` / `"FAILED"`) + `failureCode`, `failureReason`.
  - Adapter responsibility: orchestrate session opening and transfer, translate parameters → JSON, and `status` → `boolean`.

This API design ensures:

- The **Vercel services** are realistic HTTP services with structured JSON.
- The **Java side** must use textbook **Adapter pattern**:
  - Separate **service classes** that make HTTP calls.
  - Separate **adapter classes** that implement the Java interfaces and delegate to those services while reshaping parameters and responses.
