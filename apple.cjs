const crypto = require('crypto');
const fs = require('fs');

// --- CONFIGURATION ---
const teamId = 'NWGUYF42KW';
const keyId = 'THHMJ3J4LD';
const clientId = 'com.apexomnihub.web.login';
const keyFileName = 'AuthKey_THHMJ3J4LD.p8'; 

try {
  // Look for the key file in the same folder
  const privateKey = fs.readFileSync('./' + keyFileName, 'utf8');
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (86400 * 180); // 180 days

  const header = { alg: 'ES256', kid: keyId };
  const payload = { 
    iss: teamId, 
    iat: now, 
    exp: exp, 
    aud: 'https://appleid.apple.com', 
    sub: clientId 
  };

  const headerEnc = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadEnc = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const content = `${headerEnc}.${payloadEnc}`;

  const signature = crypto.sign(null, Buffer.from(content), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363'
  }).toString('base64url');

  console.log('\n✅ SUCCESS! COPY THIS TOKEN:\n');
  console.log(`${content}.${signature}`);

} catch (e) {
  console.error("\n❌ ERROR: I can't find the key file!");
  console.error(`Please make sure '${keyFileName}' is in the same folder as this script.`);
}