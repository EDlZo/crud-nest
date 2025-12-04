import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PAGE_VISIBILITY_KEY } from './page-visibility.decorator';
import { db } from '../firebase.config';

@Injectable()
export class VisibilityGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const pageKey = this.reflector.getAllAndOverride<string>(PAGE_VISIBILITY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!pageKey) return true; // no page key -> not restricted by this guard

    const req = context.switchToHttp().getRequest();
    const role = (req.user?.role || 'guest').toLowerCase();

    try {
      const ref = db.collection(process.env.FIREBASE_SETTINGS_COLLECTION ?? 'settings').doc('visibility');
      const doc = await ref.get();
      if (!doc.exists) {
        // If visibility doc missing, don't block (fallback to existing defaults elsewhere)
        return true;
      }
      const data = doc.data() as any;
      const allowed = Boolean(data?.[role]?.[pageKey]);
      if (!allowed) {
        throw new ForbiddenException('Access to this page is not allowed for your role');
      }
      return true;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      // On unexpected errors, be conservative and deny access
      throw new ForbiddenException('Access denied');
    }
  }
}
