import axios, { AxiosResponse, ResponseType } from 'axios';
import { isValidURL } from '.';

export class HTTP {
  private timeout = 60;
  private responseType: ResponseType = 'blob';

  constructor() {
    const ua =
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36';
    if (!global.axios) {
      global.axios = axios.create({
        timeout: 1000 * this.timeout, // seconds
        headers: { 'User-Agent': ua },
      });
    }
  }

  private async do(url: string): Promise<AxiosResponse> {
    return global.axios.get(url, {
      responseType: this.responseType,
    });
  }

  setHeader(key: string, val: string | number): this {
    if (key.length < 1) {
      return this;
    }

    global.axios.defaults.headers[key] = val;

    return this;
  }

  setResponseType(responseType: ResponseType): this {
    this.responseType = responseType;

    return this;
  }

  setOptions(args: { timeout: number }): this {
    if (args.timeout) global.axios.defaults.timeout = 1000 * args.timeout;

    return this;
  }

  async fetch(url: string): Promise<any> {
    if (url.startsWith('data:') || url.startsWith('about:') || !isValidURL(url)) {
      return;
    }
    return await this.do(url)
      .then((response) => {
        // response keys: status, statusText, headers, config, request, data
        return response;
      })
      .catch((err) => {
        if (err.response) {
          console.warn(`Fetch resources error, [status: ${err.status || 0}, message: ${err.message}. url: ${url}]`);
        } else if (err.request) {
          console.warn(`Fetch resources error, [url: ${url}]`);
        } else {
          console.warn(`Fetch resources error, [message: ${err.message}. url: ${url}]`);
        }
        return err;
      });
  }
}
