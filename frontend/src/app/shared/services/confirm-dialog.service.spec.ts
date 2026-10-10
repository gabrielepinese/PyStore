import { ConfirmDialogService } from './confirm-dialog.service';

describe('ConfirmDialogService', () => {
  let service: ConfirmDialogService;

  beforeEach(() => {
    service = new ConfirmDialogService();
  });

  it('has no pending request initially', () => {
    expect(service.request()).toBeNull();
  });

  it('publishes the request passed to confirm()', () => {
    void service.confirm({ title: 'Remove this?', description: 'Cannot be undone.' });

    expect(service.request()?.title).toBe('Remove this?');
    expect(service.request()?.description).toBe('Cannot be undone.');
  });

  it('resolves true and clears the request when respond(true) is called', async () => {
    const result = service.confirm({ title: 'Remove this?' });

    service.respond(true);

    await expect(result).resolves.toBe(true);
    expect(service.request()).toBeNull();
  });

  it('resolves false when respond(false) is called', async () => {
    const result = service.confirm({ title: 'Remove this?' });

    service.respond(false);

    await expect(result).resolves.toBe(false);
  });

  it('does nothing when respond() is called with no pending request', () => {
    expect(() => service.respond(true)).not.toThrow();
    expect(service.request()).toBeNull();
  });

  it('replaces a pending request if confirm() is called again before it resolves', async () => {
    const first = service.confirm({ title: 'First' });
    const second = service.confirm({ title: 'Second' });

    expect(service.request()?.title).toBe('Second');

    service.respond(true);

    await expect(second).resolves.toBe(true);
    // The first promise is simply left unresolved — this documents that
    // behavior rather than asserting a specific outcome for it.
    void first;
  });
});
