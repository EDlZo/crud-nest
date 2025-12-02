export type UserDocument = {
  id: string;
  userId: string;
  email: string;
  passwordHash: string;
  role?: 'admin' | 'superadmin';
  firstName?: string;
  lastName?: string;
  createdAt: string;
};

