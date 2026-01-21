import { Document } from './document.model';

export interface Team {
  id: number;
  name: string;
  members: number;
  role: 'Owner' | 'Team Admin' | 'Member' | 'Viewer';
  avatar: string;
  lastActivity: string;
  documents: TeamDocument[];
}

export interface TeamDocument {
  id: number;
  name: string;
  lastEdited: string;
  myRole: string;
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: 'Owner' | 'Team Admin' | 'Member' | 'Viewer';
  avatar: string;
  joinedAt: string;
}
