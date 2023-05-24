/*
 * Copyright 2023 Wayback Archiver. All rights reserved.
 * Use of this source code is governed by the MIT
 * license that can be found in the LICENSE file.
 */

import cheerio from 'cheerio';
import { Options } from './types';
import { css } from './css';
import { uri } from './uri';
import { err, isValidURL, createAbsoluteURL, convertToData } from './utils';

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
   * @param {Object} page if error will be thrown
   * @return {cheerio.Cheerio} [cheerio.Cheerio] call .html() parse as html string
   * @api public
   */
  async process(page: { uri: string; html: string }): Promise<cheerio.Root | null> {
    const { html, uri } = page;
    if (typeof html !== 'string' || typeof uri !== 'string') {
      err('Cannot process webpage.');
    }
    const $ = cheerio.load(html, { decodeEntities: false });

    // Prepare documents by doing these steps :
    // - Set Content-Security-Policy to make sure no unwanted request happened
    // - Apply configuration to documents
    // - Replace all noscript to divs, to make it processed as well
    // - Remove all comments in documents
    // - Convert data-src and data-srcset attribute in lazy image to src and srcset
    // - Convert relative URL into absolute URL
    // - Remove subresources integrity attribute from links
    // - Convert Open Graph Metadata
    // - Set page charset as utf-8
    // - Set page source url
    this.setContentSecurityPolicy($);
    this.applyConfiguration($);
    this.convertNoScriptToDiv($, true);
    this.removeComments($);
    this.convertLazyImageAttrs($);
    this.convertRelativeURLs($, uri);
    this.removeLinkIntegrityAttr($);
    this.convertOpenGraph($);
    this.setCharset($);
    this.setSource($, uri);

    // Find all nodes which might has subresource.
    // A node might has subresource if it fulfills one of these criteria :
    // - It has inline style;
    // - It's link for icon or stylesheets;
    // - It's tag name is either style, img, picture, figure, video, audio, source, iframe or object;
    const tags = 'link,style,script,iframe,embed,object,img,picture,figure,video,audio,source';
    const rels = [
      'icon',
      'stylesheet',
      'shortcut icon',
      'mask-icon',
      'apple-touch-icon-precomposed',
      'apple-touch-icon',
    ];
    const nodes: cheerio.Element[] = [];
    $.root()
      .find(tags)
      .each((_, e) => {
        const $elem = $(e);
        const tagName = $elem.get(0).tagName;
        if (typeof tagName !== 'string') {
          return;
        }

        switch (tagName.toLowerCase()) {
          case 'link': {
            const rel = $elem.attr('rel');
            if (typeof rel === 'string' && rels.includes(rel)) {
              nodes.push(e);
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
            nodes.push(e);
            break;
          }
        }
      });

    for (const node of nodes) {
      const $node = $(node);
      const tagName = $node.get(0).tagName;
      if ($node.attr('style') !== undefined) {
        await this.processStyleAttr($node, uri);
      }

      switch (tagName.toLowerCase()) {
        case 'style': {
          await this.processStyleNode($node, uri);
          break;
        }
        case 'link': {
          await this.processLinkNode($node, uri);
          break;
        }
        case 'script': {
          await this.processScriptNode($node, uri);
          break;
        }
        case 'iframe':
        case 'embed':
        case 'object': {
          await this.processEmbedNode($node, uri);
          break;
        }
        case 'img':
        case 'picture':
        case 'figure':
        case 'video':
        case 'audio':
        case 'source': {
          await this.processMediaNode($node, uri);
          break;
        }
      }
    }

    // Revert the converted noscripts
    this.revertConvertedNoScript($);

    // return cheerio.Root
    // handle html() function convert to html string.
    return $ || null;
  }

  /**
   * setContentSecurityPolicy prevent browsers from requesting any remote
   * resources by setting Content-Security-Policy to only allow from
   * inline element and data URL.
   *
   * @param {Document} $ cheerio.Root
   * @api private
   */
  setContentSecurityPolicy($: cheerio.Root): void {
    // Remove existing CSP
    $('meta[http-equiv="Content-Security-Policy"]').remove();

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
    for (const policy of policies) {
      $('head').prepend(`<meta http-equiv="Content-Security-Policy" content="${policy}">`);
    }
  }

  /**
   * Removes or replace elements following the configuration.
   *
   * @param {Document} $ cheerio.Root
   * @api private
   */
  applyConfiguration($: cheerio.Root): void {
    if (this.opt.disableJS === true) {
      // Remove script tags
      $('script').remove();

      // Remove links with javascript URL scheme
      $('a[href*="javascript:"]').attr('href', '#');

      // Convert noscript to div
      this.convertNoScriptToDiv($, false);
    }

    if (this.opt.disableCSS === true) {
      // Remove style tags
      $('style').remove();

      // Remove inline style
      $('[style]').removeAttr('style');
    }

    if (this.opt.disableEmbeds === true) {
      $('embed,object,iframe').remove();
    }

    if (this.opt.disableMedias === true) {
      $('img,picture,figure,video,audio,source').remove();
    }
  }

  /**
   * Convert all noscript to div element.
   *
   * @param {Document} $ cheerio.Root
   * @param {boolean} [markNewDiv] mark to noscript
   * @api private
   */
  convertNoScriptToDiv($: cheerio.Root, markNewDiv = false): void {
    if (markNewDiv) {
      let $node;
      $('noscript').each((_, e) => {
        $node = $(e);
        $node.get(0).tagName = 'div';
        $node.attr('data-cairn-noscript', 'true');
      });
    } else {
      $('noscript').each((_, e) => ($(e).get(0).tagName = 'div'));
    }
  }

  /**
   * Find all comments in document then remove it.
   *
   * @param {Document} $ cheerio.Root
   * @api private
   */
  removeComments($: cheerio.Root): void {
    $.root()
      .find('*')
      .contents()
      .filter((_, e) => {
        return e.type === 'comment';
      })
      .remove();
  }

  /**
   * Convert attributes data-src and data-srcset which often found
   * in lazy-loaded images and pictures, into basic attribute
   * src and srcset, so images that can be loaded without JS.
   *
   * @param {Document} $ cheerio.Root
   * @api private
   */
  convertLazyImageAttrs($: cheerio.Root): void {
    // Convert img attributes
    let $e;
    $('img,picture,figure').each((_, e) => {
      $e = $(e);
      const src = $e.attr('src');
      const srcset = $e.attr('srcset');
      const tagName = $e.get(0).tagName.toLowerCase();

      // In some sites (e.g. Kotaku), they put 1px square image as data uri in
      // the src attribute. So, here we check if the data uri is too short,
      // just might as well remove it.
      if (src !== undefined && src.length > 0 && this.rx.B64DataURL.test(src)) {
        return;
      }
      // let srcCouldBeRemoved: boolean = false;
      // todo

      if ((src || srcset) && $e.attr('loading') === 'lazy') {
        return;
      }

      for (const [attrName, attrVal] of Object.entries($e.get(0).attribs)) {
        if (attrName === undefined || typeof attrVal !== 'string') {
          continue;
        }
        if (['src', 'srcset'].includes(attrName.toLowerCase())) {
          continue;
        }

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
          $(e).attr(copyTo, attrVal);
        } else if (tagName === 'figure' && $(e).children('img, picture').length === 0) {
          const img = `<img ${copyTo}=${attrVal}>`;
          $(e).append(img);
        }

        $(e).removeAttr(attrName);
      }
    });
  }

  /**
   * Converts all relative URL in document into absolute URL.
   * We do this for a, img, picture, figure, video, audio, source, link,
   * embed, iframe and object.
   *
   * @param {Document} $ cheerio.Root
   * @param {string} [url] original request url
   * @api private
   */
  convertRelativeURLs($: cheerio.Root, url: string): void {
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
      const oriURI = $(node).attr(attrName);
      if (typeof oriURI === 'string') {
        let newVal: string = createAbsoluteURL(oriURI, url);
        try {
          newVal = decodeURI(newVal);
        } catch (_) {}
        $(node).attr(attrName, newVal);
      }
    };

    let $e;
    $('*').each((_, e) => {
      $e = $(e);
      let tagName = $e.get(0).tagName;
      if (typeof tagName !== 'string' || Object.entries($e.get(0).attribs).length === 0) {
        return;
      }

      tagName = tagName.toLowerCase();
      if (allowList.includes(tagName) === false) {
        return;
      }

      if (slugs[tagName]) {
        const attrName = slugs[tagName];
        convert(e, attrName);
      }

      if (mediaList.includes(tagName)) {
        convert(e, 'src');
        convert(e, 'poster');

        const srcset = $(e).attr('srcset');
        if (typeof srcset === 'string') {
          const newSrcset = createAbsoluteURL(srcset, url);
          try {
            $(e).attr('srcset', decodeURI(newSrcset));
          } catch (_) {
            return;
          }
        }
      }
    });
  }

  /**
   * Removes integrity attributes from link tags.
   *
   * @param {Document} $ cheerio.Root
   * @api private
   */
  removeLinkIntegrityAttr($: cheerio.Root): void {
    $('link[integrity]').removeAttr('integrity');
  }

  /**
   * Set og:title to title when it empty.
   *
   * @param {Document} $ cheerio.Root
   * @api private
   */
  convertOpenGraph($: cheerio.Root): void {
    const title = $('head > title').text().trim();

    $('head > meta').each((_, e) => {
      const $elem = $(e);
      const attr = $elem.attr('property');
      const content = $elem.attr('content');
      if (attr && typeof attr === 'string' && attr.startsWith('og:')) {
        // real property
        const property = attr.substring(3);
        if (!$elem.attr(property)) {
          const meta = `<meta property="${property}" content="${content}"/>`;
          $elem.parent().append(meta);

          // replace title if it empty
          if (title.length < 1 && property.toLowerCase() === 'title') {
            $('head > title').remove();
            $('head').prepend(`<title>${content}</title>`);
          }
        }
      }
    });
  }

  /**
   * Set webpage charset as UTF-8
   *
   * @param {Document} $ cheerio.Root
   * @api private
   */
  setCharset($: cheerio.Root): void {
    // Remove existing charset in meta
    $('meta[charset]').remove();

    // Append the new charset
    $('head').prepend(`<meta charset="utf-8">`);
  }

  /**
   * Set source webpage url
   *
   * @param {Document} $ cheerio.Root
   * @param {string} url
   * @api private
   */
  setSource($: cheerio.Root, url: string): void {
    // Append the source url meta
    $('head').append(`<meta property="source:url" content="${url}">`);
  }

  async processStyleAttr(node: cheerio.Cheerio, baseURL = ''): Promise<void> {
    const style = node.attr('style');
    if (!style || style.length === 0) {
      return;
    }

    const newStyle = await css.process(style, baseURL);
    if (newStyle.length > 0) {
      node.attr('style', newStyle);
    }

    return;
  }

  async processStyleNode(node: cheerio.Cheerio, baseURL = ''): Promise<void> {
    const style = node.html();
    if (!style || style.length === 0) {
      return;
    }

    const newStyle = await css.process(style, baseURL);
    if (newStyle.length > 0) {
      node.html(newStyle);
    }

    return;
  }

  async processLinkNode(node: cheerio.Cheerio, baseURL = ''): Promise<void> {
    const href = node.attr('href');
    if (!href || href.length === 0) {
      return;
    }

    const rel = node.attr('rel');
    if (!rel || rel.length === 0) {
      return;
    }

    if (rel.indexOf('icon') > -1) {
      return await this.processURLNode(node, 'href', baseURL);
    }

    // Replace <link> to <style>
    if (['preload', 'stylesheet'].includes(rel.toLowerCase())) {
      await uri.process(href, baseURL).then((data) => {
        node.replaceWith(`<style type="text/css">${data}</style>`);
      });
    }

    return;
  }

  async processURLNode(node: cheerio.Cheerio, attrName: string, baseURL: string): Promise<void> {
    const url = node.attr(attrName);
    if (typeof url !== 'string' || url.trim().length < 1) {
      return;
    }

    const assetURL = createAbsoluteURL(url, baseURL);
    await convertToData(assetURL).then((data) => {
      if (data && typeof data === 'string' && data.trim().length > -1) {
        node.attr(attrName, data);
      }
    });

    return;
  }

  async processScriptNode(node: cheerio.Cheerio, baseURL: string): Promise<void> {
    const src = node.attr('src');
    if (!src || typeof src !== 'string' || src.trim().length < 1) {
      return;
    }

    await uri.process(src, baseURL).then((data) => {
      node.removeAttr('src');
      node.text(data);
    });

    return;
  }

  async processEmbedNode(node: cheerio.Cheerio, baseURL: string): Promise<void> {
    const attrName = node.get(0).tagName === 'object' ? 'data' : 'src';

    const url = node.attr(attrName);
    if (!url || typeof url !== 'string' || url.trim().length < 1) {
      return;
    }

    const assetURL = createAbsoluteURL(url, baseURL);
    await convertToData(assetURL).then((data) => {
      if (data && typeof data === 'string' && data.trim().length > -1) {
        node.removeAttr(attrName);
        node.attr(attrName, data);
      }
    });

    return;
  }

  async processMediaNode(node: cheerio.Cheerio, baseURL: string): Promise<void> {
    const src = node.attr('src');
    if (src && typeof src === 'string' && src.trim().length > 0) {
      await this.processURLNode(node, 'src', baseURL);
    }

    const poster = node.attr('poster');
    if (poster && typeof poster === 'string' && poster.trim().length > 0) {
      await this.processURLNode(node, 'poster', baseURL);
    }

    let srcset = node.attr('srcset');
    if (!srcset || typeof srcset !== 'string' || srcset.trim().length < 1) {
      return;
    }

    try {
      srcset = decodeURI(srcset);
    } catch (_) {}

    let newSets: string[] = [];
    const matches = [...srcset.matchAll(this.rx.srcsetURL)];
    for (const parts of matches) {
      if (!parts[1] || typeof parts[1] !== 'string') {
        continue;
      }
      let newSet = parts[1];

      const assetURL = createAbsoluteURL(parts[1], baseURL);
      const data = await convertToData(assetURL);
      if (typeof data === 'string' && data.length > -1) {
        newSet = data;
      }

      newSet += parts[2] || '';
      newSets.push(newSet);
    }

    node.attr('srcset', newSets.join(','));
    newSets = [];

    return;
  }

  revertConvertedNoScript($: cheerio.Root): void {
    let $e;
    $('div').each((_, e) => {
      $e = $(e);
      if ($e.attr('data-cairn-noscript') === 'true') {
        $e.get(0).tagName = 'noscript';
      }
    });
    return;
  }
}
