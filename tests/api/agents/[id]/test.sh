#!/bin/bash

# Test script for the /api/ai-sdk/agents/[id] route
# This script tests the GET, PATCH, and DELETE operations for the agent route

# Base URL for API requests
BASE_URL="http://localhost:3000/api/ai-sdk/agents"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
  echo -e "${GREEN}$1${NC}"
}

print_error() {
  echo -e "${RED}$1${NC}"
}

print_warning() {
  echo -e "${YELLOW}$1${NC}"
}

# Create a test agent
create_test_agent() {
  echo "Creating test agent..."
  
  response=$(curl -s -X POST "$BASE_URL" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Test Agent",
      "description": "Agent for testing Upstash integration",
      "modelId": "gemini-2.0-flash",
      "systemPrompt": "You are a test agent",
      "toolIds": []
    }')
  
  # Extract agent ID from response
  agent_id=$(echo $response | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  
  if [ -z "$agent_id" ]; then
    print_error "Failed to create test agent"
    echo "Response: $response"
    exit 1
  fi
  
  print_success "Test agent created with ID: $agent_id"
  echo "$agent_id"
}

# Test GET operation
test_get_agent() {
  local agent_id=$1
  echo "Testing GET $BASE_URL/$agent_id..."
  
  response=$(curl -s -X GET "$BASE_URL/$agent_id")
  
  # Check if response contains the agent ID
  if echo "$response" | grep -q "$agent_id"; then
    print_success "GET test passed"
  else
    print_error "GET test failed"
    echo "Response: $response"
    exit 1
  fi
}

# Test PATCH operation
test_patch_agent() {
  local agent_id=$1
  echo "Testing PATCH $BASE_URL/$agent_id..."
  
  response=$(curl -s -X PATCH "$BASE_URL/$agent_id" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Updated Test Agent",
      "description": "Updated description"
    }')
  
  # Check if response contains the updated name
  if echo "$response" | grep -q "Updated Test Agent"; then
    print_success "PATCH test passed"
  else
    print_error "PATCH test failed"
    echo "Response: $response"
    exit 1
  fi
}

# Test DELETE operation
test_delete_agent() {
  local agent_id=$1
  echo "Testing DELETE $BASE_URL/$agent_id..."
  
  response=$(curl -s -X DELETE "$BASE_URL/$agent_id")
  
  # Check if response contains success: true
  if echo "$response" | grep -q '"success":true'; then
    print_success "DELETE test passed"
  else
    print_error "DELETE test failed"
    echo "Response: $response"
    exit 1
  fi
  
  # Verify agent no longer exists
  get_response=$(curl -s -X GET "$BASE_URL/$agent_id")
  if echo "$get_response" | grep -q "not found"; then
    print_success "Verified agent no longer exists"
  else
    print_warning "Warning: Agent may still exist after deletion"
    echo "Response: $get_response"
  fi
}

# Test with Upstash backend
test_with_upstash() {
  echo "Testing with Upstash backend..."
  export MEMORY_PROVIDER=upstash
  
  # Create a test agent
  agent_id=$(create_test_agent)
  
  # Test GET
  test_get_agent "$agent_id"
  
  # Test PATCH
  test_patch_agent "$agent_id"
  
  # Test DELETE
  test_delete_agent "$agent_id"
  
  print_success "All Upstash tests passed"
}

# Test with LibSQL backend
test_with_libsql() {
  echo "Testing with LibSQL backend..."
  export MEMORY_PROVIDER=libsql
  
  # Create a test agent
  agent_id=$(create_test_agent)
  
  # Test GET
  test_get_agent "$agent_id"
  
  # Test PATCH
  test_patch_agent "$agent_id"
  
  # Test DELETE
  test_delete_agent "$agent_id"
  
  print_success "All LibSQL tests passed"
}

# Run all tests
echo "Starting tests for /api/ai-sdk/agents/[id] route..."
test_with_upstash
test_with_libsql
print_success "All tests completed successfully"
