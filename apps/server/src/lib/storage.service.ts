import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { mkdir, writeFile, unlink, access } from 'fs/promises';
import { join } from 'path';
import { logger } from './logger';

// Storage driver interface
interface StorageDriver {
  upload(key: string, buffer: Buffer, contentType: string): Promise<string>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}

// Local storage driver (development)
class LocalStorageDriver implements StorageDriver {
  private baseDir: string;
  private publicUrl: string;

  constructor() {
    this.baseDir = join(process.cwd(), 'uploads');
    this.publicUrl = process.env.API_URL ?? 'http://localhost:3000';
  }

  async upload(key: string, buffer: Buffer, _contentType: string): Promise<string> {
    // Ensure directory exists
    const dir = join(this.baseDir, key.split('/').slice(0, -1).join('/'));
    await mkdir(dir, { recursive: true });

    const filePath = join(this.baseDir, key);
    await writeFile(filePath, buffer);

    logger.info({ key, size: buffer.length }, 'File uploaded to local storage');
    return `${this.publicUrl}/uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.baseDir, key);
    try {
      await access(filePath);
      await unlink(filePath);
      logger.info({ key }, 'File deleted from local storage');
    } catch {
      logger.warn({ key }, 'File not found for deletion');
    }
  }

  async getSignedUrl(key: string, _expiresIn?: number): Promise<string> {
    // Local storage doesn't need signed URLs, just return public URL
    return `${this.publicUrl}/uploads/${key}`;
  }
}

// R2 storage driver (production)
class R2StorageDriver implements StorageDriver {
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('R2 credentials not configured');
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.bucket = process.env.R2_BUCKET_NAME ?? 'contencreative';
    this.publicUrl = process.env.R2_PUBLIC_URL ?? '';
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.client.send(command);
    logger.info({ key, size: buffer.length, bucket: this.bucket }, 'File uploaded to R2');

    // Return public URL if configured, otherwise signed URL
    if (this.publicUrl) {
      return `${this.publicUrl}/${key}`;
    }
    return this.getSignedUrl(key);
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
    logger.info({ key, bucket: this.bucket }, 'File deleted from R2');
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }
}

// Storage service singleton
class StorageService {
  private driver: StorageDriver;

  constructor() {
    const driverType = process.env.STORAGE_DRIVER ?? 'local';

    if (driverType === 'r2') {
      this.driver = new R2StorageDriver();
      logger.info('Using R2 storage driver');
    } else {
      this.driver = new LocalStorageDriver();
      logger.info('Using local storage driver');
    }
  }

  async uploadExport(
    userId: string,
    filename: string,
    buffer: Buffer,
    contentType = 'video/mp4'
  ): Promise<{ key: string; url: string }> {
    const timestamp = Date.now();
    const key = `exports/${userId}/${timestamp}-${filename}`;
    const url = await this.driver.upload(key, buffer, contentType);
    return { key, url };
  }

  async deleteFile(key: string): Promise<void> {
    return this.driver.delete(key);
  }

  async getSignedUrl(key: string, expiresIn?: number): Promise<string> {
    return this.driver.getSignedUrl(key, expiresIn);
  }
}

// Export singleton instance
export const storageService = new StorageService();
