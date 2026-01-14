const axios = require('axios');
const qs = require('querystring');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function generateZohoToken() {
  console.log('🔧 Generating Zoho Refresh Token\n');

  // Ask for credentials
  const clientId = await askQuestion('Enter your ZOHO_CLIENT_ID: ');
  const clientSecret = await askQuestion('Enter your ZOHO_CLIENT_SECRET: ');
  const redirectUri =
    (await askQuestion(
      'Enter Redirect URI (default: http://localhost:3000): '
    )) || 'http://localhost:3000';

  console.log('\n📋 Step 1: Generate Authorization Code');
  console.log('======================================');
  console.log(`1. Open this URL in your browser:`);
  console.log(
    `\nhttps://accounts.zoho.com/oauth/v2/auth?scope=ZohoMeeting.meetings.CREATE,ZohoMeeting.meetings.READ,ZohoMeeting.meetings.UPDATE,ZohoMeeting.meetings.DELETE,ZohoMeeting.meetings.INVITE&client_id=${clientId}&response_type=code&access_type=offline&redirect_uri=${redirectUri}`
  );

  console.log('\n2. After authorization, you will be redirected to:');
  console.log(`${redirectUri}/?code=AUTHORIZATION_CODE_HERE`);

  const authCode = await askQuestion(
    '\n3. Paste the AUTHORIZATION_CODE from URL: '
  );

  console.log('\n📋 Step 2: Exchange Code for Tokens');
  console.log('====================================');

  try {
    const response = await axios.post(
      'https://accounts.zoho.com/oauth/v2/token',
      qs.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: authCode,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    console.log('\n✅ SUCCESS! Tokens generated:\n');
    console.log('Access Token:', response.data.access_token);
    console.log('Refresh Token:', response.data.refresh_token);
    console.log('Expires In:', response.data.expires_in, 'seconds');

    console.log('\n🎯 Add to your .env file:');
    console.log(`ZOHO_CLIENT_ID=${clientId}`);
    console.log(`ZOHO_CLIENT_SECRET=${clientSecret}`);
    console.log(`ZOHO_REFRESH_TOKEN=${response.data.refresh_token}`);
    console.log(`ZOHO_EMAIL=admin@abinstitute.co.in`);

    console.log('\n🔧 Test the token with:');
    console.log('node scripts/test-zoho.js');
  } catch (error) {
    console.error(
      '\n❌ Error generating tokens:',
      error.response?.data || error.message
    );
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if client_id and client_secret are correct');
    console.log('2. Make sure redirect_uri matches exactly');
    console.log('3. Authorization code expires in 1 minute - generate fresh');
    console.log('4. Ensure Zoho account has Meeting API access');
  }

  rl.close();
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

// Run if called directly
if (require.main === module) {
  generateZohoToken();
}
