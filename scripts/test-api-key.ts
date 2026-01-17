/**
 * Quick test script to verify API key functionality
 * Run with: npx tsx scripts/test-api-key.ts
 */

import { Check } from '../packages/typescript-sdk/src';

const API_KEY = 'vfy_chec_cG_BnFh2mRYmbilGs9Eos3sNOEBAZEnz';
const BASE_URL = 'http://localhost:3001';

async function main() {
  console.log('Testing API key...\n');
  console.log(`API Key: ${API_KEY.substring(0, 20)}...`);
  console.log(`Base URL: ${BASE_URL}\n`);

  const client = new Check({
    apiKey: API_KEY,
    baseUrl: BASE_URL,
  });

  try {
    console.log('Sending verification request...');
    const result = await client.verifyAndWait({
      content: 'The Earth orbits the Sun at an average distance of about 93 million miles.',
      methods: { reasoning: 1.0 },
    });

    console.log('\n✅ Verification successful!\n');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\n❌ Verification failed:\n');
    console.error(error);
    process.exit(1);
  }
}

main();
