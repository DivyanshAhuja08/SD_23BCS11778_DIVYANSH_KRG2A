const BASE62_CHARACTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const encodeBase62 = (num) => {
  if (!Number.isInteger(num) || num < 0) {
    throw new Error("Base62 encoder expects a non-negative integer.");
  }

  if (num === 0) {
    return BASE62_CHARACTERS[0];
  }

  const base = BASE62_CHARACTERS.length;
  let encoded = "";
  let value = num;

  while (value > 0) {
    encoded = BASE62_CHARACTERS[value % base] + encoded;
    value = Math.floor(value / base);
  }

  return encoded;
};

module.exports = {
  BASE62_CHARACTERS,
  encodeBase62,
};

