import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const QR_SECRET = (process.env.JWT_ACCESS_SECRET || 'fallback_secret') + '_QR';
const QR_EXPIRY = 35; // 35 seconds

export function generateQRToken(driveId: string): string {
  return jwt.sign(
    { driveId, nonce: randomUUID(), type: 'event_checkin' },
    QR_SECRET,
    { expiresIn: QR_EXPIRY }
  );
}

export function verifyQRToken(token: string): { driveId: string; nonce: string } {
  return jwt.verify(token, QR_SECRET) as any;
}

export async function generateQRDataUrl(token: string, driveId: string): Promise<string> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const url = `${frontendUrl}/event/${driveId}/verify?token=${token}`;
  return QRCode.toDataURL(url, {
    width: 320,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#FFFFFF' }
  });
}
