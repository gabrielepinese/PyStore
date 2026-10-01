import { TokenStorageService } from './token-storage.service';

describe('TokenStorageService', () => {
  let service: TokenStorageService;

  beforeEach(() => {
    service = new TokenStorageService();
  });

  it('returns null when no token has been set', () => {
    expect(service.getAccessToken()).toBeNull();
  });

  it('returns the token that was set', () => {
    service.setAccessToken('abc123');
    expect(service.getAccessToken()).toBe('abc123');
  });

  it('clears the stored token', () => {
    service.setAccessToken('abc123');
    service.clear();
    expect(service.getAccessToken()).toBeNull();
  });
});
