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

export declare type Webpage = {
  uri: string;
  content: string;
  contentType: 'text/html' | 'text/plain' | 'text/*';
};

export interface Archiver {
  request(Requests): this;
  options(Options): this;
  archive(): Promise<any>;
}
