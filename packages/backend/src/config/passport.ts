import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from './env';
import { UserModel } from '../models';

// Only register the strategy when credentials are present.
// This prevents a hard crash during local/non-SSO development.
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  const callbackURL = `${env.BACKEND_URL || 'http://localhost:5000'}/api/v1/auth/google/callback`;

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email returned from Google profile'));
          }

          // ── Security Gatekeeper ──────────────────────────────────────────────
          // Only allow logins for users that already exist in our DB with role 'admin'
          const user = await UserModel.findOne({ email, isActive: true });

          if (!user) {
            console.warn(`[Security] Unauthorized Google SSO attempt: ${email}`);
            // Returning false triggers the failureRedirect in the route
            return done(null, false);
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      },
    ),
  );

  console.log('✅ Google OAuth strategy registered');
} else {
  console.warn('⚠️  GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — Google SSO disabled');
}

export default passport;
