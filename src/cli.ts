#!/usr/bin/env node
import { Options } from './types/cairn';
import { Command } from 'commander';
import { Archiver } from './archiver';
import { isValidURL, createFileName } from './utils';
import { statSync, writeFile } from 'fs';

class Handler {
  private opts: Options;
  private urls: string[];

  constructor() {
    this.urls = [];
    this.opts = {};
  }

  async main() {
    const program = this.parser();
    const options = program.opts();

    if (this.urls.length < 1) {
      // Output help information and exit immediately.
      program.help();
    }

    let filepath = '';
    if (options.output && options.output !== '-') {
      if (!statSync(options.output)) {
        console.warn('custom output not exists, path: ' + options.output);
        process.exit(1);
      }
      filepath = options.output + '/';
    }

    const output = async (url: string, filename: string, content: string) => {
      if (options.output === '-') {
        console.info(content);
      } else {
        writeFile(filename, content, (err) => {
          if (err) {
            console.warn(`${url} => ${err}`);
            return;
          }
          console.info(`${url} => ${filename}`);
        });
      }
    };

    const cairn = new Archiver();
    for (const url of this.urls) {
      if (!isValidURL(url)) {
        console.info(`${url} => request url is not specified\n`);
        continue;
      }
      const filename = filepath + createFileName(url);

      await cairn
        .request({ url: url })
        .options(this.opts)
        .archive()
        .then(async (archived) => {
          if (!archived.webpage || typeof archived.webpage.root !== 'function') {
            return;
          }

          const html = archived.webpage.root() ? archived.webpage.root().html() : '';
          if (!html) {
            console.warn(`${url} => archival failure. [status: ${archived.status}]`);
            return;
          }
          await output(url, filename, html || '');
        })
        .catch((err) => console.warn(`${url} => ${JSON.stringify(err)}`));
    }
  }

  private parser() {
    const program = new Command();
    const version = process.env.npm_package_version || '0.0.1';

    program
      .name('cairn')
      .usage('[options] url1 [url2]...[urlN]')
      .version(version, '-v, --version', 'output the current version')
      .description('CLI tool for saving web page as single HTML file');

    program.option('-o, --output <string>', 'path to save archival result');

    program.option('-u, --user-agent <string>', 'set custom user agent');
    program.option('-p, --proxy [protocol://]host[:port]', 'use this proxy');
    program.option('-t, --timeout <number>', 'maximum time (in second) request timeout');

    program
      .option('--no-js', 'disable JavaScript')
      .option('--no-css', 'disable CSS styling')
      .option('--no-embeds', 'remove embedded elements (e.g iframe)')
      .option('--no-medias', 'remove media elements (e.g img, audio)');

    program.parse(process.argv);

    const options = program.opts();
    if (options.proxy) this.opts.proxy = options.proxy;
    if (options.userAgent) this.opts.userAgent = options.userAgent;
    if (options.timeout) this.opts.timeout = parseInt(options.timeout);

    // `no-` to set the option value to false when used.
    this.opts.disableJS = !options.js;
    this.opts.disableCSS = !options.css;
    this.opts.disableEmbeds = !options.embeds;
    this.opts.disableMedias = !options.medias;

    this.urls = program.args;

    return program;
  }
}

new Handler().main();
