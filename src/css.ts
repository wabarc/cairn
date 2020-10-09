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
        const html = node.outerHTML.replace(u, data);
        node.outerHTML = html;
      }
    };

    const inlineStyle = node.getAttribute('style');
    if (inlineStyle && typeof inlineStyle === 'string') {
      const regex = /(?<=url\((?!['"]?(?:data:)))\s*(['"]?)(.*)\1\)/gm;
      const m = regex.exec(inlineStyle);
      if (m !== null && m.length > 1) {
        await convert(m[2], uri);
      }
      return;
    }

    let block = node.innerHTML;
    if (!block || typeof block !== 'string') {
      return;
    }

    block = block.replace(/\(['|"]/gm, '(');
    block = block.replace(/['|"]\)/gm, ')');

    const regex = /(?<=url\().*?(?=\))/gm;
    const m = regex.exec(block);
    if (m !== null && m.length > 0) {
      await convert(m[0], uri);
    }
    return;
  }
}
