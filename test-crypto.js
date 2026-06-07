const { subtle } = require('crypto').webcrypto;

async function run() {
  const password = "password123";
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  
  // Create
  const salt = require('crypto').webcrypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const hashBuffer = await subtle.deriveBits(
    { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const saltArray = Array.from(salt);
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const saltHex = saltArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const passwordHash = `${saltHex}:${hashHex}`;
  console.log("Generated:", passwordHash);
  
  // Verify
  const [sHex, hHex] = passwordHash.split(':');
  const saltMatch = sHex.match(/.{1,2}/g);
  const vSalt = new Uint8Array(saltMatch.map(byte => parseInt(byte, 16)));
  
  const vKeyMaterial = await subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const vHashBuffer = await subtle.deriveBits(
    { name: 'PBKDF2', salt: vSalt, iterations: 100000, hash: 'SHA-256' },
    vKeyMaterial,
    256
  );
  
  const vHashArray = Array.from(new Uint8Array(vHashBuffer));
  const vHashHex = vHashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  console.log("Verified: ", vHashHex);
  console.log("Match: ", hHex === vHashHex);
}

run().catch(console.error);
