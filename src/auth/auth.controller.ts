import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { UseGuards } from '@nestjs/common';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterAuthDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginAuthDto) {
    return this.authService.login(dto);
  }

  // admin endpoints - only accessible by superadmin
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  @Post('users/role')
  async setRole(@Body() body: { userId: string; role: 'admin' | 'superadmin' }) {
    return this.authService.setRole(body.userId, body.role);
  }

  @UseGuards(RolesGuard)
  @Roles('superadmin')
  @Post('users/list')
  async listUsers() {
    return this.authService.listUsers();
  }
}

