import { audioBucket } from "../config.js";

/**
 * 音声ファイルをCloud Storageに保存し、パスを返す
 */
export async function uploadAudio(
  caseId: string,
  consultationId: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const ext = mimeType.split("/")[1] ?? "wav";
  const path = `cases/${caseId}/consultations/${consultationId}/audio.${ext}`;
  const file = audioBucket.file(path);
  await file.save(buffer, { contentType: mimeType, resumable: false });
  return path;
}

/**
 * Cloud Storageから音声ファイルを取得
 */
export async function downloadAudio(
  storagePath: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const file = audioBucket.file(storagePath);
  const [contents] = await file.download();
  const [metadata] = await file.getMetadata();
  return { buffer: contents, mimeType: (metadata.contentType as string) ?? "audio/wav" };
}
