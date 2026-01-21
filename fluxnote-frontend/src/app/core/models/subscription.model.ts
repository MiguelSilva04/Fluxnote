export interface SubscriptionPlan {
  name: string;
  price: string;
  period: string;
  billing?: string;
  features: string[];
  current: boolean;
  buttonText: string;
  buttonVariant: 'primary' | 'outline' | 'default';
  popular: boolean;
  recommended: boolean;
}

export interface UsageStats {
  documentsCreated: number;
  documentsLimit: number;
  aiRequestsUsed: number;
  aiRequestsLimit: number;
  teamsCreated: number;
  teamsLimit: number;
}
