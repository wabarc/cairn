import { createAbsoluteURL, convertToData } from './utils';

class CSS {
  async process(style: string, baseURL: string): Promise<string> {
    if (style === undefined || typeof style !== 'string') {
      return '';
    }

    const convert = async (url: string, baseURL: string): Promise<string> => {
      const assetURL = createAbsoluteURL(url, baseURL);
      const data = await convertToData(assetURL);

      return data || '';
    };

    style = style.replace(/\(['|"]/gm, '(').replace(/['|"]\)/gm, ')');
    const regexp = /(?<=url\().*?(?=\))/gm;
    const matches = style.matchAll(regexp);

    const rules = new Map();
    for (const m of matches) {
      if (m !== null && m.length > 0) {
        const resourceURL = m[0];
        if (resourceURL.startsWith('data:')) {
          continue;
        }
        const data = await convert(resourceURL, baseURL);
        rules.set(resourceURL, Buffer.from(data).toString());
      }
    }

    for (const [url, data] of rules) {
      if (data.length > 0) {
        const regex = url.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        style = style.replace(new RegExp(regex, 'g'), data);
      }
    }

    return style;
  }
}

const css = new CSS();
export { css };
