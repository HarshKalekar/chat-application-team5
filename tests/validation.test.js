const { validateMessageContent } = require('../src/modules/messaging/validation');

describe('validateMessageContent (CA-23)', () => {
  it('accepts a normal message', () => {
    expect(validateMessageContent('Hello')).toBe('Hello');
  });
  it('accepts exactly 2000 characters', () => {
    expect(() => validateMessageContent('a'.repeat(2000))).not.toThrow();
  });
  it('rejects 2001 characters with MESSAGE_TOO_LONG', () => {
    expect(() => validateMessageContent('a'.repeat(2001))).toThrow(
      expect.objectContaining({ code: 'MESSAGE_TOO_LONG' })
    );
  });
  it.each([['empty string', ''], ['only spaces', '   '], ['tabs/newlines', '\t\n'], ['undefined', undefined], ['null', null], ['number', 5]])(
    'rejects %s',
    (_name, value) => {
      expect(() => validateMessageContent(value)).toThrow(
        expect.objectContaining({ code: 'VALIDATION_ERROR' })
      );
    }
  );
});
