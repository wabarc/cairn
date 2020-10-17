import { Options, Webpage } from './types';
import { removeChild, isValidURL, createAbsoluteURL, convertToData } from './utils';
import { CSS } from './css';
import { URI } from './uri';
import { JSDOM, VirtualConsole } from 'jsdom';

/**
 * @see https://html.spec.whatwg.org/multipage/semantics.html
 */
export class HTML {
  // private opt: Record<string, unknown>;
  private rx: Record<'lazyImageSrc' | 'lazyImageSrcset' | 'B64DataURL' | 'srcsetURL', RegExp> = {
    lazyImageSrc: /^\s*\S+(jpg|jpeg|png|webp|gif)\S*\s*$/gm,
    lazyImageSrcset: /(jpg|jpeg|png|webp|gif)\s+\d/gm,
    // Exclude SVG, because SVG can have a meaningful image in under 133 bytes.
    B64DataURL: /data:(?!(image\/svg\+xml)).*?(;(.*?)),/gm,
    srcsetURL: /(\S+)(\s+[\d.]+[xw])?(\s*(?:,|$))/gm,
  };

  constructor(public opt: Options = {}) {
    this.opt = opt;
  }

  /**
   * Process assets within webpage
   *
   * @param {Webpage} [Webpage] if error will be thrown
   * @return {this} [Cairn] `this` command for chaning
   * @api public
   */
  async process(page: Webpage): Promise<string> {
    const { content, uri } = page;
    const virtualConsole = new VirtualConsole().on('jsdomError', (e) => console.log('JSDOM', e));
    const dom = new JSDOM(content, { virtualConsole });
    const doc = dom.window.document;

    // Prepare documents by doing these steps :
    // - Set Content-Security-Policy to make sure no unwanted request happened
    // - Apply configuration to documents
    // - Replace all noscript to divs, to make it processed as well
    // - Remove all comments in documents
    // - Convert data-src and data-srcset attribute in lazy image to src and srcset
    // - Convert relative URL into absolute URL
    // - Remove subresources integrity attribute from links
    // - Convert Open Graph Metadata
    this.setContentSecurityPolicy(doc);
    this.applyConfiguration(doc);
    this.convertNoScriptToDiv(doc, true);
    this.removeComments(doc);
    this.convertLazyImageAttrs(doc);
    this.convertRelativeURLs(doc, uri);
    this.removeLinkIntegrityAttr(doc);
    this.convertOpenGraph(doc);

    // Find all nodes which might has subresource.
    // A node might has subresource if it fulfills one of these criteria :
    // - It has inline style;
    // - It's link for icon or stylesheets;
    // - It's tag name is either style, img, picture, figure, video, audio, source, iframe or object;
    let tagName;
    const nodes: HTMLElement[] = [];
    const tags = 'link,style,script,iframe,embed,object,img,picture,figure,video,audio,source';
    const rels = [
      'icon',
      'stylesheet',
      'shortcut icon',
      'mask-icon',
      'apple-touch-icon-precomposed',
      'apple-touch-icon',
    ];
    doc.querySelectorAll(tags).forEach(function (currentNode) {
      tagName = currentNode.tagName;
      if (typeof tagName !== 'string') {
        return;
      }
      switch (tagName.toLowerCase()) {
        case 'link': {
          const rel = currentNode.getAttribute('rel');
          if (rels.includes(rel)) {
            nodes.push(currentNode);
          }
          break;
        }
        case 'style':
        case 'script':
        case 'iframe':
        case 'embed':
        case 'object':
        case 'img':
        case 'picture':
        case 'figure':
        case 'video':
        case 'audio':
        case 'source': {
          nodes.push(currentNode);
          break;
        }
      }
    });

    const css = new CSS();
    for (const node of nodes) {
      tagName = node.tagName;
      if (node.hasAttributes() && node.getAttribute('style')) {
        await css.process(node, uri);
      }

      tagName = tagName.toLowerCase();
      switch (tagName) {
        case 'style': {
          await css.process(node, uri);
          break;
        }
        case 'link': {
          await this.processLinkNode(node, uri);
          break;
        }
        case 'script': {
          await this.processScriptNode(node, uri);
          break;
        }
        case 'iframe':
        case 'embed':
        case 'object': {
          await this.processEmbedNode(node, uri);
          break;
        }
        case 'img':
        case 'picture':
        case 'figure':
        case 'video':
        case 'audio':
        case 'source': {
          await this.processMediaNode(node, uri);
          break;
        }
      }
    }

    // Revert the converted noscripts
    this.revertConvertedNoScript(doc);

    // return document back as string
    return dom.serialize();
  }

