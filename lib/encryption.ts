import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }

  const key = Buffer.from(encryptionKey, 'hex');

  if (key.length !== KEY_LENGTH) {
    throw new Error(`Encryption key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex characters)`);
  }

  return key;
}

/**
 * Encrypt platform credentials
 * Returns format: iv:authTag:encryptedData (all hex encoded)
 */
export function encryptCredentials(username: string, password: string): string {
  try {
    const key = getEncryptionKey();

    // Create initialization vector (IV)
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Prepare data
    const data = JSON.stringify({ username, password });

    // Encrypt
    let encrypted = cipher.update(data, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Return as hex strings joined by colons
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt credentials');
  }
}

/**
 * Decrypt credentials (for testing/verification)
 */
export function decryptCredentials(encryptedData: string): { username: string; password: string } {
  try {
    const key = getEncryptionKey();

    // Split the encrypted data
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;

    // Convert from hex
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    // Decrypt
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    // Parse JSON
    const credentials = JSON.parse(decrypted.toString('utf8'));

    return {
      username: credentials.username,
      password: credentials.password,
    };
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt credentials');
  }
}

/**
 * Generate a new encryption key
 * Use this to generate a key for .env.local
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}
