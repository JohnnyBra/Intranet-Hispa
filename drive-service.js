import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

let driveClient = null;

/**
 * Initialize Google Drive client with service account credentials.
 * Returns true if successfully initialized, false otherwise.
 */
export function initDrive() {
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;

  let credentials;
  try {
    if (credentialsJson) {
      credentials = JSON.parse(credentialsJson);
    } else if (credentialsPath) {
      const absPath = path.resolve(credentialsPath);
      credentials = JSON.parse(fs.readFileSync(absPath, 'utf8'));
    } else {
      console.warn('[drive-service] No service account credentials configured');
      return false;
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
    driveClient = google.drive({ version: 'v3', auth });
    console.log(`[${new Date().toISOString()}] [drive-service] Google Drive client initialized`);
    return true;
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [drive-service] Init error:`, err.message);
    return false;
  }
}

/**
 * Check if Drive client is ready.
 */
export function isDriveReady() {
  return driveClient !== null;
}

/**
 * Find a folder by name under a parent, or create it if it doesn't exist.
 * Returns the folder ID.
 */
export async function findOrCreateFolder(name, parentId) {
  // Search for existing folder
  const query = `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const list = await driveClient.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (list.data.files && list.data.files.length > 0) {
    return list.data.files[0].id;
  }

  // Create new folder
  const fileMetadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId],
  };
  const res = await driveClient.files.create({
    requestBody: fileMetadata,
    fields: 'id',
  });
  return res.data.id;
}

/**
 * Upload a file to Google Drive and make it publicly viewable.
 * Returns { fileId }.
 */
export async function uploadFile(localPath, fileName, mimeType, parentFolderId) {
  const fileMetadata = {
    name: fileName,
    parents: [parentFolderId],
  };
  const media = {
    mimeType,
    body: fs.createReadStream(localPath),
  };

  const res = await driveClient.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id',
  });

  const fileId = res.data.id;

  // Make publicly viewable (anyone with the link)
  await driveClient.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return { fileId };
}

/**
 * Get the direct image URL for a Drive file.
 * lh3.googleusercontent.com serves images directly (no HTML wrapper).
 */
export function getDriveImageUrl(fileId) {
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

/**
 * Stream a file from Google Drive (for proxy endpoint).
 * Returns { stream, contentType }.
 */
export async function getFileStream(fileId) {
  const res = await driveClient.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  return {
    stream: res.data,
    contentType: res.headers['content-type'] || 'application/octet-stream',
  };
}

/**
 * Get the Drive client instance (for advanced operations).
 */
export function getDriveClient() {
  return driveClient;
}