  /**
   * setContentSecurityPolicy prevent browsers from requesting any remote
   * resources by setting Content-Security-Policy to only allow from
   * inline element and data URL.
   *
   * @param {Document} doc JSDOM.window.document
   * @api private
   */
  setContentSecurityPolicy(doc: Document): void {
    // Remove existing CSP
    doc.querySelectorAll('meta[http-equiv="Content-Security-Policy"]').forEach((e) => removeChild(e));

    const policies: string[] = ["default-src 'unsafe-inline' data:;", "connect-src 'none';"];

    if (this.opt.disableJS === true) {
      policies.push("script-src 'none';");
    }

    if (this.opt.disableCSS === true) {
      policies.push("style-src 'none';");
    }

    if (this.opt.disableEmbeds === true) {
      policies.push("frame-src 'none'; child-src 'none';");
    }

    if (this.opt.disableMedias === true) {
      policies.push("image-src 'none'; media-src 'none';");
    }

    // Append the new CSP
    const head = doc.head;
    for (const policy of policies) {
      const meta = doc.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = policy;
      head.prepend(meta);
    }
  }

  /**
   * Removes or replace elements following the configuration.
   *
   * @param {Document} doc JSDOM.window.document
   * @api private
   */
  applyConfiguration(doc: Document): void {
    if (this.opt.disableJS === true) {
      // Remove script tags
      doc.querySelectorAll('script').forEach((e) => removeChild(e));

      // Remove links with javascript URL scheme
      doc.querySelectorAll('a[href*="javascript:"]').forEach((e) => e.setAttribute('href', '#'));

      // Convert noscript to div
      this.convertNoScriptToDiv(doc, false);
    }

    if (this.opt.disableCSS === true) {
      // Remove style tags
      doc.querySelectorAll('style').forEach((e) => removeChild(e));

      // Remove inline style
      doc.querySelectorAll('[style]').forEach((e) => e.removeAttribute('style'));
    }

    if (this.opt.disableEmbeds === true) {
      doc.querySelectorAll('embed,object,iframe').forEach((e) => removeChild(e));
    }

    if (this.opt.disableMedias === true) {
      doc.querySelectorAll('img,picture,figure,video,audio,source').forEach((e) => removeChild(e));
    }
  }

  /**
   * Convert all noscript to div element.
   *
   * @param {Document} doc JSDOM.window.document
   * @param {boolean} [markNewDiv] mark to noscript
   * @api private
   */
  convertNoScriptToDiv(doc: Document, markNewDiv = false): void {
    doc.querySelectorAll('noscript').forEach((e: any) => {
      const div = doc.createElement('div');
      div.innerHTML = e.innerHTML;
      if (markNewDiv) {
        div.setAttribute('data-cairn-noscript', 'true');
      }
      e.parentNode.replaceChild(div, e);
    });
  }

  /**
   * Find all comments in document then remove it.
   *
   * @param {Document} doc JSDOM.window.document
   * @api private
   */
  removeComments(doc: Document): void {
    const nodeIterator = doc.createNodeIterator(doc, 128); // NodeFilter.SHOW_COMMENT
    let currentNode;
    while ((currentNode = nodeIterator.nextNode())) {
      currentNode.remove();
    }
  }

