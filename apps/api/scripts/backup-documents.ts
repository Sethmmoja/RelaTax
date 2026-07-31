/**
 * Backs up every object in the documents bucket via the real S3 API — GetObject
 * for each key, written to disk under its key as the relative path. Deliberately
 * NOT a raw filesystem copy of MinIO's data directory: MinIO's on-disk format
 * wraps (and for small files, inlines) object bytes inside its own internal
 * xl.meta files, so a filesystem-level copy backs up MinIO's storage engine
 * internals, not portable object bytes.
 *
 * Usage: ts-node --transpile-only scripts/backup-documents.ts <outputDir>
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { GetObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

const BUCKET = process.env.STORAGE_BUCKET ?? "relatax-documents";

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function buildClient(): S3Client {
  return new S3Client({
    endpoint: process.env.STORAGE_ENDPOINT ?? "http://localhost:9000",
    region: process.env.STORAGE_REGION ?? "us-east-1",
    forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE !== "false",
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY ?? "relatax",
      secretAccessKey: process.env.STORAGE_SECRET_KEY ?? "relatax123"
    }
  });
}

async function main() {
  const outputDir = process.argv[2];
  if (!outputDir) {
    console.error("Usage: backup-documents.ts <outputDir>");
    process.exit(1);
  }

  const client = buildClient();
  let continuationToken: string | undefined;
  let count = 0;

  do {
    const page = await client.send(
      new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken: continuationToken })
    );
    for (const obj of page.Contents ?? []) {
      if (!obj.Key) continue;
      const response = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: obj.Key }));
      const body = await streamToBuffer(response.Body);
      const destPath = join(outputDir, obj.Key);
      mkdirSync(dirname(destPath), { recursive: true });
      writeFileSync(destPath, body);
      count += 1;
    }
    continuationToken = page.NextContinuationToken;
  } while (continuationToken);

  console.log(`Backed up ${count} objects from ${BUCKET} to ${outputDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
