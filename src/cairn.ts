/*
 * Copyright 2023 Wayback Archiver. All rights reserved.
 * Use of this source code is governed by the MIT
 * license that can be found in the LICENSE file.
 */

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
