export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  createdAt: string;
}

export interface UserUpdate {
  fullName: string;
  phone: string | null;
}
