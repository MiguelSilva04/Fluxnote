export interface User {
  id?: string;
  email: string;
  initials: string;
  color: string;
  fullName?: string;
  userName?: string;
  profilePictureUrl?: string;
  location?: string;
  phoneNumber?: string;
  bio?: string;
  timezone?: string;
  createdAt?: string;
  usernameChangesRemaining?: number;
}

export interface Collaborator {
  name: string;
  initials: string;
  color: string;
}
