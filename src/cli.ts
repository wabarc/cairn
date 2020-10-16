#!/usr/bin/env node

import { Options } from './types/cairn';
import { Command } from 'commander';
import { Cairn } from './cairn';
import { isValidURL, createFileName } from './utils';
import { statSync, writeFile } from 'fs';

class Handler {
  private opt: Options;
  private url: string[];

  constructor() {
    this.url = [];
    this.opt = {};
  }

  main() {
    const program = this.parser();

    if (this.url.length < 1) {
      // Output help information and exit immediately.
      program.help();
    }

    let filepath = '';
    if (program.output && program.output !== '-') {
      if (!statSync(program.output)) {
        console.warn('custom output not exists, path: ' + program.output);
        process.exit(1);
      }
      filepath = program.output + '/';
    }

    const output = (url: string, filename: string, content: string) => {
      if (program.output === '-') {
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

    const cairn = new Cairn();
    for (const url of this.url) {
      if (!isValidURL(url)) {
        console.info(`${url} => request url is not specified\n`);
        continue;
      }
      const filename = filepath + createFileName(url);

      cairn
        .request({ url: url })
        .options(this.opt)
        .archive()
        .then((webpage) => {
          output(url, filename, webpage);
        })
        .catch((err) => console.warn(`${url} => ${JSON.stringify(err)}`));
    }
  }

  private parser() {
    const program = new Command();

    program
      .name('cairn')
      .usage('[options] url1 [url2]...[urlN]')
      .version('1.0.0', '-v, --version', 'output the current version')
      .description('CLI tool for saving web page as single HTML file');

    program.option('-o, --output <string>', 'path to save archival result');

    program.option('-u, --user-agent <string>', 'set custom user agent');
    program.option('-t, --timeout <number>', 'maximum time (in second) request timeout');

    program
      .option('--no-js', 'disable JavaScript')
      .option('--no-css', 'disable CSS styling')
      .option('--no-embeds', 'remove embedded elements (e.g iframe)')
      .option('--no-medias', 'remove media elements (e.g img, audio)');

    program.parse(process.argv);

    if (program.userAgent) this.opt.userAgent = program.userAgent;
    if (program.timeout) this.opt.timeout = parseInt(program.timeout);

    if (program.noJs) this.opt.disableJS = true;
    if (program.noCss) this.opt.disableCSS = true;
    if (program.noEmbeds) this.opt.disableEmbeds = true;
    if (program.noMedias) this.opt.disableMedias = true;

    this.url = program.args;

    return program;
  }
}

new Handler().main();
