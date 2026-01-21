export interface Document {
  id: number;
  title: string;
  lastEdited: string;
  sharedWith: number;
  status: 'active' | 'archived';
  content?: string;
}

export interface Version {
  id: number;
  number: number;
  author: string;
  description: string;
  timestamp: string;
}

export interface Comment {
  id: number;
  author: string;
  avatar: string;
  color: string;
  time: string;
  text: string;
  replies: Comment[];
  resolved?: boolean;
}

export interface AISuggestion {
  id: number;
  title: string;
  description: string;
  icon: string;
}
