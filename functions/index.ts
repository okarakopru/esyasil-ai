/**
 * BACKEND CODE FOR EşyaSil AI
 * 
 * Instructions:
 * 1. Initialize Firebase Functions: `firebase init functions`
 * 2. Select TypeScript.
 * 3. Replace the contents of functions/src/index.ts with this code.
 * 4. Install dependencies: `npm install firebase-admin firebase-functions @google/genai stripe cors`
 * 5. Set Env Vars: 
 *    firebase functions:config:set stripe.secret="sk_live_..." gemini.key="AIza..."
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenAI } from "@google/genai";
import Stripe from 'stripe';
import * as cors from 'cors';

admin.initializeApp();
const db = admin.firestore();
const corsHandler = cors({ origin: true });

// --- CONFIGURATION ---
const STRIPE_SECRET_KEY = functions.config().stripe.secret;
const GEMINI_API_KEY = functions.config().gemini.key;
const WEBHOOK_SECRET = functions.config().stripe.webhook_secret;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });

// --- TYPES ---
interface ProcessRequest {
  images: string[]; // Base64 strings
}

// --- AI SERVICE ---
async function processWithGemini(base64Image: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const model = 'gemini-2.5-flash-image'; // Mapped from "Nano Banana"

  // Prompt logic: Furniture removal via inpainting instruction
  // Note: Keeping prompt in English as it typically yields better results with the model, 
  // but the result is visual.
  const prompt = "Identify all furniture in this image. Remove the furniture and reconstruct the background (floor and walls) to show an empty room. Maintain lighting and architectural structure.";

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [
        { text: prompt },
        { inlineData: { mimeType: "image/jpeg", data: base64Image } }
      ]
    }
  });

  const parts = response.candidates?.[0]?.content?.parts;
  const imagePart = parts?.find(p => p.inlineData);

  if (imagePart && imagePart.inlineData) {
    return imagePart.inlineData.data;
  }
  throw new Error("AI görüntü oluşturamadı");
}

// --- CLOUD FUNCTIONS ---

// 1. Process Images Endpoint
export const processImages = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    // Check Auth
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) {
      res.status(401).send('Yetkisiz Erişim');
      return;
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;

      // Check User Credits/Sub
      const userDoc = await db.collection('users').doc(uid).get();
      const userData = userDoc.data() || { credits: 1, subscriptionStatus: 'none' }; // Default 1 free credit

      const { images } = req.body as ProcessRequest;
      if (!images || images.length === 0 || images.length > 5) {
        res.status(400).send('Geçersiz görüntü sayısı (1-5 arası izin verilir).');
        return;
      }

      // Permission Check
      if (userData.subscriptionStatus !== 'active' && userData.credits < images.length) {
        res.status(403).send('Yetersiz kredi. Lütfen abone olun.');
        return;
      }

      // Process Batch
      const processedResults = await Promise.all(images.map(async (imgBase64, index) => {
        try {
          const resultBase64 = await processWithGemini(imgBase64);
          
          // Save to Storage (Optional, skipping for brevity in single file, normally upload buffer to bucket)
          // const bucket = admin.storage().bucket();
          // ... save logic ...
          
          return { status: 'success', data: resultBase64, index };
        } catch (e) {
          console.error(`Görüntü ${index} başarısız`, e);
          return { status: 'error', error: 'İşlem başarısız', index };
        }
      }));

      // Deduct Credits if not subbed
      if (userData.subscriptionStatus !== 'active') {
        await db.collection('users').doc(uid).update({
          credits: admin.firestore.FieldValue.increment(-images.length)
        });
      }

      // Log Usage
      await db.collection('logs').add({
        uid,
        count: images.length,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      res.status(200).json({ results: processedResults });

    } catch (error) {
      console.error(error);
      res.status(500).send('Sunucu Hatası');
    }
  });
});

// 2. Stripe Webhook
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig as string, WEBHOOK_SECRET);
  } catch (err: any) {
    res.status(400).send(`Webhook Hatası: ${err.message}`);
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const uid = session.client_reference_id; // Passed during checkout creation

    if (uid) {
      await db.collection('users').doc(uid).set({
        subscriptionStatus: 'active',
        stripeCustomerId: session.customer,
        credits: 9999 // Unlimited effectively
      }, { merge: true });
    }
  }

  // Handle subscription deletion/expiration
  if (event.type === 'customer.subscription.deleted') {
     const subscription = event.data.object as Stripe.Subscription;
     // Find user by stripe ID and downgrade
     const snapshot = await db.collection('users').where('stripeCustomerId', '==', subscription.customer).get();
     snapshot.forEach(doc => {
       doc.ref.update({ subscriptionStatus: 'expired' });
     });
  }

  res.json({ received: true });
});

// 3. Admin Stats
export const adminStats = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    // Basic admin check (simplistic for demo)
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    // Verify token and check claims/email...
    
    const usersSnap = await db.collection('users').count().get();
    const logsSnap = await db.collection('logs').count().get();
    
    res.json({
      totalUsers: usersSnap.data().count,
      totalProcessedBatches: logsSnap.data().count
    });
  });
});

// 4. Create Stripe Checkout Session
export const createCheckoutSession = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) return res.status(401).send('Yetkisiz Erişim');
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'try',
          product_data: { name: 'EşyaSil AI Pro (Aylık)' },
          unit_amount: 10000, // 100.00 TL
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: 'https://your-app-url.com?success=true',
      cancel_url: 'https://your-app-url.com?canceled=true',
      client_reference_id: decodedToken.uid,
    });

    res.json({ url: session.url });
  });
});