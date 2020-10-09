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
