import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthGuard } from './oauth.guard';

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
  googleAuthRedirect(@Req() req, @Res() res: Response) {
    // Ovde se nalaze podaci koje je Google vratio (ime, email, slika...)
    const user = req.user;

    // TODO: Ovde u produkciji praviš svoj JWT token na osnovu 'user' objekta
    // Za sada šaljemo samo osnovne podatke ili privremeni string da testiramo React
    const token = 'neki_tvoj_jwt_token_ili_id';

    // Promeni ovo na URL tvoje React aplikacije u produkciji ili lokalno!
    // Ako testiraš lokalno React, ovde stavi http://localhost:5173/oauth-success
    // Ako ti je React na Vercelu/Netlify-u, stavi tu adresu.
    const frontendUrl = `http://localhost:5173/oauth-success?token=${token}&email=${user.email}`;

    // Ovo preusmerava brauzer sa bekenda direktno na frontend aplikaciju
    return res.redirect(frontendUrl);
  }
}
