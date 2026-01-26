import { Document } from './document.model';

export interface Team {
  id: number;
  name: string;
  members: number;
  role: 'Owner' | 'Team Admin' | 'Member';
  avatar: string;
  lastActivity: string;
  documents: TeamDocument[];
}

export interface TeamToPost {
  name: string;
}

export interface TeamGet {
  id: number;
  name: string;
  ownerId : number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  deletionScheduled: string;
  members: [];
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
  role: 'Owner' | 'Team Admin' | 'Member';
  avatar: string;
  joinedAt: string;
}

export interface TeamMemberToPost {
  name: string;
  email: string;
  role: number;
  teamId :number;
  //joinedAt: string;
}