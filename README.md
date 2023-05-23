# Cairn

```text

    //   ) )                              
   //         ___     ( )  __       __    
  //        //   ) ) / / //  ) ) //   ) ) 
 //        //   / / / / //      //   / /  
((____/ / ((___( ( / / //      //   / /   

```

Cairn is an npm package and CLI tool for saving the web page as a single HTML file,
it is TypeScript implementation of [Obelisk](https://github.com/go-shiori/obelisk).

## Features

## Usage

### As CLI tool

```sh
npm install -g @wabarc/cairn
```

```sh
$ cairn -h

Usage: cairn [options] url1 [url2]...[urlN]

CLI tool for saving web page as single HTML file

Options:
  -v, --version                         output the current version
  -o, --output <string>                 path to save archival result
  -u, --user-agent <string>             set custom user agent
  -p, --proxy [protocol://]host[:port]  use this proxy
  -t, --timeout <number>                maximum time (in second) request timeout
  --no-js                               disable JavaScript
  --no-css                              disable CSS styling
  --no-embeds                           remove embedded elements (e.g iframe)
  --no-medias                           remove media elements (e.g img, audio)
  -h, --help                            display help for command
```

### As npm package

```sh
npm install @wabarc/cairn
```

```javascript
import { Cairn } from '@wabarc/cairn';
// const cairn = require('@wabarc/cairn');

const cairn = new Cairn();

cairn
  .request({ url: url })
  .options({ userAgent: 'Cairn/2.0.0', proxy: 'socks5://127.0.0.1:1080' })
  .archive()
  .then((archived) => {
    console.log(archived.url, archived.webpage.html());
  })
  .catch((err) => console.warn(`${url} => ${JSON.stringify(err)}`));
```

#### Instance methods

##### cairn#request({ url: string }): this
##### cairn#options({}): this
- proxy?: string;
- userAgent?: string;
- disableJS?: boolean;
- disableCSS?: boolean;
- disableEmbeds?: boolean;
- disableMedias?: boolean;
- timeout?: number;

##### cairn#archive(): Promise<Archived>
##### cairn#Archived
- url: string;
- webpage: cheerio.Root;
- status: 200 | 400 | 401 | 403 | 404 | 500 | 502 | 503 | 504;
- contentType: 'text/html' | 'text/plain' | 'text/*';

#### Request Params

##### request

```javascript
{
  // `url` is archival target.
  url: 'https://www.github.com'
}
```

##### options

```javascript
{
  proxy: 'socks5://127.0.0.1:1080',
  userAgent: 'Cairn/2.0.0',

  disableJS: true,
  disableCSS: false,
  disableEmbeds: false,
  disableMedias: true,

  timeout: 30
}
```

#### Response Schema

for v1.x:

The `archive` method will return webpage body as string.

for v2.x:

```javascript
{
  url: 'https://github.com/',
  webpage: cheerio.Root,
  status: 200,
  contentType: 'text/html'
}
```

## License

This software is released under the terms of the MIT. See the [LICENSE](https://github.com/wabarc/cairn/blob/main/LICENSE) file for details.
