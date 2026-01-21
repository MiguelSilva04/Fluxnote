export interface Notification {
  id: number;
  type: 'document' | 'comment' | 'team' | string;
  icon: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  desktop: boolean;
}
