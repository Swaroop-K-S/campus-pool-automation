import { Server } from 'socket.io';
import { generateQRToken, generateQRDataUrl } from '../../services/qr.service';
import { QRSessionModel } from '../../models';

const activeRotations = new Map<string, NodeJS.Timeout>();

// Pre-generated next QR per drive
const nextQRCache = new Map<string, { token: string; qrDataUrl: string }>();

async function preGenerateNext(driveId: string): Promise<void> {
  try {
    const token = generateQRToken(driveId);
    const qrDataUrl = await generateQRDataUrl(token, driveId);
    nextQRCache.set(driveId, { token, qrDataUrl });
  } catch {
    // Silently fail - will fallback to live generation
  }
}

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

  // Emit first QR immediately
  await emitNewQR(driveId, io);

  // Pre-generate the next one right away
  preGenerateNext(driveId);

  // Rotate every 30 seconds
  const interval = setInterval(async () => {
    const cached = nextQRCache.get(driveId);
    if (cached) {
      // Use pre-generated QR
      const { token, qrDataUrl } = cached;
      nextQRCache.delete(driveId);

      const expiresAt = Date.now() + 35000;
      await QRSessionModel.findOneAndUpdate(
        { driveId },
        { driveId, token, expiresAt: new Date(expiresAt) },
        { upsert: true }
      );

      io.to(`drive:${driveId}:qr`).emit('qr:rotate', {
        qrDataUrl,
        expiresAt,
        rotatesIn: 30
      });

      // Pre-generate the next one immediately
      preGenerateNext(driveId);
    } else {
      // Fallback if pre-gen failed
      await emitNewQR(driveId, io);
      preGenerateNext(driveId);
    }
  }, 30000);

  activeRotations.set(driveId, interval);
}

export function stopQRRotation(driveId: string) {
  if (activeRotations.has(driveId)) {
    clearInterval(activeRotations.get(driveId)!);
    activeRotations.delete(driveId);
  }
  nextQRCache.delete(driveId);
}
