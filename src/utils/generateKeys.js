import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate EC key pair for Tesla Fleet API registration
 * Using secp256r1 (prime256v1) curve as required by Tesla
 */
export function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  return { publicKey, privateKey };
}

/**
 * Save keys to files
 */
export function saveKeys(publicKey, privateKey) {
  const keysDir = path.join(__dirname, '../../keys');
  
  // Create keys directory if it doesn't exist
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }

  const publicKeyPath = path.join(keysDir, 'public-key.pem');
  const privateKeyPath = path.join(keysDir, 'private-key.pem');

  fs.writeFileSync(publicKeyPath, publicKey);
  fs.writeFileSync(privateKeyPath, privateKey);

  console.log('✅ Keys saved to:', keysDir);
  return { publicKeyPath, privateKeyPath };
}

/**
 * Load existing keys or generate new ones
 */
export function getOrCreateKeys() {
  const keysDir = path.join(__dirname, '../../keys');
  const publicKeyPath = path.join(keysDir, 'public-key.pem');
  const privateKeyPath = path.join(keysDir, 'private-key.pem');

  // Check if keys exist
  if (fs.existsSync(publicKeyPath) && fs.existsSync(privateKeyPath)) {
    console.log('📋 Using existing keys');
    return {
      publicKey: fs.readFileSync(publicKeyPath, 'utf8'),
      privateKey: fs.readFileSync(privateKeyPath, 'utf8'),
      publicKeyPath,
      privateKeyPath,
    };
  }

  // Generate new keys
  console.log('🔐 Generating new EC key pair...');
  const { publicKey, privateKey } = generateKeyPair();
  const paths = saveKeys(publicKey, privateKey);

  return {
    publicKey,
    privateKey,
    ...paths,
  };
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🔐 Generating Tesla Fleet API Keys...\n');
  const { publicKey, publicKeyPath, privateKeyPath } = getOrCreateKeys();
  console.log('\n✅ Keys generated successfully!');
  console.log('📁 Public key:', publicKeyPath);
  console.log('📁 Private key:', privateKeyPath);
  console.log('\n📋 Public key content:');
  console.log(publicKey);
  console.log('\n⚠️  Keep private key secure! Never commit to git!');
}
