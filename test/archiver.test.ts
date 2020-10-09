import { Archiver } from '../src/archiver';

describe('Archiver', () => {
  const archiver = new Archiver();
  // const requests = { url: 'https://www.google.com/' };
  const requests = { url: 'https://en.wikipedia.org/wiki/Main_Page' };

  it('should called request function', () => {
    const request = archiver.request(requests);
    expect(request).toBe(archiver);
  });

  it('should run archive process', async () => {
    await archiver
      .request(requests)
      .archive()
      .then((webpage) => {
        // console.log(webpage.content);

        expect(webpage.length > 1).toBe(true);
      });
  });
});
