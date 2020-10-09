# Cairn

```

    //   ) )                              
   //         ___     ( )  __       __    
  //        //   ) ) / / //  ) ) //   ) ) 
 //        //   / / / / //      //   / /  
((____/ / ((___( ( / / //      //   / /   

```

Cairn is an npm package and CLI tool for saving the web page as a single HTML file.
It is a Node.js version [Obelisk](https://github.com/go-shiori/obelisk) implement in TypeScript.

## Features

## Usage

### As npm package

```sh
npm install @wabarc/cairn
```

```javascript
import { Cairn } from 'cairn';

const cairn = new Cairn();

cairn
  .request({ url: url })
  .options(this.opt)
  .archive()
  .then((webpage) => {
    console.log(url, webpage);
  })
  .catch((err) => console.warn(`${url} => ${JSON.stringify(err)}`));
```

### As CLI tool

```sh
npm install -g @wabarc/cairn
```

```sh
$ cairn -h

Usage: cairn [options] url1 [url2]...[urlN]

CLI tool for saving web page as single HTML file

Options:
  -v, --version              output the current version
  -o, --output <string>      path to save archival result
  -u, --user-agent <string>  set custom user agent
  --no-js                    disable JavaScript
  --no-css                   disable CSS styling
  --no-embeds                remove embedded elements (e.g iframe)
  --no-medias                remove media elements (e.g img, audio)
  -h, --help                 display help for command
```

## License

This software is released under the terms of the GNU General Public License v3.0. See the [LICENSE](https://github.com/wabarc/cairn/blob/master/LICENSE) file for details.
