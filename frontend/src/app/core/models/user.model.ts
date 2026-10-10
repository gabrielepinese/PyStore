export interface User {
  id: string;
  email: string;
  fullName: string;
  lastName: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  createdAt: string;
}

export interface UserUpdate {
  fullName: string;
  lastName: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
}
