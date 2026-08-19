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
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthGuard } from './oauth.guard';

// 1. PROMENI OVU LINIJU: Uvezi express kao namespace
import * as express from 'express'; 

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Req() req) {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  // 2. PROMENI OVDE TIP: koristi express.Response umesto samo Response
  googleAuthRedirect(@Req() req, @Res() res: express.Response) {
    const user = req.user;
    const token = 'neki_tvoj_jwt_token_ili_id';
    const frontendUrl = `https://dusanprogram.eu/oauth-success?token=${token}&email=${user.email}`;

    return res.redirect(frontendUrl);
  }
}
