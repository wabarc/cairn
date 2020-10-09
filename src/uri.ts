import { createAbsoluteURL, HTTP } from './utils';

export class URI {
  async process(uri: string, baseURL: string): Promise<string> {
    if (uri.trim().length < 1) {
      return '';
    }

    const assetURL = createAbsoluteURL(uri, baseURL);
    const response = await new HTTP().fetch(assetURL);
    if (typeof response !== 'object' || !Object.prototype.hasOwnProperty.call(response, 'data')) {
      return '';
    }

    return response.data;
  }
}
