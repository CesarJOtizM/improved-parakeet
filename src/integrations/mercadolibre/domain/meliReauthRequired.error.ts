import { DomainError } from '@shared/domain/result';

export class MeliReauthRequiredError extends DomainError {
  constructor(connectionId: string) {
    super(
      `MercadoLibre connection ${connectionId} requires re-authentication`,
      'MELI_REAUTH_REQUIRED',
      { connectionId }
    );
  }
}
