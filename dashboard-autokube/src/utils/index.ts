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


const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "my_secure_encryption_key_32b"; // Must be 32 bytes for AES-256
const IV_LENGTH = 16; // AES block size

// Encrypt SSH key using AES-256
export const encryptSSHKey = (sshKey: string): string => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(sshKey);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex"); // Store IV + encrypted data
};

// Decrypt SSH key (for retrieval if needed)
export const decryptSSHKey = (encryptedText: string): string => {
    const textParts = encryptedText.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedTextBuffer = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedTextBuffer);
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
