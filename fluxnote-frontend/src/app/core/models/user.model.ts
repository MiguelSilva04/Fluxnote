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
}

export interface Collaborator {
  name: string;
  initials: string;
  color: string;
}
