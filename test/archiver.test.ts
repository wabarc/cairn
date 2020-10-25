import { Archiver } from '../src/archiver';

describe('Archiver', () => {
  const archiver = new Archiver();
  const requests = { url: 'https://www.google.com/' };

  it('should called request function', () => {
    const request = archiver.request(requests);
    expect(request).toBe(archiver);
  });

  it('should run archive process', async () => {
    await archiver
      .request(requests)
      .archive()
      .then((archived) => {
        expect(archived.url).toBe(requests.url);
        expect(archived.status).toBe(200);
      });
  });
});
