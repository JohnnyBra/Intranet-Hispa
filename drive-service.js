import { google } from 'googleapis';
import fs from 'fs';

let driveClient = null;

/**
 * Initialize Google Drive client using OAuth2 with a refresh token.
 * This approach uploads files as a real user (eventos@) who has storage quota,
 * avoiding the "Service Accounts do not have storage quota" limitation.
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID          — OAuth2 client ID
 *   GOOGLE_CLIENT_SECRET      — OAuth2 client secret
 *   GOOGLE_DRIVE_REFRESH_TOKEN — Refresh token obtained via drive-auth-setup.js
 *
 * Returns true if successfully initialized, false otherwise.
 */
export function initDrive() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    const missing = [];
    if (!clientId) missing.push('GOOGLE_CLIENT_ID');
    if (!clientSecret) missing.push('GOOGLE_CLIENT_SECRET');
    if (!refreshToken) missing.push('GOOGLE_DRIVE_REFRESH_TOKEN');
    console.warn(`[drive-service] Not configured (missing: ${missing.join(', ')}). Run "node drive-auth-setup.js" to set up.`);
    return false;
  }

  try {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    driveClient = google.drive({ version: 'v3', auth: oauth2Client });
    console.log(`[${new Date().toISOString()}] [drive-service] Google Drive client initialized (OAuth2)`);
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
  const query = `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const list = await driveClient.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (list.data.files && list.data.files.length > 0) {
    return list.data.files[0].id;
  }

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
  const res = await driveClient.files.create({
    requestBody: {
      name: fileName,
      parents: [parentFolderId],
    },
    media: {
      mimeType,
      body: fs.createReadStream(localPath),
    },
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
