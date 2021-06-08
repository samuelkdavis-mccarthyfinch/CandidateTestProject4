import { hello } from '../index';

describe('hello', () => {
  it('says the right thing', () => {
    expect(hello('world')).toBe('Hello world');
  });
});
