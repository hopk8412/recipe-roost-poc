import {
	S3Client,
	PutObjectCommand,
	DeleteObjectCommand,
	HeadBucketCommand,
	CreateBucketCommand
} from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';
import { logger } from './logger';

function endpoint(): string {
	return `http://${env.MINIO_ENDPOINT ?? 'localhost'}:${env.MINIO_PORT ?? '9000'}`;
}

function bucket(): string {
	return env.MINIO_BUCKET ?? 'recipe-roost';
}

// Browser-accessible base URL. May differ from the internal endpoint when the
// app runs inside Docker but the browser accesses MinIO via the mapped host port.
function publicBase(): string {
	return env.MINIO_PUBLIC_URL ?? endpoint();
}

let _client: S3Client | null = null;

function getClient(): S3Client {
	if (!_client) {
		_client = new S3Client({
			endpoint: endpoint(),
			region: 'us-east-1',
			credentials: {
				accessKeyId: env.MINIO_ACCESS_KEY ?? 'minioadmin',
				secretAccessKey: env.MINIO_SECRET_KEY ?? 'minioadmin'
			},
			forcePathStyle: true
		});
	}
	return _client;
}

async function ensureBucket(): Promise<void> {
	const client = getClient();
	const b = bucket();
	try {
		await client.send(new HeadBucketCommand({ Bucket: b }));
	} catch {
		await client.send(new CreateBucketCommand({ Bucket: b }));
	}
}

export function getPublicUrl(key: string): string {
	return `${publicBase()}/${bucket()}/${key}`;
}

export async function uploadImage(file: File): Promise<string> {
	await ensureBucket();
	const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
	const key = `images/${crypto.randomUUID()}.${ext}`;
	const bytes = new Uint8Array(await file.arrayBuffer());

	await getClient().send(
		new PutObjectCommand({
			Bucket: bucket(),
			Key: key,
			Body: bytes,
			ContentType: file.type || 'image/jpeg'
		})
	);

	const url = getPublicUrl(key);
	logger.info({ key, size: file.size }, 'image uploaded');
	return url;
}

export async function deleteImageByUrl(imageUrl: string): Promise<void> {
	const b = bucket();
	const marker = `/${b}/`;
	const idx = imageUrl.indexOf(marker);
	if (idx === -1) return;
	const key = imageUrl.slice(idx + marker.length);

	try {
		await getClient().send(new DeleteObjectCommand({ Bucket: b, Key: key }));
		logger.info({ key }, 'image deleted');
	} catch (err) {
		logger.warn({ err, key }, 'image delete failed — may already be gone');
	}
}
