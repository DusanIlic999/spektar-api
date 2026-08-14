// src/common/middleware/og.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';

import { PostsService } from '../../posts/posts.service';

const BOT_UA =
  /facebookexternalhit|twitterbot|discordbot|telegrambot|whatsapp|slackbot|linkedinbot|pinterest|redditbot/i;

const POST_PATH = /^\/r\/[^/]+\/comments\/([^/]+)/;

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => HTML_ENTITIES[c] ?? c);

@Injectable()
export class OgMiddleware implements NestMiddleware {
  constructor(
    private readonly posts: PostsService,
    private readonly config: ConfigService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const match = POST_PATH.exec(req.path);
    if (!match || !BOT_UA.test(req.get('user-agent') ?? '')) {
      return next();
    }

    const appUrl = this.config.get<string>('APP_URL') ?? '';

    let post: Awaited<ReturnType<PostsService['findById']>> | null = null;
    try {
      post = await this.posts.findById(match[1]);
    } catch {
      return next();
    }
    if (!post) return next();

    const title = escapeHtml(post.title);
    const desc = escapeHtml((post.content ?? '').slice(0, 200));
    const url = escapeHtml(appUrl + req.originalUrl);
    const image = escapeHtml(post.imageUrl ?? `${appUrl}/og-default.png`);

    res.type('html').send(
      `<!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="utf-8">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Spektar">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image">
<title>${title}</title>
</head>
<body></body>
</html>`,
    );
  }
}
