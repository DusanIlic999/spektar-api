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
import { Response } from 'express';

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
  async googleAuth(@Req() req) {
    // Guard automatski radi preusmeravanje
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  googleAuthRedirect(@Req() req, @Res() res: Response) {
    // Sada TS zna da je ovo Express Response
    const user = req.user;

    // Privremeni token ili ID za testiranje
    const token = 'neki_tvoj_jwt_token_ili_id';

    // Promenite localhost:5173 u URL vaše React aplikacije ako je u produkciji
    const frontendUrl = `http://localhost:5173/oauth-success?token=${token}&email=${user.email}`;

    // Express-ov Response objekat ima metodu redirect
    return res.redirect(frontendUrl);
  }
}
