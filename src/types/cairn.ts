/*
 * Copyright 2023 Wayback Archiver. All rights reserved.
 * Use of this source code is governed by the MIT
 * license that can be found in the LICENSE file.
 */

import { AxiosInstance } from 'axios';

declare global {
  namespace NodeJS {
    interface Global {
      axios: AxiosInstance;
    }
  }
}

export declare type Assets = {
  data?: object;
  contentType: string;
};

export declare type Requests = {
  input?: object;
  cookie?: string[];
  url: string;
};

export declare type Options = {
  cache?: object;

  proxy?: string;
  userAgent?: string;

  disableJS?: boolean;
  disableCSS?: boolean;
  disableEmbeds?: boolean;
  disableMedias?: boolean;

  timeout?: number;
  maxConcurrent?: number;

  isValidated?: boolean;
  cookies?: string[];
  httpClient?: object;
};

export declare type Archived = {
  url: string;
  webpage: cheerio.Root | null;
  status: 200 | 400 | 401 | 403 | 404 | 500 | 502 | 503 | 504;
  contentType: 'text/html' | 'text/plain' | 'text/*';
};

export interface Archiver {
  request(Requests): this;
  options(Options): this;
  archive(): Promise<Archived>;
}
