import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { env } from "@/env";

function ensureAdminApp() {
	const apps = getApps();
	if (apps.length === 0) {
		initializeApp({
			credential: cert({
				projectId: env.FIREBASE_PROJECT_ID!,
				clientEmail: env.FIREBASE_CLIENT_EMAIL!,
				privateKey: env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
			}),
		});
	}
}

export function tryGetAdminDb() {
	if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
		return null;
	}
	ensureAdminApp();
	return getFirestore();
} 