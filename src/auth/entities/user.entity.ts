export type UserDocument = {
  id: string;
  userId: string;
  email: string;
  passwordHash: string;
  role?: 'admin' | 'superadmin';
  createdAt: string;
  firstName?: string;
  lastName?: string;
};

