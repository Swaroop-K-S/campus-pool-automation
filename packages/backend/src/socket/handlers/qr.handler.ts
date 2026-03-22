import { Server } from 'socket.io';
import { generateQRToken, generateQRDataUrl } from '../../services/qr.service';
import { QRSessionModel } from '../../models';

const activeRotations = new Map<string, NodeJS.Timeout>();

async function emitNewQR(driveId: string, io: Server) {
  const token = generateQRToken(driveId);
  const qrDataUrl = await generateQRDataUrl(token, driveId);
  const expiresAt = Date.now() + 35000;

  // Save to DB (replace old)
  await QRSessionModel.findOneAndUpdate(
    { driveId },
    { driveId, token, expiresAt: new Date(expiresAt) },
    { upsert: true, new: true }
  );

  // Broadcast to QR display screens
  io.to(`drive:${driveId}:qr`).emit('qr:rotate', {
    qrDataUrl,
    expiresAt,
    rotatesIn: 30
  });
}

export async function startQRRotation(driveId: string, io: Server) {
  // Stop existing if any
  if (activeRotations.has(driveId)) {
    clearInterval(activeRotations.get(driveId)!);
  }

  // Emit immediately
  await emitNewQR(driveId, io);

  // Rotate every 30 seconds
  const interval = setInterval(async () => {
    await emitNewQR(driveId, io);
  }, 30000);

  activeRotations.set(driveId, interval);
}

export function stopQRRotation(driveId: string) {
  if (activeRotations.has(driveId)) {
    clearInterval(activeRotations.get(driveId)!);
    activeRotations.delete(driveId);
  }
}