  /**
   * Convert attributes data-src and data-srcset which often found
   * in lazy-loaded images and pictures, into basic attribute
   * src and srcset, so images that can be loaded without JS.
   *
   * @param {Document} doc JSDOM.window.document
   * @api private
   */
  convertLazyImageAttrs(doc: Document): void {
    // Convert img attributes
    doc.querySelectorAll('img,picture,figure').forEach((e) => {
      const src = (<any>e).src;
      const srcset = (<any>e).srcset;
      const tagName = e.tagName.toLowerCase();

      // In some sites (e.g. Kotaku), they put 1px square image as data uri in
      // the src attribute. So, here we check if the data uri is too short,
      // just might as well remove it.
      if (src !== undefined && src.length > 0 && this.rx.B64DataURL.test(src)) {
        return;
      }
      // let srcCouldBeRemoved: boolean = false;
      // todo

      if ((src !== '' || srcset !== '') && e.getAttribute('loading') === 'lazy') {
        return;
      }

      const attrs = e.attributes;
      for (const attr of [...attrs]) {
        if (attr.name === undefined) {
          continue;
        }
        if (['src', 'srcset'].includes(attr.name.toLowerCase())) {
          continue;
        }

        const attrVal = attr.value;
        let copyTo = '';
        if (this.rx.lazyImageSrcset.test(attrVal)) {
          copyTo = 'srcset';
        } else if (this.rx.lazyImageSrc.test(attrVal)) {
          copyTo = 'src';
        }

        if (copyTo === '' || !isValidURL(attrVal)) {
          continue;
        }

        if (['img', 'picture'].includes(tagName)) {
          e.setAttribute(copyTo, attrVal);
        } else if (tagName === 'figure') {
          const img = doc.createElement('img');
          img.setAttribute(copyTo, attrVal);
          e.appendChild(img);
        }

        e.removeAttribute(attr.name);
      }
      if (tagName === 'figure' && attrs.length === 0) {
        const img = doc.createElement('img');
        // img.setAttribute(copyTo, attrVal);
        e.appendChild(img);
      }
    });
  }

  /**
   * Converts all relative URL in document into absolute URL.
   * We do this for a, img, picture, figure, video, audio, source, link,
   * embed, iframe and object.
   *
   * @param {Document} doc JSDOM.window.document
   * @param {string} [url] original request url
   * @api private
   */
  convertRelativeURLs(doc: Document, url: string): void {
    const allowList: string[] = [
      'a',
      'link',
      'embed',
      'script',
      'iframe',
      'object',
      'img',
      'picture',
      'figure',
      'video',
      'audio',
      'source',
    ];
    const slugs: Record<string, string> = {
      a: 'href',
      link: 'href',
      embed: 'src',
      script: 'src',
      iframe: 'src',
      object: 'data',
    };
    const mediaList = ['img', 'picture', 'figure', 'video', 'audio', 'source'];
    const convert = (node, attrName: string) => {
      const oriURI = node.getAttribute(attrName);
      if (typeof oriURI === 'string') {
        const newVal: string = createAbsoluteURL(oriURI, url);
        node.setAttribute(attrName, decodeURI(newVal));
      }
    };

    const nodeIterator = doc.createNodeIterator(doc.body);
    let currentNode, tagName, attrName, name, srcset, newSrcset;
    while ((currentNode = nodeIterator.nextNode())) {
      tagName = currentNode.tagName;
      if (typeof tagName !== 'string' || currentNode.hasAttributes() === false) {
        continue;
      }
      name = tagName.toLowerCase();
      if (allowList.includes(name) === false) {
        continue;
      }

      if (slugs[name]) {
        attrName = slugs[name];
        convert(currentNode, attrName);
      }

      if (mediaList.includes(name)) {
        convert(currentNode, 'src');
        convert(currentNode, 'poster');

        srcset = currentNode.getAttribute('srcset');
        if (typeof srcset === 'string') {
          newSrcset = createAbsoluteURL(srcset, url);
          currentNode.setAttribute('srcset', decodeURI(newSrcset));
        }
      }
    }
  }

  /**
   * Removes integrity attributes from link tags.
   *
   * @param {Document} doc JSDOM.window.document
   * @api private
   */
  removeLinkIntegrityAttr(doc: Document): void {
    doc.querySelectorAll('link[integrity]').forEach((e) => {
      e.removeAttribute('integrity');
    });
  }

  /**
   * Set og:title to title when it empty.
   *
   * @param {Document} doc JSDOM.window.document
   * @api private
   */
  convertOpenGraph(doc: Document): void {
    let meta, attr, content, property;
    const title = doc.head.querySelector('title');

    doc.querySelectorAll('head > meta').forEach((e) => {
      attr = e.getAttribute('property');
      content = e.getAttribute('content');
      if (attr && typeof attr === 'string' && attr.startsWith('og:')) {
        // real property
        property = attr.substring(3);
        meta = doc.createElement('meta');
        meta.setAttribute('property', property);
        meta.setAttribute('content', content);
        (<any>e).parentNode.appendChild(meta);

        // replace title if it empty
        if (title && title.innerHTML.trim().length < 1 && property.toLowerCase() === 'title') {
          title.textContent = content;
        }
      }
    });
  }

