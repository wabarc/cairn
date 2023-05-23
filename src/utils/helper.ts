/*
 * Copyright 2023 Wayback Archiver. All rights reserved.
 * Use of this source code is governed by the MIT
 * license that can be found in the LICENSE file.
 */

// import fs from 'fs';
import { http } from './http';

export const isValidURL = (uri: string): boolean => {
  if (!uri || uri.length < 3) {
    return false;
  }

  try {
    new URL(uri);
  } catch (_) {
    return false;
  }

  return true;
};

export const createAbsoluteURL = (uri: string, baseURL: string): string => {
  if (!uri || uri.length < 1 || !baseURL) {
    return uri;
  }

  if (uri.startsWith('data:') || uri.startsWith('#')) {
    return uri;
  }

  if (baseURL.startsWith('http://') || baseURL.startsWith('https://')) {
    try {
      const u = new URL(uri, baseURL);

      return cleanURL(u.toString());
    } catch (e) {
      console.warn('Cairn warn:', e);
      return cleanURL(baseURL);
    }
  }

  return cleanURL(uri);
};

const cleanURL = (uri: string): string => {
  // Remove urm_* queries
  return uri.replace(/utm(_[\w\-+=.*]+)/g, '');
};

export const createFileName = (uri: string): string => {
  const now = new Date().toISOString().replace(/\..+/, '').replace(/T/, '-').replace(/:/g, '');
  const extension = 'html';
  let url: URL;

  try {
    url = new URL(uri);
  } catch (_) {
    return `${now}.${extension}`;
  }

  const hostname = url.hostname
    .replace(/\./g, '-')
    .replace(/www-/, '')
    .replace(/^-+|-+$/gm, '');
  if (url.pathname.length < 1) {
    return `${now}-${hostname}.${extension}`;
  }

  const pathname = url.pathname.replace(/\//g, '-').replace(/^-+|-+$/gm, '');
  const fullpath = `${now}-${hostname}-${pathname}`.replace(/^-+|-+$/gm, '').replace(/\.(htm|html)$/gm, '');

  return `${fullpath}.${extension}`;
};

export const convertToData = async (uri: string): Promise<string> => {
  if (!isValidURL(uri)) {
    return uri;
  }

  const resource = await http.setResponseType('arraybuffer').fetch(uri);
  if (!resource || typeof resource !== 'object' || !Object.prototype.hasOwnProperty.call(resource, 'data')) {
    return uri;
  }

  const encoded = Buffer.from(resource.data).toString('base64');

  return `data:${resource.headers['content-type']};base64,${encoded}`;
};
