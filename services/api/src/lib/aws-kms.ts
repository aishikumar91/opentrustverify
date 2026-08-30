import { DecryptCommand, GenerateDataKeyCommand, KMSClient } from "@aws-sdk/client-kms";

export type AwsKmsOps = {
  generateDataKey: () => Promise<{ plaintext: Buffer; ciphertext: Buffer }>;
  decrypt: (ciphertext: Buffer) => Promise<Buffer>;
};

let injected: AwsKmsOps | undefined;

export function setAwsKmsOps(ops: AwsKmsOps | undefined): void {
  injected = ops;
}

export async function resolveAwsKmsOps(): Promise<AwsKmsOps> {
  if (injected) return injected;
  const keyId = process.env.AWS_KMS_KEY_ID;
  if (!keyId) throw new Error("AWS_KMS_KEY_ID required when OTV_KMS_PROVIDER=aws");
  const client = new KMSClient({ region: process.env.AWS_REGION ?? "us-east-1" });
  return {
    async generateDataKey() {
      const out = await client.send(new GenerateDataKeyCommand({ KeyId: keyId, KeySpec: "AES_256" }));
      if (!out.Plaintext || !out.CiphertextBlob) throw new Error("AWS KMS did not return a data key");
      return { plaintext: Buffer.from(out.Plaintext), ciphertext: Buffer.from(out.CiphertextBlob) };
    },
    async decrypt(ciphertext) {
      const out = await client.send(new DecryptCommand({ CiphertextBlob: ciphertext, KeyId: keyId }));
      if (!out.Plaintext) throw new Error("AWS KMS decrypt returned no plaintext");
      return Buffer.from(out.Plaintext);
    },
  };
}
