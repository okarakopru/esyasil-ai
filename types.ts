export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  credits: number;
  subscriptionStatus: 'active' | 'expired' | 'none';
  stripeCustomerId?: string;
}

export interface ProcessedImage {
  id: string;
  originalUrl: string;
  processedUrl: string | null;
  status: 'pending' | 'processing' | 'completed' | 'error';
  timestamp: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month';
}
