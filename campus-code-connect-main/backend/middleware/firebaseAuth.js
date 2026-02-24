import admin from "firebase-admin";
import fs from "fs";
import jwt from "jsonwebtoken";

// Initialize Firebase Admin once using service account JSON in env
export function initFirebaseAdmin() {
  if (admin.apps.length) return;

  const svcPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  let cred = null;

  if (svcPath) {
    const trimmed = svcPath.trim();
    if (trimmed.startsWith("{")) {
      try {
        cred = JSON.parse(svcPath);
      } catch (e) {
        try {
          const m = svcPath.match(/"private_key"\s*:\s*"([\s\S]*?)"/);
          if (m && m[1]) {
            const originalKey = m[1];
            const escapedKey = originalKey.replace(/\r?\n/g, "\\n");
            const coerced = svcPath.replace(originalKey, escapedKey);
            cred = JSON.parse(coerced);
          } else {
            throw e;
          }
        } catch (e2) {
          throw new Error("FIREBASE_SERVICE_ACCOUNT_PATH contains invalid JSON");
        }
      }
    } else {
      if (!fs.existsSync(svcPath)) {
        throw new Error(`FIREBASE_SERVICE_ACCOUNT_PATH file not found: ${svcPath}`);
      }
      const raw = fs.readFileSync(svcPath, "utf8");
      cred = JSON.parse(raw);
    }
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      cred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON");
    }
  } else {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT must be set in backend/.env");
  }

  admin.initializeApp({ credential: admin.credential.cert(cred) });
}

// Verify token helper
export async function verifyFirebaseIdToken(token) {
  initFirebaseAdmin();
  return admin.auth().verifyIdToken(token);
}

// Express middleware to protect routes using Firebase ID token
export async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    if (!token) return res.status(401).json({ message: "Missing Firebase ID token" });
    // Try verifying as Firebase ID token first
    try {
      const decoded = await verifyFirebaseIdToken(token);
      req.firebaseDecoded = decoded;
      req.firebaseUid = decoded.uid;
      return next();
    } catch (e) {
      // If not a Firebase token, try verifying as backend JWT
      try {
        const decodedJwt = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
        // Our backend JWT encodes `id` as the Firebase UID
        req.firebaseDecoded = decodedJwt;
        req.firebaseUid = decodedJwt.id;
        req.user = decodedJwt;
        return next();
      } catch (e2) {
        return res.status(401).json({ message: "Invalid token" });
      }
    }
  } catch (e) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export default { initFirebaseAdmin, verifyFirebaseIdToken, verifyFirebaseToken };
