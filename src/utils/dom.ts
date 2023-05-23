/*
 * Copyright 2023 Wayback Archiver. All rights reserved.
 * Use of this source code is governed by the MIT
 * license that can be found in the LICENSE file.
 */

export const $ = (dom: HTMLElement, element: string): HTMLElement | null => {
  if (!element) {
    return dom;
  }
  return dom.querySelector(element);
};

export const removeChild = (currentNode: Node): boolean => {
  const parentNode = currentNode.parentNode;
  if (parentNode === undefined || parentNode === null) {
    return false;
  }

  return !!parentNode.removeChild(currentNode);
};
