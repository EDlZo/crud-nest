// Extend Express Request to include `user` injected by authentication middleware
declare namespace Express {
  export interface Request {
    user?: {
      userId: string;
      email?: string;
    };
  }
}
