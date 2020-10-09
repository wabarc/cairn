import axios, { AxiosResponse, ResponseType } from 'axios';
import { isValidURL } from '.';

export class HTTP {
  private timeout = 5;
  private headers: Record<string, unknown> = {};
  private responseType: ResponseType = 'blob';

  constructor() {
    this.headers['User-Agent'] =
      this.headers['User-Agent'] ||
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36';
  }

  private async do(url: string): Promise<AxiosResponse> {
    return axios({
      method: 'get',
      url: url,
      params: {},
      timeout: 1000 * this.timeout, // seconds
      headers: this.headers,
      responseType: this.responseType,
    });
  }

  setHeader(key: string, val: string | number): this {
    if (key.length < 1) {
      return this;
    }

    this.headers[key] = val;

    return this;
  }

  setResponseType(responseType: ResponseType): this {
    this.responseType = responseType;

    return this;
  }

  setOptions(args: { timeout: number }): this {
    this.timeout = args.timeout || this.timeout;

    return this;
  }

  async fetch(url: string): Promise<any> {
    if (!isValidURL(url) || url.startsWith('data:')) {
      return;
    }
    return await this.do(url)
      .then((response) => {
        // response keys: status, statusText, headers, config, request, data
        return response;
      })
      .catch((err) => {
        if (err.response) {
          console.warn(`Fetch resources error, [status: ${err.status || 0}, message: ${err.message}]`);
        } else if (err.request) {
          console.warn(`Fetch resources error, [url: ${url}]`);
        } else {
          console.warn(`Fetch resources error, [message: ${err.message}]`);
        }
      });
  }
}
