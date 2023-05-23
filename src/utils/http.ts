/*
 * Copyright 2023 Wayback Archiver. All rights reserved.
 * Use of this source code is governed by the MIT
 * license that can be found in the LICENSE file.
 */

import axios, { ResponseType } from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { isValidURL } from '.';
import chardet from 'chardet';
import iconv from 'iconv-lite';

class HTTP {
  private timeout = 60;
  private responseType: ResponseType = 'arraybuffer';

  constructor() {
    // Proxy environment not working for axios, reset it to avoid getting caught.
    process.env.https_proxy = '';
    process.env.http_proxy = '';
    process.env.all_proxy = '';
    process.env.HTTPS_PROXY = '';
    process.env.HTTP_PROXY = '';
    process.env.ALL_PROXY = '';

    const ua =
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36';
    if (!global.axios) {
      global.axios = axios.create({
        timeout: 1000 * this.timeout, // seconds
        headers: { 'User-Agent': ua },
        responseType: this.responseType,
      });
      global.axios.interceptors.response.use(function (response) {
        if (response.data === undefined) {
          return response;
        }
        let charset = response.headers['content-type'] || '';
        if (!charset || typeof charset !== 'string' || charset.includes('charset') === false) {
          charset = chardet.detect(Buffer.from(response.data));
        }

        // refer: https://github.com/ashtuchkin/iconv-lite/wiki/Supported-Encodings
        const types = { big5: 'big5', gb2312: 'gb2312', gbk: 'gbk', gb18030: 'gb18030' };
        for (const [type, encoding] of Object.entries(types)) {
          response.data = charset.toLowerCase().includes(type) ? iconv.decode(response.data, encoding) : response.data;
        }

        return response;
      });
    }
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

  setOptions(args: { timeout?: number; proxy?: string }): this {
    if (args.timeout) global.axios.defaults.timeout = 1000 * args.timeout;

    if (args.proxy) {
      const proxy = new URL(args.proxy);
      let agent;
      if (proxy.protocol?.indexOf(`socks`) == 0) {
        agent = new SocksProxyAgent(proxy.toString());
      } else if (proxy.protocol?.indexOf(`https`) == 0) {
        agent = new HttpsProxyAgent(proxy.toString());
      } else if (proxy.protocol?.indexOf(`http`) == 0) {
        agent = new HttpProxyAgent(proxy.toString());
      }
      global.axios.defaults.httpsAgent = agent;
      global.axios.defaults.httpAgent = agent;
    }

    return this;
  }

  async fetch(url: string): Promise<any> {
    if (url.startsWith('data:') || url.startsWith('about:') || !isValidURL(url)) {
      return;
    }

    // response keys: status, statusText, headers, config, request, data
    return await global.axios.get(url).catch((err) => {
      if (err.response) {
        console.warn(
          `Cairn: fetch resource failed, [status: ${err.status || 0}, message: ${err.message}, url: ${url}]`,
        );
      } else if (err.request) {
        console.warn(`Cairn: fetch resource failed, [url: ${url}, message: error request.]`);
      } else {
        console.warn(`Cairn: fetch resource failed, [message: ${err.message}, url: ${url}]`);
      }
      return err;
    });
  }
}

const http = new HTTP();
export { http };
