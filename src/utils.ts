import crypto from "crypto";

export const generateToken = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(64, (err, buffer) => {
      if (err) return reject(err);
      resolve(buffer.toString("hex"));
    });
  });
};

export const validateEmail = (email: string): boolean => {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email.toLowerCase());
};

export const checkForExists = (
  options: { [key: string]: any },
  keys: string[],
  callback: (key: string) => void
) => {
  keys.forEach((key) => options[key] || callback(key));
};
