// NETHRION BOT 2.0 - Comprehensive Offline Smoke Test
const assert = require('assert');
const database = require('../src/core/database');
const ToolRegistry = require('../src/ai/toolRegistry');
const TargetResolver = require('../src/discord/targetResolver');
const PermissionEvaluator = require('../src/discord/permissions');
const minecraftService = require('../src/services/minecraftService');
const streakService = require('../src/services/streakService');
const linkBridgeService = require('../src/services/linkBridgeService');

async function runSmokeTests() {
  console.log('=== NETHRION 2.0 SMOKE TEST SUITE ===');

  // Test 1: Database load & migration
  console.log('Test 1: Database Initialization & Schema...');
  database.init();
  const smpConfig = database.get('smpConfig');
  assert.ok(smpConfig, 'smpConfig must exist');
  assert.strictEqual(smpConfig.javaHost, 'nethrionsmp.pixelforge.gg', 'Java host must match real SMP');
  console.log('  -> PASSED');

  // Test 2: TargetResolver similarity
  console.log('Test 2: Conservative Target Similarity...');
  const sim1 = TargetResolver.similarity('Moderator', 'moderator');
  assert.strictEqual(sim1, 1.0, 'Exact match must score 1.0');
  const sim2 = TargetResolver.similarity('Admin', 'Administrator');
  assert.ok(sim2 > 0.3, 'Substrings must have positive score');
  console.log('  -> PASSED');

  // Test 3: Tool Registry
  console.log('Test 3: Tool Registry & Gemini Declarations...');
  const tools = ToolRegistry.getTools();
  assert.ok(tools.length >= 10, 'Tool registry must have at least 10 core tools');
  const declarations = ToolRegistry.toGeminiDeclarations();
  assert.strictEqual(declarations.length, tools.length, 'Every tool must have Gemini declaration');
  console.log(`  -> PASSED (${tools.length} tools registered)`);

  // Test 4: Streak calculation
  console.log('Test 4: Community Streak Service...');
  const testUserId = 'test_user_999999999';
  const streakResult = streakService.recordActivity(testUserId);
  assert.ok(streakResult.currentStreak >= 1, 'Current streak should be at least 1');
  console.log('  -> PASSED');

  // Test 5: Minecraft Link Bridge
  console.log('Test 5: Minecraft Account Linking...');
  linkBridgeService.linkAccount('test_discord_user', 'Mindzard_Fan_1');
  const profile = linkBridgeService.getProfile('test_discord_user');
  assert.strictEqual(profile.linked, true, 'User should be linked');
  assert.strictEqual(profile.ign, 'Mindzard_Fan_1', 'IGN must match');
  console.log('  -> PASSED');

  console.log('====================================');
  console.log('ALL SMOKE TESTS PASSED SUCCESSFULLY!');
  console.log('====================================');
}

runSmokeTests().catch(err => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
