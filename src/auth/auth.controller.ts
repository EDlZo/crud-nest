import { Body, Controller, Post, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
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
  async login(@Req() req: Request, @Body() dto: LoginAuthDto) {
    try {
      return await this.authService.login(dto);
    } catch (err) {
      // Log full error and incoming request details for debugging
      console.error('AuthController.login error:', err);
      try {
        console.error('Request headers:', req.headers);
        // Body may be undefined if parsing failed or request was aborted
        console.error('Request body (raw parsed):', dto);
      } catch (logErr) {
        console.error('Failed to log request details', logErr);
      }
      // Re-throw so Nest will still return proper HTTP error code
      throw err;
    }
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

  @UseGuards(JwtAuthGuard)
  @Post('users/list')
  async listUsers() {
    return this.authService.listUsers();
  }

  @UseGuards(JwtAuthGuard)
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