  async processLinkNode(node: HTMLElement, baseURL = ''): Promise<void> {
    if (!node.hasAttribute('href')) {
      return;
    }

    const href = node.getAttribute('href');
    if (!href || typeof href !== 'string') {
      return;
    }

    const rel = node.getAttribute('rel');
    if (typeof rel !== 'string') {
      return;
    }

    if (rel.indexOf('icon') > -1) {
      return await this.processURLNode(node, 'href', baseURL);
    }

    // Replace <link> to <style>
    if (['preload', 'stylesheet'].includes(rel.toLowerCase())) {
      await new URI().process(href, baseURL).then((data) => {
        node.outerHTML = `<style type="text/css">${data}</style>`;
      });
    }

    return;
  }

  async processURLNode(node: HTMLElement, attrName: string, baseURL: string): Promise<void> {
    if (!node.hasAttribute(attrName)) {
      return;
    }

    const url = node.getAttribute(attrName);
    if (typeof url !== 'string' || url.trim().length < 1) {
      return;
    }

    const assetURL = createAbsoluteURL(url, baseURL);
    await convertToData(assetURL).then((data) => {
      if (data && typeof data === 'string' && data.trim().length > -1) {
        node.setAttribute(attrName, data);
      }
    });

    return;
  }

  async processScriptNode(node: HTMLElement, baseURL: string): Promise<void> {
    const src = node.getAttribute('src');
    if (!src || typeof src !== 'string' || src.trim().length < 1) {
      return;
    }

    await new URI().process(src, baseURL).then((data) => {
      node.removeAttribute('src');
      node.textContent = data;
    });

    return;
  }

  async processEmbedNode(node: HTMLElement, baseURL: string): Promise<void> {
    const attrName = node.tagName === 'OBJECT' ? 'data' : 'src';

    const url = node.getAttribute(attrName);
    if (!url || typeof url !== 'string' || url.trim().length < 1) {
      return;
    }

    const assetURL = createAbsoluteURL(url, baseURL);
    await convertToData(assetURL).then((data) => {
      if (data && typeof data === 'string' && data.trim().length > -1) {
        node.removeAttribute(attrName);
        node.setAttribute(attrName, data);
      }
    });

    return;
  }

  async processMediaNode(node: HTMLElement, baseURL: string): Promise<void> {
    const src = node.getAttribute('src');
    if (src && typeof src === 'string' && src.trim().length > 0) {
      await this.processURLNode(node, 'src', baseURL);
    }

    const poster = node.getAttribute('poster');
    if (poster && typeof poster === 'string' && poster.trim().length > 0) {
      await this.processURLNode(node, 'poster', baseURL);
    }

    const srcset = node.getAttribute('srcset');
    if (!srcset || typeof srcset !== 'string' || srcset.trim().length < 1) {
      return;
    }

    const newSets: string[] = [];
    const matches = [...decodeURI(srcset).matchAll(this.rx.srcsetURL)];
    for (const parts of matches) {
      const oldURL = parts[1];
      const targetWidth = parts[2];
      let newSet = oldURL;

      const assetURL = createAbsoluteURL(oldURL, baseURL);
      const data = await convertToData(assetURL);
      if (typeof data === 'string' && data.length > -1) {
        newSet = data;
      }

      newSet += targetWidth;
      newSets.push(newSet);
    }

    const newSrcset = newSets.join(',');
    node.setAttribute('srcset', newSrcset);

    return;
  }

  revertConvertedNoScript(doc: Document): void {
    const divs = doc.getElementsByTagName('div');

    for (const div of divs) {
      const attr = div.getAttribute('data-cairn-noscript');
      if (attr === 'true' && div.parentNode) {
        const noscript = doc.createElement('noscript');
        noscript.textContent = div.innerHTML;
        div.parentNode.replaceChild(noscript, div);
      }
    }
  }
}
