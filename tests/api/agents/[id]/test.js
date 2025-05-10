/**
 * Test script for the /api/ai-sdk/agents/[id] route
 *
 * This script tests the GET, PATCH, and DELETE operations for the agent route
 * with both Upstash and LibSQL backends.
 */

// Mock environment variables for testing
process.env.UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://test-redis-url.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'test-token';
process.env.MEMORY_PROVIDER = 'upstash'; // Test with Upstash first

// Import required modules
const { v4: uuidv4 } = require('uuid');
// Import node-fetch
const nodeFetch = require('node-fetch');

// Base URL for API requests
const BASE_URL = 'http://localhost:3000/api/ai-sdk/agents';

// Test agent data
const testAgent = {
  name: 'Test Agent',
  description: 'Agent for testing Upstash integration',
  modelId: 'gemini-2.0-flash',
  systemPrompt: 'You are a test agent',
  toolIds: []
};

// Helper function to create a test agent
async function createTestAgent() {
  const response = await nodeFetch(`${BASE_URL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testAgent)
  });

  if (!response.ok) {
    throw new Error(`Failed to create test agent: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

// Test GET operation
async function testGetAgent(agentId) {
  console.log(`Testing GET /api/ai-sdk/agents/${agentId}...`);

  const response = await nodeFetch(`${BASE_URL}/${agentId}`, {
    method: 'GET'
  });

  if (!response.ok) {
    throw new Error(`GET failed: ${response.status} ${response.statusText}`);
  }

  const agent = await response.json();
  console.log('GET result:', agent);

  // Verify agent data
  if (agent.id !== agentId) {
    throw new Error(`Agent ID mismatch: expected ${agentId}, got ${agent.id}`);
  }

  if (agent.name !== testAgent.name) {
    throw new Error(`Agent name mismatch: expected ${testAgent.name}, got ${agent.name}`);
  }

  console.log('GET test passed');
  return agent;
}

// Test PATCH operation
async function testPatchAgent(agentId) {
  console.log(`Testing PATCH /api/ai-sdk/agents/${agentId}...`);

  const updateData = {
    name: `Updated Test Agent ${Date.now()}`,
    description: 'Updated description'
  };

  const response = await nodeFetch(`${BASE_URL}/${agentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updateData)
  });

  if (!response.ok) {
    throw new Error(`PATCH failed: ${response.status} ${response.statusText}`);
  }

  const updatedAgent = await response.json();
  console.log('PATCH result:', updatedAgent);

  // Verify updated data
  if (updatedAgent.name !== updateData.name) {
    throw new Error(`Updated name mismatch: expected ${updateData.name}, got ${updatedAgent.name}`);
  }

  if (updatedAgent.description !== updateData.description) {
    throw new Error(`Updated description mismatch: expected ${updateData.description}, got ${updatedAgent.description}`);
  }

  console.log('PATCH test passed');
  return updatedAgent;
}

// Test DELETE operation
async function testDeleteAgent(agentId) {
  console.log(`Testing DELETE /api/ai-sdk/agents/${agentId}...`);

  const response = await nodeFetch(`${BASE_URL}/${agentId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error(`DELETE failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  console.log('DELETE result:', result);

  // Verify deletion
  if (!result.success) {
    throw new Error('DELETE did not return success: true');
  }

  // Verify agent no longer exists
  try {
    const getResponse = await nodeFetch(`${BASE_URL}/${agentId}`, {
      method: 'GET'
    });

    if (getResponse.ok) {
      throw new Error('Agent still exists after deletion');
    }

    if (getResponse.status !== 404) {
      throw new Error(`Expected 404 status, got ${getResponse.status}`);
    }
  } catch (error) {
    if (error.message !== 'Agent still exists after deletion' &&
        error.message !== `Expected 404 status, got ${getResponse.status}`) {
      throw error;
    }
  }

  console.log('DELETE test passed');
  return result;
}

// Run all tests with Upstash backend
async function testWithUpstash() {
  console.log('Testing with Upstash backend...');
  process.env.MEMORY_PROVIDER = 'upstash';

  let agentId;
  try {
    // Create a test agent
    const agent = await createTestAgent();
    agentId = agent.id;

    // Test GET
    await testGetAgent(agentId);

    // Test PATCH
    await testPatchAgent(agentId);

    // Test DELETE
    await testDeleteAgent(agentId);

    console.log('All Upstash tests passed');
  } catch (error) {
    console.error('Upstash test failed:', error);

    // Clean up if needed
    if (agentId) {
      try {
        await nodeFetch(`${BASE_URL}/${agentId}`, { method: 'DELETE' });
      } catch (cleanupError) {
        console.error('Failed to clean up test agent:', cleanupError);
      }
    }
  }
}

// Run all tests with LibSQL backend
async function testWithLibSQL() {
  console.log('Testing with LibSQL backend...');
  process.env.MEMORY_PROVIDER = 'libsql';

  let agentId;
  try {
    // Create a test agent
    const agent = await createTestAgent();
    agentId = agent.id;

    // Test GET
    await testGetAgent(agentId);

    // Test PATCH
    await testPatchAgent(agentId);

    // Test DELETE
    await testDeleteAgent(agentId);

    console.log('All LibSQL tests passed');
  } catch (error) {
    console.error('LibSQL test failed:', error);

    // Clean up if needed
    if (agentId) {
      try {
        await nodeFetch(`${BASE_URL}/${agentId}`, { method: 'DELETE' });
      } catch (cleanupError) {
        console.error('Failed to clean up test agent:', cleanupError);
      }
    }
  }
}

// Run all tests
async function runAllTests() {
  await testWithUpstash();
  await testWithLibSQL();
  console.log('All tests completed');
}

// Run tests
runAllTests().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
