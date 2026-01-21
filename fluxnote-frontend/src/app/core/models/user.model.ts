export interface User {
  id?: string;
  name: string;
  email: string;
  initials: string;
  color: string;
  role?: string;
  avatar?: string;
}

export interface Collaborator {
  name: string;
  initials: string;
  color: string;
}
