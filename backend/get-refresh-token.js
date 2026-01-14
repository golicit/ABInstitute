// get-refresh-token.js
const { google } = require('googleapis');
const readline = require('readline');

// Use your EXISTING credentials from .env
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID, // Your existing client ID
  process.env.GOOGLE_CLIENT_SECRET, // Your existing client secret
  'http://localhost:3000/auth/google/callback' // Same as your app
);

// Generate URL
const scopes = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent', // THIS IS CRITICAL - forces refresh token
});

console.log('🔗 Open this URL in your browser:');
console.log(authUrl);
console.log('\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Paste the code from the URL here: ', (code) => {
  rl.close();

  oauth2Client.getToken(code, (err, tokens) => {
    if (err) {
      console.error('Error getting tokens:', err);
      return;
    }

    console.log('\n✅ SUCCESS! Add this to your .env file:');
    console.log('========================================');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('========================================');
    console.log('\n📝 This token never expires (unless revoked)');
  });
});
