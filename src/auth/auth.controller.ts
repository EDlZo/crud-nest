import { Body, Controller, Post, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { UseGuards } from '@nestjs/common';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  @Post('users/role')
  async setRole(@Body() body: { userId: string; role?: 'admin' | 'superadmin' | 'guest' }) {
    return this.authService.setRole(body.userId, body.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  @Post('users/delete')
  async deleteUser(@Body() body: { userId: string }) {
    return this.authService.deleteUser(body.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  @Post('users/list')
  async listUsers() {
    return this.authService.listUsers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  @Get('visibility')
  async getVisibility() {
    return this.authService.getVisibility();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  @Post('visibility')
  async setVisibility(@Body() body: { visibility: Record<string, any> }) {
    return this.authService.setVisibility(body.visibility);
  }
}

