import { bcrypt, crypto } from '@/lib/client';

export const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.readAsText(file); // read as plain text to validate private key
        reader.onload = () => {
            const content = reader.result as string;

            if (!isValidPrivateKey(content)) {
                return reject(new Error("Invalid SSH private key file"));
            }

            // Convert to base64 if valid
            const base64Reader = new FileReader();
            base64Reader.readAsDataURL(file);
            base64Reader.onload = () => {
                const base64String = (base64Reader.result as string).split(",")[1];
                resolve(base64String);
            };
            base64Reader.onerror = reject;
        };

        reader.onerror = reject;
    });


// Helper: Decode base64 SSH key
export const decodeBase64SSHKey = (base64Key: string) => {
    const buffer = Buffer.from(base64Key, "base64");
    return buffer.toString("utf-8");
};

// Helper: Hash SSH key securely
export const hashSSHKey = async (sshKey: string) => {
    const saltRounds = 12; // Recommended salt rounds for bcrypt
    return await bcrypt.hash(sshKey, saltRounds);
};


const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes for AES-256
const IV_LENGTH = 16; // AES block size

// Encrypt SSH key using AES-256
export const encryptSSHKey = (sshKey: string): string => {
    const iv = crypto.randomBytes(IV_LENGTH);
    if (!ENCRYPTION_KEY) {
        throw new Error("ENCRYPTION_KEY is not defined");
    }
    const cipher = crypto.createCipheriv(
        "aes-256-cbc",
        Buffer.from(ENCRYPTION_KEY, "hex"),
        iv
    );

    let encrypted = cipher.update(sshKey);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
};


export const decryptSSHKey = (encryptedText: string): string => {
    if (!ENCRYPTION_KEY) {
      throw new Error("ENCRYPTION_KEY is not defined");
    }
  
    if (!encryptedText || !encryptedText.includes(":")) {
      throw new Error("Invalid encrypted SSH key format");
    }
  
    const [ivHex, encryptedHex] = encryptedText.split(":");
  
    if (!ivHex || !encryptedHex) {
      throw new Error("Malformed encrypted data");
    }
  
    const iv = Buffer.from(ivHex, "hex");
    const encryptedBuffer = Buffer.from(encryptedHex, "hex");
  
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(ENCRYPTION_KEY, "hex"),
      iv
    );
  
    let decrypted = decipher.update(encryptedBuffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
  
    return decrypted.toString();
  };
  
const isValidPrivateKey = (key: string): boolean => {
    const trimmed = key.trim();
    return (
        /^-----BEGIN (OPENSSH|RSA|DSA|EC) PRIVATE KEY-----/.test(trimmed) &&
        /-----END (OPENSSH|RSA|DSA|EC) PRIVATE KEY-----$/.test(trimmed)
    );
};
