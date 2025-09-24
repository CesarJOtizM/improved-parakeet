export interface IUserData {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  status: string;
  lastLoginAt?: string;
  roles: string[];
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}
