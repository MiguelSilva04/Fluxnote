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
  currentUserRole: number;
  members: TeamMemberToPost[];
  documents: TeamDocument[];
}


export interface TeamDocument {
  id: number;
  title: string;
  updatedAt?: string;
  createdById?: string;
  permissions?: DocumentPermissionSummary[];
}

export interface DocumentPermissionSummary {
  id: number;
  teamMemberId: number;
  memberName: string;
  documentRole: number; // 0=Viewer, 1=Editor
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
  id?: number,
  name: string;
  email: string;
  role: number;
  teamId :number;
  userId? : string;
  //joinedAt: string;
}