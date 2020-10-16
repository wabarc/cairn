import { createAbsoluteURL, convertToData } from './utils';

export class CSS {
  async process(node: HTMLElement | HTMLStyleElement, uri = ''): Promise<void> {
    if (!node || typeof node !== 'object') {
      return;
    }

    const convert = async (u: string, n: string) => {
      const assetURL = createAbsoluteURL(u, n);
      const data = await convertToData(assetURL);
      if (data.length > 0) {
        const regex = u.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        node.outerHTML = node.outerHTML.replace(new RegExp(regex, 'g'), data);
      }
    };

    const transform = async (text: string, regexp: RegExp) => {
      const matches = [...new Set(text.matchAll(regexp))];
      for (const m of matches) {
        if (m !== null && m.length > 0) {
          await convert(m[0], uri);
        }
      }
      return;
    };

    const inlineStyle = node.getAttribute('style');
    if (inlineStyle && typeof inlineStyle === 'string') {
      const regex = /(?<=url\((?!['"]?(?:data:)))\s*(['"]?)(.*)\1\)/gm;
      await transform(inlineStyle, regex);
      return;
    }

    let block = node.innerHTML;
    if (!block || typeof block !== 'string') {
      return;
    }

    block = block.replace(/\(['|"]/gm, '(');
    block = block.replace(/['|"]\)/gm, ')');

    const regex = /(?<=url\().*?(?=\))/gm;
    await transform(block, regex);

    return;
  }
}
