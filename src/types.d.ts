declare namespace Express {
  export interface Request {
    requestId?: string;
    auth?: {
      userId: string;
      sessionId: string;
      email: string;
      tokenVersion: number;
    };
    tenant?: {
      id: string;
      slug: string;
      membershipId: string;
    };
  }
}
