export enum NotificationType {
  DocumentInvite = 0,
  TeamInvite = 1,
  CommentMention = 2,
  AddedToDocument = 3,
  CommentResolved = 4,
  CommentReply = 5,
  PasswordChanged = 6
}

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  titlePt?: string;
  message: string;
  messagePt?: string;
  isRead: boolean;
  createdAt: string;
  referenceId?: number;
  referenceType?: string;
  actorId?: string;
  actorName?: string;
  referenceToken?: string;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  language: string;
}

