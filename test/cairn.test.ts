import { Cairn, cairn } from '../src/cairn';

describe('Cairn', () => {
  it('should expose root command', () => {
    expect(cairn.constructor.name).toBe('Cairn');
  });

  test('should contain cairn in root command', () => {
    expect(cairn.constructor.name).toBe('Cairn');
  });

  it('should instantiate Cairn class', () => {
    const cairn = new Cairn();
    expect(cairn.constructor.name).toBe('Cairn');
  });
});

describe('Cairn.request', () => {
  it('should callable request function', () => {
    expect(typeof cairn.request).toBe('function');
  });
});

describe('Cairn.archive', () => {
  it('should callable archive function', () => {
    expect(typeof cairn.archive).toBe('function');
  });
});
