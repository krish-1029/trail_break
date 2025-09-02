# Deploying Firestore Security Rules

## Quick Fix for Firebase Warning

Your Firebase project is currently using test mode rules that expire in 0 days. Follow these steps to deploy secure production rules.

## Method 1: Firebase Console (Recommended for Quick Fix)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your `trail-break-telemetry` project
3. Navigate to **Firestore Database** → **Rules**
4. Copy the contents of `firestore.rules` from this project
5. Paste into the rules editor
6. Click **Publish**

## Method 2: Firebase CLI (For Future Updates)

### Setup
```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not already done)
firebase init firestore
```

### Deploy Rules
```bash
# Deploy the rules
firebase deploy --only firestore:rules
```

## Security Rules Overview

The deployed rules provide:

### Server-Side Access (Firebase Admin SDK)
- ✅ Full read/write access to all collections
- ✅ Used by your tRPC API routes
- ✅ Authentication handled by NextAuth

### Client-Side Access (Firebase Web SDK)
- ❌ No direct access to Firestore data
- ✅ All data access happens through your tRPC API
- ✅ API handles authentication and featured lap logic

### Collections Protected:
1. **sessions** - User driving sessions (server-only access)
2. **laps** - Lap data (server-only access, clients use tRPC API)
3. **telemetryChunks** - High-frequency data (server-only access, clients use tRPC API)

## After Deployment

1. **Test your application** - Make sure all features work
2. **Check Firebase Console** - Verify rules are active
3. **Monitor usage** - Watch for any rule violations in Firebase Console

## Troubleshooting

If you see permission errors after deployment:

1. **Check Admin SDK setup** - Ensure `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` are properly set in your environment
2. **Verify rules syntax** - Use Firebase Console to test rules
3. **Check logs** - Look for errors in Firebase Console → Functions/Firestore logs

## Environment Variables Required

Make sure these are set in your production environment:

```bash
# Firebase Admin SDK (for server-side access)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase Web SDK (for client-side public access)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
# ... other NEXT_PUBLIC_FIREBASE_* vars
```

## Security Notes

- Your app primarily uses NextAuth for authentication, not Firebase Auth
- Most Firestore operations happen server-side through your tRPC API
- Public leaderboard data (featured laps) can be accessed directly by clients
- All user data and non-featured laps are protected behind your API authentication
