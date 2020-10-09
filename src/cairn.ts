import { Options, Requests } from './types/cairn';
import { Archiver } from './archiver';

process.on('uncaughtException', (e) => {
  console.error(e);
});

class Cairn {
  private arc: Archiver;

  /**
   * Initialize a new `Cairn`.
   *
   * @api public
   */
  constructor() {
    this.arc = new Archiver();
  }

  request(r: Requests): this {
    this.arc.request(r);

    return this;
  }

  options(o: Options): this {
    this.arc.options(o);
    return this;
  }

  archive(): Promise<string> {
    return this.arc.archive();
  }
}

exports = module.exports = new Cairn();
exports.cairn = exports;

exports.Cairn = Cairn;

const cairn = new Cairn();

export { Cairn, cairn };
