/**
 * Felles grensesnitt for alle sosiale plattformer.
 * Resten av appen snakker bare med dette, aldri direkte med Meta eller LinkedIn.
 * Da kan en adapter byttes ut (for eksempel med en ferdig publiseringstjeneste)
 * uten at noe annet endres.
 */

export type Platform = "facebook" | "instagram" | "linkedin";

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface ConnectedAccount {
  platform: Platform;
  externalId: string;
  name: string;
  tokens: TokenSet;
}

export interface PublishInput {
  externalAccountId: string;
  text: string;
  /** Offentlige URL-er til bilder. Instagram krever minst ett. */
  mediaUrls: string[];
}

export interface PublishResult {
  externalPostId: string;
  publishedAt: Date;
}

export interface PostMetrics {
  impressions?: number;
  reactions?: number;
  comments?: number;
  clicks?: number;
}

export interface PublishingAdapter {
  platform: Platform;
  /** URL kunden sendes til for å gi tilgang. */
  getConnectUrl(state: string, redirectUri: string): string;
  /** Bytter koden fra plattformen mot tokens og lister kontoene kunden kan velge. */
  handleCallback(code: string, redirectUri: string): Promise<ConnectedAccount[]>;
  publish(tokens: TokenSet, input: PublishInput): Promise<PublishResult>;
  refreshToken(tokens: TokenSet): Promise<TokenSet>;
  fetchMetrics(tokens: TokenSet, externalPostId: string): Promise<PostMetrics>;
}

export class NotImplementedError extends Error {
  constructor(platform: Platform, method: string) {
    super(`${platform}.${method} er ikke bygget ennå`);
    this.name = "NotImplementedError";
  }
}
