declare global {
  namespace App {
    interface Locals {
      user: { id: string; email: string; name: string; role: string } | null;
      requestId: string;
    }
    interface Error {
      message: string;
      requestId?: string;
    }
  }
}
export {};
