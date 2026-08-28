export interface UploadInput {
  key: string;
  body: Buffer;
  mimeType: string;
}

export interface SignedUrlOptions {
  /** "inline" renders in the browser tab (View); "attachment" forces a save-as (Download). Omit for no override. */
  disposition?: "inline" | "attachment";
  filename?: string;
}

/**
 * Storage is abstracted so the S3-compatible implementation can point at MinIO
 * locally and real AWS S3 in production without any caller changes.
 */
export abstract class StorageService {
  abstract upload(input: UploadInput): Promise<void>;
  abstract getSignedDownloadUrl(key: string, opts?: SignedUrlOptions): Promise<string>;
  abstract delete(key: string): Promise<void>;
}
