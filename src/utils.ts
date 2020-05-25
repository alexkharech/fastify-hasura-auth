String.prototype.isValidEmail = function (this: string): boolean {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(this.toLowerCase());
};

Array.prototype.ifNotFound = function <T>(
  this: string[],
  options: { [key: string]: T },
  callback: (name: string) => void
) {
  this.forEach((name) => options[name] || callback(name));
};
