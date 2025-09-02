#!/bin/bash

# Deploy Firestore Security Rules
# This script deploys the firestore.rules file to your Firebase project

set -e

echo "🔥 Deploying Firestore Security Rules..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Install it with:"
    echo "   npm install -g firebase-tools"
    exit 1
fi

# Check if firebase.json exists (should be created by 'firebase init')
if [ ! -f "firebase.json" ]; then
    echo "❌ firebase.json not found. Run 'firebase init firestore' first."
    exit 1
fi

# Check if firestore.rules exists
if [ ! -f "firestore.rules" ]; then
    echo "❌ firestore.rules not found in project root."
    exit 1
fi

# Login check
echo "🔍 Checking Firebase authentication..."
if ! firebase projects:list &> /dev/null; then
    echo "🔐 Please login to Firebase:"
    firebase login
fi

# Deploy rules
echo "📤 Deploying Firestore rules..."
firebase deploy --only firestore:rules

echo "✅ Firestore rules deployed successfully!"
echo ""
echo "Next steps:"
echo "1. Test your application to ensure all features work"
echo "2. Check Firebase Console to verify rules are active"
echo "3. Monitor for any rule violations in Firebase Console"


