import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthGuard } from './oauth.guard';
import { GoogleProfile } from '../users/users.service';

import * as express from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(
    @Req() req: express.Request & { user: GoogleProfile },
    @Res() res: express.Response,
  ) {
    const { accessToken } = await this.authService.loginWithGoogle(req.user);

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ??
      'https://dusanprogram.eu';

    return res.redirect(
      `${frontendUrl}/oauth-success?token=${encodeURIComponent(accessToken)}`,
    );
  }
}
