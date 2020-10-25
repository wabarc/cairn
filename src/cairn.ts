import { Archiver } from './archiver';
export { Archived } from './types';

process.on('uncaughtException', (e) => {
  console.error(e);
});

class Cairn extends Archiver {}

const cairn = new Cairn();

exports = module.exports = cairn;
exports.cairn = exports;
exports.Cairn = Cairn;

export { Cairn, cairn };
