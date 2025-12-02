import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { db } from '../firebase.config';
import { FieldValue } from 'firebase-admin/firestore';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { UserDocument } from './entities/user.entity';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as JwtSignOptions['expiresIn'];
const JWT_SIGN_OPTIONS: JwtSignOptions = {
  secret: JWT_SECRET,
  expiresIn: JWT_EXPIRES_IN,
};

@Injectable()
export class AuthService {
  private readonly collection = db.collection(
    process.env.FIREBASE_USERS_COLLECTION ?? 'users',
  );

  // single doc under `settings/visibility` to hold role -> page visibility mapping
  private readonly settingsCollection = db.collection(process.env.FIREBASE_SETTINGS_COLLECTION ?? 'settings');

  constructor(private readonly jwtService: JwtService) {}

  async register(dto: RegisterAuthDto): Promise<{ token: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    await this.ensureEmailAvailable(normalizedEmail);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const docRef = this.collection.doc();
    // Determine role: first user becomes superadmin; subsequent users are guests (no role field)
    const snapshot = await this.collection.limit(1).get();
    const isFirstUser = snapshot.empty;

    const userPayload: any = {
      userId: docRef.id,
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date().toISOString(),
      tokenVersion: 0,
    };
    if (dto.firstName) userPayload.firstName = dto.firstName.trim();
    if (dto.lastName) userPayload.lastName = dto.lastName.trim();
    if (isFirstUser) userPayload.role = 'superadmin';
    await docRef.set(userPayload);

    // Sign token without role claim for guest users (role claim included only for superadmin/admin)
    const token = await this.signToken(docRef.id, normalizedEmail, userPayload.role, userPayload.tokenVersion);
    return { token };
  }

  async login(dto: LoginAuthDto): Promise<{ token: string }> {
    if (!dto || typeof dto.email !== 'string' || typeof dto.password !== 'string') {
      throw new BadRequestException('Invalid request payload');
    }

    const normalizedEmail = String(dto.email).trim().toLowerCase();
    const user = await this.findByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }
    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }
    const token = await this.signToken(user.id, normalizedEmail, user.role, (user as any).tokenVersion ?? 0);
    return { token };
  }

  private async ensureEmailAvailable(email: string) {
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new BadRequestException('อีเมลนี้ถูกใช้งานแล้ว');
    }
  }

  private async findByEmail(email: string): Promise<UserDocument | null> {
    const snapshot = await this.collection.where('email', '==', email).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    const data = doc.data() as Omit<UserDocument, 'id'>;
    return { id: doc.id, ...data };
  }

  private signToken(userId: string, email: string, role?: string, tokenVersion?: number) {
    const payload: any = { sub: userId, email };
    if (role) payload.role = role;
    if (typeof tokenVersion !== 'undefined') payload.tokenVersion = tokenVersion;
    return this.jwtService.signAsync(payload, JWT_SIGN_OPTIONS);
  }

  // administrative: list users and change role
  async listUsers(): Promise<UserDocument[]> {
    const snapshot = await this.collection.get();
    return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  }

  async setRole(userId: string, role?: 'admin' | 'superadmin' | 'guest') {
    const docRef = this.collection.doc(userId);
    const doc = await docRef.get();
    if (!doc.exists) throw new BadRequestException('User not found');
    // If role is 'guest' or not provided, remove the role field (guest = no role)
    if (!role || role === 'guest') {
      await docRef.update({ role: FieldValue.delete(), tokenVersion: FieldValue.increment(1) });
    } else {
      await docRef.update({ role, tokenVersion: FieldValue.increment(1) });
    }

    // re-fetch user data to sign a new token for them
    const updatedDoc = await docRef.get();
    const data = updatedDoc.data() as any;
    const email = data?.email as string | undefined;
    const updatedRole = data?.role as string | undefined;

    const updatedTokenVersion = (data?.tokenVersion as number | undefined) ?? 0;
    const token = await this.signToken(userId, email ?? '', updatedRole, updatedTokenVersion);
    return { userId, role: updatedRole ?? null, token };
  }

  async deleteUser(userId: string) {
    const docRef = this.collection.doc(userId);
    const doc = await docRef.get();
    if (!doc.exists) throw new BadRequestException('User not found');

    await docRef.delete();
    return { userId };
  }

  // Visibility settings: stored at settings/visibility
  async getVisibility() {
    const ref = this.settingsCollection.doc('visibility');
    const doc = await ref.get();
    if (!doc.exists) {
      // default visibility: superadmin sees everything, admin sees dashboard and users, guest sees dashboard
      const defaults = {
        superadmin: { dashboard: true, companies: true, admin_users: true, visibility: true },
        admin: { dashboard: true, companies: true, admin_users: false, visibility: false },
        guest: { dashboard: true, companies: true, admin_users: false, visibility: false },
      };
      await ref.set(defaults);
      return defaults;
    }
    return doc.data();
  }

  async setVisibility(visibility: Record<string, any>) {
    const ref = this.settingsCollection.doc('visibility');
    await ref.set(visibility, { merge: true });
    const doc = await ref.get();
    return doc.data();
  }

  // Profile management
  async getProfile(userId: string) {
    const doc = await this.collection.doc(userId).get();
    if (!doc.exists) throw new BadRequestException('User not found');
    const data = doc.data() as any;
    return {
      email: data.email,
      role: data.role,
      firstName: data.firstName,
      lastName: data.lastName,
      avatarUrl: data.avatarUrl,
      socials: data.socials || {},
      createdAt: data.createdAt,
    };
  }

  async updateProfile(userId: string, updateData: { avatarUrl?: string; socials?: Record<string, string> }) {
    try {
      console.log('AuthService.updateProfile - userId:', userId, 'updateData:', updateData);
      const docRef = this.collection.doc(userId);
      const doc = await docRef.get();
      if (!doc.exists) throw new BadRequestException('User not found');
      
      const updatePayload: any = {};
      // Handle avatarUrl: if empty string, remove it; if provided, set it
      if (updateData.avatarUrl !== undefined) {
        if (updateData.avatarUrl === '' || updateData.avatarUrl === null) {
          updatePayload.avatarUrl = FieldValue.delete();
        } else {
          updatePayload.avatarUrl = updateData.avatarUrl;
        }
      }
      if (updateData.socials !== undefined) {
        if (Object.keys(updateData.socials).length === 0) {
          updatePayload.socials = FieldValue.delete();
        } else {
          updatePayload.socials = updateData.socials;
        }
      }
      
      console.log('AuthService.updateProfile - updatePayload:', updatePayload);
      await docRef.update(updatePayload);
      const updatedDoc = await docRef.get();
      const data = updatedDoc.data() as any;
      return {
        email: data.email,
        role: data.role,
        firstName: data.firstName,
        lastName: data.lastName,
        avatarUrl: data.avatarUrl,
        socials: data.socials || {},
        createdAt: data.createdAt,
      };
    } catch (err) {
      console.error('AuthService.updateProfile error:', err);
      throw err;
    }
  }
}

