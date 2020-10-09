import { Archiver as ArchiverImpl, Options, Requests, Webpage } from './types/cairn';
import { Err, HTTP, isValidURL } from './utils';
import { HTML } from './html';

export class Archiver implements ArchiverImpl {
  private opt: Options;
  private req: Requests;

  constructor() {
    this.opt = {};
    this.req = {
      url: '',
    };
  }

  /**
   * Set archival request data.
   *
   * @param {object} [Requests] if error will be thrown
   * @return {this} [Cairn] `this` command for chaning
   * @api public
   */
  request(r: Requests): this {
    const { url } = r;
    if (!isValidURL(url)) {
      Err('request url is not specified');
    }

    this.req.url = url;

    return this;
  }

  /**
   * Set archival options data.
   *
   * @param {object} [Options] if error will be thrown
   * @return {this} [Cairn] `this` command for chaning
   * @api public
   */
  options(o: Options): this {
    this.opt = o;

    return this;
  }

  /**
   * Perform archival request.
   *
   * @return {Promise} with string
   * @api public
   */
  async archive(): Promise<string> {
    return await (async () => {
      let webpage: Webpage;
      let process = true;

      return await this.download(this.req.url)
        .then((response) => {
          // Check the type of the downloaded file.
          // If it's not HTML, just return it as it is.
          const contentType = response.headers['content-type'] || '';
          process = contentType.includes('text/html');
          webpage = { uri: this.req.url, content: response.data, contentType: contentType };
        })
        .then(async () => {
          if (process) {
            // If it's HTML process it
            webpage.content = await new HTML(this.opt).process(webpage);
          }
          return webpage.content;
        })
        .catch((err) => {
          console.warn(err);
          return webpage.content;
        });
    })();
  }

  async download(url: string, referer?: string): Promise<any> {
    const http = new HTTP();

    if (this.opt.userAgent) {
      http.setHeader('User-Agent', this.opt.userAgent);
    }

    return await http.fetch(url).catch((err) => Err(err));
  }
}
