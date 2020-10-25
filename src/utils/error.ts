export const err = (msg: string): never => {
  throw new Error(msg);
};
