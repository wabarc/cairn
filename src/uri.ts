import { createAbsoluteURL, http } from './utils';
import { css } from './css';

class URI {
  async process(url: string, baseURL: string): Promise<string> {
    let content = '';
    if (url.trim().length < 1) {
      return content;
    }

    const assetURL = createAbsoluteURL(url, baseURL);
    const response = await http.fetch(assetURL);
    if (typeof response !== 'object' || !Object.prototype.hasOwnProperty.call(response, 'data')) {
      return content;
    }
    content = response.data;

    const contentType = response.headers['content-type'] || '';
    if (contentType === 'text/css') {
      content = await css.process(Buffer.from(content).toString(), baseURL);
    }

    return content;
  }
}

const uri = new URI();
export { uri };
