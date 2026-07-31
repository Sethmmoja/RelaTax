/**
 * Restores a documents backup (a directory of files written by
 * scripts/backup-documents.ts) into a fresh scratch bucket via the same S3
 * API the app itself uses, reads every file back, and hash-compares it
 * against the local copy — proves the backup is genuinely restorable, not
 * just that the files exist on disk. The bucket is unique per run and
 * deleted at the end — reusing one scratch bucket across many drill runs
 * risks it accumulating debris from any interrupted/failed run and getting
 * stuck in a bad state, which is exactly what happened once while building
 * this script (traced to the bucket, not the S3 client or MinIO itself).
 *
 * Usage: ts-node --transpile-only scripts/verify-s3-restore.ts <documentsBackupDir>
 */
import { createHash } from "crypto";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function main() {
  const backupDir = process.argv[2];
  if (!backupDir) {
    console.error("Usage: verify-s3-restore.ts <documentsBackupDir>");
    process.exit(1);
  }

  const bucket = `relatax-documents-restore-drill-${Date.now()}`;
  const client = new S3Client({
    endpoint: process.env.STORAGE_ENDPOINT ?? "http://localhost:9000",
    region: process.env.STORAGE_REGION ?? "us-east-1",
    forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE !== "false",
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY ?? "relatax",
      secretAccessKey: process.env.STORAGE_SECRET_KEY ?? "relatax123"
    }
  });

  await client.send(new CreateBucketCommand({ Bucket: bucket }));
  console.log(`Created scratch bucket: ${bucket}`);

  const files = listFiles(backupDir);
  console.log(`Restoring ${files.length} files...`);

  let verified = 0;
  const failures: string[] = [];
  const uploadedKeys: string[] = [];

  for (const file of files) {
    const key = relative(backupDir, file).split("\\").join("/");
    const body = readFileSync(file);
    const localHash = sha256(body);

    try {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }));
      uploadedKeys.push(key);

      const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const restoredHash = sha256(await streamToBuffer(response.Body));

      if (restoredHash === localHash) {
        verified += 1;
      } else {
        failures.push(`${key}: hash mismatch after restore`);
      }
    } catch (err) {
      failures.push(`${key}: ${(err as Error).message}`);
    }
  }

  console.log(`\nRestore summary: ${verified}/${files.length} files restored and byte-for-byte verified.`);
  if (failures.length > 0) {
    console.log(`${failures.length} file(s) had issues:`);
    failures.forEach((f) => console.log(`  - ${f}`));
  }

  console.log(`\nCleaning up scratch bucket ${bucket}...`);
  for (const key of uploadedKeys) {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }
  await client.send(new DeleteBucketCommand({ Bucket: bucket }));

  if (verified === 0) {
    console.error("No files could be restored and verified — treating the drill as failed.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
