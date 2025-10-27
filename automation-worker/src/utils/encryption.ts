import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits

/**
 * Decrypt credentials stored in the database
 * Format: iv:authTag:encryptedData (all hex encoded)
 */
export function decryptCredentials(encryptedData: string): { username: string; password: string } {
  try {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY not configured');
    }

    // Convert encryption key to buffer
    const key = Buffer.from(encryptionKey, 'hex');

    if (key.length !== KEY_LENGTH) {
      throw new Error(`Encryption key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex characters)`);
    }

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
 * Validate that credentials can be decrypted
 */
export function validateEncryptedCredentials(encryptedData: string): boolean {
  try {
    decryptCredentials(encryptedData);
    return true;
  } catch {
    return false;
  }
}
