import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with keys from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export class CloudinaryProvider {
  /**
   * Generates a cryptographic signature so the frontend can upload files directly to Cloudinary
   * without routing the massive file buffers through our Node.js server.
   */
  static generateUploadSignature(folder: string) {
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    // We only sign the parameters that we want to enforce. 
    // The frontend must pass exactly these parameters to Cloudinary.
    const paramsToSign = {
      timestamp,
      folder
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET as string
    );

    return {
      timestamp,
      signature,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder
    };
  }

  /**
   * Uploads a raw buffer directly to Cloudinary (used by node proxy endpoints)
   */
  static uploadBuffer(buffer: Buffer, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error) return reject(error);
          resolve(result?.secure_url as string);
        }
      );
      stream.end(buffer);
    });
  }
}
