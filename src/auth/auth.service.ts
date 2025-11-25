import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { db } from '../firebase.config';
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
    const userPayload = {
      userId: docRef.id,
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    await docRef.set(userPayload);

    const token = await this.signToken(docRef.id, normalizedEmail);
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
    const token = await this.signToken(user.id, normalizedEmail);
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

  private signToken(userId: string, email: string) {
    return this.jwtService.signAsync({ sub: userId, email }, JWT_SIGN_OPTIONS);
  }
}

