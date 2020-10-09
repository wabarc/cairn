export const Err = (msg: string): never => {
  throw new Error(msg);
};
