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

  constructor(private readonly jwtService: JwtService) {}

  async register(dto: RegisterAuthDto): Promise<{ token: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    await this.ensureEmailAvailable(normalizedEmail);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const docRef = this.collection.doc();
    // Determine role: if this is the first user, make them superadmin
    const snapshot = await this.collection.limit(1).get();
    const isFirstUser = snapshot.empty;
    const role = isFirstUser ? 'superadmin' : 'admin';

    const userPayload = {
      userId: docRef.id,
      email: normalizedEmail,
      passwordHash,
      role,
      createdAt: new Date().toISOString(),
    } as any;
    await docRef.set(userPayload);

    const token = await this.signToken(docRef.id, normalizedEmail, userPayload.role);
    return { token };
  }

  async login(dto: LoginAuthDto): Promise<{ token: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.findByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }
    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }
    const token = await this.signToken(user.id, normalizedEmail, user.role);
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

  private signToken(userId: string, email: string, role?: string) {
    const payload: any = { sub: userId, email };
    if (role) payload.role = role;
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
      await docRef.update({ role: deleteField() });
    } else {
      await docRef.update({ role });
    }

    // re-fetch user data to sign a new token for them
    const updatedDoc = await docRef.get();
    const data = updatedDoc.data() as any;
    const email = data?.email as string | undefined;
    const updatedRole = data?.role as string | undefined;

    const token = await this.signToken(userId, email ?? '', updatedRole);
    return { userId, role: updatedRole ?? null, token };
  }
}

