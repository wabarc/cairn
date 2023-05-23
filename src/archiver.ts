/*
 * Copyright 2023 Wayback Archiver. All rights reserved.
 * Use of this source code is governed by the MIT
 * license that can be found in the LICENSE file.
 */

import { Archiver as ArchiverImpl, Options, Requests, Archived } from './types/cairn';
import { err, http, isValidURL } from './utils';
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
      err(`request url: ${url} is not specified`);
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
  async archive(): Promise<Archived> {
    const archived: Archived = { url: this.req.url, webpage: null, status: 400, contentType: 'text/html' };
    const response = await this.download(this.req.url).catch((err) => err(err));
    if (response.isAxiosError === true || !response.headers) {
      return archived;
    }

    const contentType = response.headers['content-type'] || response.headers['Content-Type'] || '';
    // Check the type of the downloaded file.
    // If it's not HTML, just return it as it is.
    if (contentType.includes('text/html') === true) {
      // If it's HTML process it
      archived.webpage = await new HTML(this.opt).process({
        uri: this.req.url,
        html: Buffer.from(response.data).toString(),
      });
    }
    archived.status = response.status || archived.status;
    archived.contentType = contentType;

    return archived;
  }

  async download(url: string, referer?: string): Promise<any> {
    if (this.opt.userAgent) {
      http.setHeader('User-Agent', this.opt.userAgent);
    }

    if (this.opt.timeout || this.opt.proxy) {
      http.setOptions({ timeout: this.opt.timeout, proxy: this.opt.proxy });
    }

    return await http.setResponseType('arraybuffer').fetch(url);
  }
}
