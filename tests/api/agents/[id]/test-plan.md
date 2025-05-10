# Test Plan for `/api/ai-sdk/agents/[id]` Route

This document outlines the test plan for verifying the Upstash integration in the `/api/ai-sdk/agents/[id]` route.

## Test Environment Setup

1. Ensure the development server is running:
   ```bash
   pnpm dev
   ```

2. Set up environment variables for testing:
   - For Upstash testing: `MEMORY_PROVIDER=upstash`
   - For LibSQL testing: `MEMORY_PROVIDER=libsql`

## Test Cases

### 1. GET Operation

#### Test Case 1.1: Get Agent with Valid ID
- **Description**: Retrieve an agent using a valid ID
- **Expected Result**: 200 OK with agent details
- **Verification**: Agent details match expected values

#### Test Case 1.2: Get Agent with Invalid ID
- **Description**: Attempt to retrieve an agent using an invalid ID
- **Expected Result**: 400 Bad Request with validation error
- **Verification**: Error message indicates invalid ID format

#### Test Case 1.3: Get Non-existent Agent
- **Description**: Attempt to retrieve an agent that doesn't exist
- **Expected Result**: 404 Not Found
- **Verification**: Error message indicates agent not found

### 2. PATCH Operation

#### Test Case 2.1: Update Agent with Valid Data
- **Description**: Update an agent with valid data
- **Expected Result**: 200 OK with updated agent details
- **Verification**: Agent details reflect the updates

#### Test Case 2.2: Update Agent with Invalid ID
- **Description**: Attempt to update an agent using an invalid ID
- **Expected Result**: 400 Bad Request with validation error
- **Verification**: Error message indicates invalid ID format

#### Test Case 2.3: Update Non-existent Agent
- **Description**: Attempt to update an agent that doesn't exist
- **Expected Result**: 404 Not Found
- **Verification**: Error message indicates agent not found

#### Test Case 2.4: Update Agent with Invalid Data
- **Description**: Attempt to update an agent with invalid data
- **Expected Result**: 400 Bad Request with validation error
- **Verification**: Error message indicates invalid data format

### 3. DELETE Operation

#### Test Case 3.1: Delete Agent with Valid ID
- **Description**: Delete an agent using a valid ID
- **Expected Result**: 200 OK with success message
- **Verification**: Agent no longer exists when attempting to retrieve it

#### Test Case 3.2: Delete Agent with Invalid ID
- **Description**: Attempt to delete an agent using an invalid ID
- **Expected Result**: 400 Bad Request with validation error
- **Verification**: Error message indicates invalid ID format

#### Test Case 3.3: Delete Non-existent Agent
- **Description**: Attempt to delete an agent that doesn't exist
- **Expected Result**: 404 Not Found
- **Verification**: Error message indicates agent not found

### 4. Error Handling

#### Test Case 4.1: Upstash Adapter Error
- **Description**: Simulate an Upstash adapter error
- **Expected Result**: 500 Internal Server Error with specific error details
- **Verification**: Error response includes error code and message

#### Test Case 4.2: Redis Store Error
- **Description**: Simulate a Redis store error
- **Expected Result**: 500 Internal Server Error with specific error details
- **Verification**: Error response includes error code and message

#### Test Case 4.3: Connection Error
- **Description**: Simulate a connection error
- **Expected Result**: 503 Service Unavailable with specific error details
- **Verification**: Error response includes error code and message

#### Test Case 4.4: Timeout Error
- **Description**: Simulate a timeout error
- **Expected Result**: 504 Gateway Timeout with specific error details
- **Verification**: Error response includes error code and message

## Test Execution

### Automated Testing

Run the automated test script:
```bash
node tests/api/agents/[id]/test.js
```

### Manual Testing

Run the shell script for manual testing:
```bash
bash tests/api/agents/[id]/test.sh
```

## Test Results

Document test results here:

| Test Case | Upstash Result | LibSQL Result | Notes |
|-----------|----------------|---------------|-------|
| 1.1       | ✅ Pass        | ✅ Pass       |       |
| 1.2       | ✅ Pass        | ✅ Pass       |       |
| 1.3       | ✅ Pass        | ✅ Pass       |       |
| 2.1       | ✅ Pass        | ✅ Pass       |       |
| 2.2       | ✅ Pass        | ✅ Pass       |       |
| 2.3       | ✅ Pass        | ✅ Pass       |       |
| 2.4       | ✅ Pass        | ✅ Pass       |       |
| 3.1       | ✅ Pass        | ✅ Pass       |       |
| 3.2       | ✅ Pass        | ✅ Pass       |       |
| 3.3       | ✅ Pass        | ✅ Pass       |       |
| 4.1       | ✅ Pass        | N/A           |       |
| 4.2       | ✅ Pass        | N/A           |       |
| 4.3       | ✅ Pass        | N/A           |       |
| 4.4       | ✅ Pass        | N/A           |       |
