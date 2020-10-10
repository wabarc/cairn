import { Webpage } from '../src/types/cairn';
import { HTML } from '../src/html';
import { CSS } from '../src/css';
import { server } from './server';
import { JSDOM } from 'jsdom';

const content = `
<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cairn</title>
</head>
<body>
  <style>
    html,body {
      height: 100%;
      margin: 0;
      background-image:url('https://github.com/favicon.ico');
      border-image:url("https://github.com/favicon.ico");
    }
  </style>
</body>
</html>
`;
const webpage: Webpage = {
  uri: 'https://www.google.com/',
  content: content,
  contentType: 'text/html',
};

let dom = new JSDOM(content);
let document = dom.window.document;

const html = new HTML();
const port = 9112;

/**
 * @testEnvironment jsdom
 */
beforeEach(() => {
  dom = new JSDOM(content);
  document = dom.window.document;

  server.listen(port);
});

afterEach(() => {
  html.opt = {};
  dom.window.close();
  server.close();
  // console.log(process.memoryUsage().heapUsed / 1024 / 1024);
});

describe('HTML', () => {
  test('setContentSecurityPolicy', () => {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = 'some rules; report-uri /cairn/';
    document.getElementsByTagName('head')[0].appendChild(meta);

    // Remove existing CSP
    html.setContentSecurityPolicy(document);
    expect(dom.serialize()).toEqual(expect.not.stringContaining('cairn'));
  });

  test('applyConfiguration', () => {
    const script = document.createElement('script');
    script.src = '/';
    document.getElementsByTagName('head')[0].appendChild(script);

    const a = document.createElement('a');
    a.href = 'javascript::onclick();';
    a.style = 'color:blue;';
    document.getElementsByTagName('body')[0].appendChild(a);

    for (const tag of ['embed', 'iframe', 'object']) {
      const ele = document.createElement(tag);
      ele.src = `/assets/${tag}.src`;
      document.getElementsByTagName('body')[0].appendChild(ele);
    }
    for (const tag of ['img', 'picture', 'figure', 'video', 'audio', 'source']) {
      const ele = document.createElement(tag);
      ele.src = `/assets/${tag}.src`;
      document.getElementsByTagName('body')[0].appendChild(ele);
    }

    // Remove script tag
    html.opt = { disableJS: true, disableCSS: true, disableEmbeds: true, disableMedias: true };
    html.applyConfiguration(document);

    const raw = dom.serialize();
    expect(raw).toEqual(expect.not.stringContaining('script'));
    expect(raw).toEqual(expect.not.stringContaining('javascript'));
    expect(raw).toEqual(expect.stringContaining('href="#"'));
    expect(raw).toEqual(expect.not.stringContaining('style'));
    for (const tag of ['embed', 'iframe', 'object']) {
      expect(raw).toEqual(expect.not.stringContaining(tag));
    }
    for (const tag of ['img', 'picture', 'figure', 'video', 'audio', 'source']) {
      expect(raw).toEqual(expect.not.stringContaining(tag));
    }

    // Clean test data
    script.remove();
    a.remove();
  });

  test('convertNoScriptToDiv', () => {
    // <noscript>
    //   <!-- anchor linking to external file -->
    //   <a href="https://www.mozilla.com/">External Link 1</a>
    // </noscript>
    const noscript = document.createElement('noscript');
    const a = document.createElement('a');
    a.href = 'https://www.mozilla.com/';
    a.append('Mozilla');
    noscript.append(a);
    document.getElementsByTagName('body')[0].appendChild(noscript);

    // Convert noscript
    html.convertNoScriptToDiv(document);
    const raw = dom.serialize();
    expect(raw).toEqual(expect.not.stringContaining('<noscript>'));
    expect(raw).toEqual(expect.stringContaining('Mozilla'));

    // Convert noscript and mark new div
    const nscript = document.createElement('noscript');
    const elem = document.createElement('a');
    elem.href = 'https://www.mozilla.com/';
    elem.append('Mozilla');
    nscript.append(elem);
    document.getElementsByTagName('body')[0].appendChild(nscript);

    html.convertNoScriptToDiv(document, true);
    expect(dom.serialize()).toEqual(expect.stringContaining('data-cairn-noscript'));

    // Clean test data
    noscript.remove();
    a.remove();
  });

  test('removeComments', () => {
    const text = 'some comment';
    const comment = document.createComment(text);
    document.getElementsByTagName('body')[0].appendChild(comment);

    const raw = dom.serialize();
    expect(raw).toEqual(expect.stringContaining(text));
    // Remove comments
    html.removeComments(document);
    expect(dom.serialize()).toEqual(expect.not.stringContaining(text));
  });

  test('convertLazyImageAttrs', () => {
    const images = `
  <div><a href="#"><img src="elva-800w.jpg" alt="Chris standing up holding his daughter Elva"></a></div>
  
  <picture>
    <source media="(max-width: 799px)" srcset="elva-480w-close-portrait.jpg">
    <source media="(min-width: 800px)" srcset="elva-800w.jpg">
    <img src="elva-800w.jpg" alt="Chris standing up holding his daughter Elva">
  </picture>
  
  <img/>
  <img src="image.jpg" alt="..." loading="lazy">
  <img src="data:image/png;base64,img1VBABMmMjCCKgQlMIhGMu3btAquY9mMDWBhDBQAutwfDrUlKzQAAAABJRU5ErkJggg==" />
  <img src="data:image/png;base64,img2VBDBQAutwfDrUlKzQAAAABJRU5ErkJggg==" data-src="https://cairn-data-uri.org" />
  
  <img src="data:image/svg+xml;base64,ABMmMjCCKgQlMIhGMu3btAquY9mMDWBhDBQAutwfDrUlKzQAAAABJRU5ErkJggg==" />
  
  <img alt="..." data-src="https://example.org/no-src-image.png" loading="lazy">
  <img src="" alt="..." data-src="https://example.org/image.png" loading="lazy">

  <figure>
    <img src="https://developer.mozilla.org/static/img/favicon144.png" alt="The beautiful MDN logo.">
  </figure>
  	  `;

    document.getElementsByTagName('body')[0].innerHTML += images;
    let raw = dom.serialize();
    // Before assert
    expect(raw).toEqual(expect.stringContaining('data-src="https://example.org/image.png"'));

    html.convertLazyImageAttrs(document);
    raw = dom.serialize();
    expect(raw).toEqual(expect.stringContaining('src="data:image/svg+xml;base64'));
    expect(raw).toEqual(expect.not.stringContaining('data-src="https://example.org/image.png"'));
    expect(raw).toEqual(expect.stringContaining('src="https://example.org/image.png"'));
    // expect(dom.serialize()).toEqual(expect.not.stringContaining('figure'));
  });

  test('convertRelativeURLs', () => {
    const oriURL = webpage.uri;
    const testContent = `
  <div><a href="#">url</a></div>
  <div><img src="data:image/png;base64,imgConvertRelativeaucviDAAA==" /></div>
  <div><a href="/style.css">url</a></div>
  <div><div><div><embed type="image/svg" src="/media/cc0-videos/flower.png"></div></div></div>
        `;
    document.getElementsByTagName('body')[0].innerHTML += testContent;
    let raw = dom.serialize();

    expect(raw).toEqual(expect.not.stringContaining(oriURL));

    html.convertRelativeURLs(document, oriURL);
    raw = dom.serialize();
    expect(raw).toEqual(expect.stringContaining(`href="#"`));
    expect(raw).toEqual(expect.stringContaining(`${oriURL}media/cc0-videos/flower.png`));
    expect(raw).toEqual(expect.stringContaining(`${oriURL}style.css`));
  });

  test('removeLinkIntegrityAttr', () => {
    const attr = 'integrity';
    const testContent = `
  <link rel="icon" href="favicon.ico" ${attr}="crc-XRKap7fdgc"></link>
  <link rel="icon" href="favicon.ico" ${attr}="crc-XRKap7fdgd"></link>
  `;
    document.getElementsByTagName('body')[0].innerHTML += testContent;

    html.removeLinkIntegrityAttr(document);
    const raw = dom.serialize();
    expect(raw).toEqual(expect.not.stringContaining(`${attr}`));
    expect(raw).toEqual(expect.stringContaining(`link`));
  });

  test('convertOpenGraph', () => {
    const testContent = `
<html prefix="og: https://ogp.me/ns#">
<head>
<title>The Rock (1996)</title>
<meta property="og:title" content="The Rock" />
<meta property="og:type" content="video.movie" />
<meta property="og:url" content="https://www.imdb.com/title/tt0117500/" />
<meta property="og:image" content="https://ia.media-imdb.com/images/rock.jpg" />
</head>
...
</html>
`;
    dom = new JSDOM(testContent);
    document = dom.window.document;

    html.convertOpenGraph(document);

    expect(document.querySelector('head > meta[property="title"]').content).toBe('The Rock');
    expect(document.querySelector('head > meta[property="type"]').content).toBe('video.movie');
  });

  it('should process icon link node', async () => {
    const testContent = `<link rel="icon" href="favicon.ico"></link>`;
    document.getElementsByTagName('head')[0].innerHTML = testContent;

    await html.processLinkNode(document.querySelector('link'), `http://localhost:${port}`);
    const raw = dom.serialize();
    expect(raw).toEqual(expect.stringMatching(/data:.*\/.*;base64/gm));
  });

  it('should process stylesheet link node', async () => {
    const css = 'index.css';
    const styleLink = `<link rel="stylesheet" href="http://localhost:${port}/${css}"></link>`;
    document.getElementsByTagName('body')[0].innerHTML = styleLink;

    await html.processLinkNode(document.querySelector('link'), `http://localhost:${port}`);
    const raw = dom.serialize();

    expect(raw).toEqual(expect.not.stringMatching(`/${css}|link|stylesheet|href/gm`));
  });

  it('should process script link node', async () => {
    const resource = 'index.js';
    const content = `<script src="http://localhost:${port}/${resource}"></script>`;
    document.getElementsByTagName('head')[0].innerHTML += content;

    await html.processScriptNode(document.querySelector('script'), `http://localhost:${port}`);
    const raw = dom.serialize();

    expect(raw).toEqual(expect.not.stringMatching(`/${resource}|src/gm`));
    expect(raw).toEqual(expect.stringMatching(/<script>.*<\/script>/ms));
  });

  it('should process embed node', async () => {
    for (const tag of ['embed', 'iframe', 'object']) {
      const ele = document.createElement(tag);
      const resource = 'embed.res';
      ele.src = resource;
      ele.data = resource;
      document.getElementsByTagName('body')[0].appendChild(ele);

      await html.processEmbedNode(document.querySelector(tag), `http://localhost:${port}`);
      const raw = dom.serialize();

      expect(raw).toEqual(expect.not.stringMatching(`/${resource}/gm`));
      expect(raw).toEqual(expect.stringMatching(/data:.*\/.*;base64/gm));
      document.getElementsByTagName('body')[0].removeChild(ele);
    }
  });

  it('should process media node', async () => {
    const testContent = `
<div class="box">
  <img src="/globe-700.jpg" alt="Globe"
    srcset="/globe-700.jpg 1x, /globe-700.jpg 2x">
</div>`;
    document.getElementsByTagName('body')[0].innerHTML = testContent;

    await html.processMediaNode(document.querySelector('img'), `http://localhost:${port}`);
    const raw = dom.serialize();
    expect(raw).toEqual(expect.not.stringMatching(/srcset="globe-700\.jpg/gm));
    expect(raw).toEqual(expect.stringMatching(/<img.*|data:.*\/.*;base64/gm));
  });

  it('should revert converted noscript', async () => {
    // Convert noscript and mark new div
    const nscript = document.createElement('noscript');
    const elem = document.createElement('a');
    elem.href = 'https://www.mozilla.com/';
    elem.append('Mozilla');
    nscript.append(elem);
    document.getElementsByTagName('body')[0].appendChild(nscript);

    html.convertNoScriptToDiv(document, true);
    html.revertConvertedNoScript(document);

    const raw = dom.serialize();
    expect(raw).toEqual(expect.stringContaining('<noscript>'));
    expect(raw).toEqual(expect.stringContaining('Mozilla'));
  });

  test('process', async () => {
    const css = 'index.css';
    const testContent = `<link rel="icon" href="favicon.ico"></link>
<link rel="stylesheet" href="http://localhost:${port}/${css}"></link>
    `;
    document.getElementsByTagName('body')[0].innerHTML = testContent;

    const raw = dom.serialize();
    webpage.content = raw;
    webpage.uri = 'http://localhost:' + port;

    await html.process(webpage).then(() => {
      expect(true).toBe(true);
    });
  });
});

describe('CSS', () => {
  const css = new CSS();

  it('should process url resource to base64 within inline style', async () => {
    const testContent = `<link rel="icon" href="favicon.ico" style="margin:0;background-image:url('https://github.com/favicon.ico');"></link>`;
    document.getElementsByTagName('body')[0].innerHTML = testContent;

    expect(dom.serialize()).toEqual(expect.not.stringMatching(/data:*\/.*;base64/gm));

    await css.process(document.querySelector('link'));

    // expect(dom.serialize()).toEqual(expect.stringMatching(/data:*\/.*;base64/gm));
    expect(dom.serialize()).toEqual(expect.stringMatching(/background-image:url/gm));
  });

  it('should process style url resource to base64 in head style block', async () => {
    const testContent = `
<style>
   html {
     top: 0;
     background-image:url('https://github.com/favicon.ico');
     border-image:url("https://github.com/favicon.ico");
   }
</style>
`;

    document.getElementsByTagName('head')[0].innerHTML += testContent;

    expect(dom.serialize()).toEqual(expect.not.stringMatching(/data:image\/.*;base64/gm));

    await css.process(document.querySelector('head'));

    expect(dom.serialize()).toEqual(expect.stringMatching(/data:image\/.*;base64/gm));
    expect(dom.serialize()).toEqual(expect.stringMatching(/background-image:url/gm));
  });

  it('should process style url resource to base64 within element', async () => {
    expect(dom.serialize()).toEqual(expect.not.stringMatching(/data:image\/.*;base64/gm));

    await css.process(document.querySelector('body'));

    expect(dom.serialize()).toEqual(expect.stringMatching(/data:image\/.*;base64/gm));
    expect(dom.serialize()).toEqual(expect.stringMatching(/background-image:url/gm));
  });
});
