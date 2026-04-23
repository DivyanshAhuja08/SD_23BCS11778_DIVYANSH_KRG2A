const { query } = require("../config/db");
const { getRedisClient } = require("../config/redis");
const { encodeBase62 } = require("../utils/base62");
const { isValidUrl, normalizeUrl } = require("../utils/urlValidation");

const CACHE_TTL_SECONDS = Number(process.env.REDIS_CACHE_TTL_SECONDS || 3600);
const LOCAL_CACHE_TTL_MS = Number(process.env.LOCAL_CACHE_TTL_MS || 600000);
const ENABLE_CACHE_LOGS = process.env.ENABLE_CACHE_LOGS === "true";
const DEFAULT_URL_EXPIRY_DAYS = Number(process.env.DEFAULT_URL_EXPIRY_DAYS || 30);
const localCache = new Map();

const mapUrlRow = (row) => ({
  shortId: row.short_id,
  longUrl: row.long_url,
  expiresAt: row.expires_at,
});

const getLongUrlCacheKey = (longUrl) => `url:long:${longUrl}`;
const getShortIdCacheKey = (shortId) => `url:short:${shortId}`;

const logCache = (message) => {
  if (ENABLE_CACHE_LOGS) {
    console.log(message);
  }
};

const getDefaultExpirationDate = () =>
  new Date(Date.now() + DEFAULT_URL_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

const resolveExpirationDate = (customExpiryDate) => {
  if (!customExpiryDate) {
    return getDefaultExpirationDate();
  }

  const parsedDate = new Date(customExpiryDate);

  if (Number.isNaN(parsedDate.getTime()) || parsedDate.getTime() <= Date.now()) {
    return null;
  }

  return parsedDate;
};

const isExpired = (urlDoc) =>
  Boolean(urlDoc?.expiresAt && new Date(urlDoc.expiresAt).getTime() <= Date.now());

const getLocalCacheRecord = (key) => {
  const cachedEntry = localCache.get(key);

  if (!cachedEntry) {
    return null;
  }

  if (cachedEntry.expiresAt <= Date.now()) {
    localCache.delete(key);
    return null;
  }

  return cachedEntry.value;
};

const setLocalCacheRecord = (key, value) => {
  if (!value) {
    return;
  }

  localCache.set(key, {
    value,
    expiresAt: Date.now() + LOCAL_CACHE_TTL_MS,
  });
};

const cacheUrlRecord = async (urlDoc) => {
  const redisClient = getRedisClient();

  if (!urlDoc) {
    return;
  }

  setLocalCacheRecord(getLongUrlCacheKey(urlDoc.longUrl), urlDoc);
  setLocalCacheRecord(getShortIdCacheKey(urlDoc.shortId), urlDoc);

  if (!redisClient || !redisClient.isOpen) {
    return;
  }

  const payload = JSON.stringify(urlDoc);

  try {
    await Promise.all([
      redisClient.set(getLongUrlCacheKey(urlDoc.longUrl), payload, { EX: CACHE_TTL_SECONDS }),
      redisClient.set(getShortIdCacheKey(urlDoc.shortId), payload, { EX: CACHE_TTL_SECONDS }),
    ]);
  } catch (error) {
    console.error("Redis cache write failed:", error.message);
  }
};

const getCachedUrlRecord = async (key) => {
  const localCachedValue = getLocalCacheRecord(key);

  if (localCachedValue) {
    logCache(`Local cache hit: ${key}`);
    return localCachedValue;
  }

  const redisClient = getRedisClient();

  if (!redisClient || !redisClient.isOpen) {
    logCache(`Redis cache unavailable for key: ${key}`);
    return null;
  }

  try {
    const cachedValue = await redisClient.get(key);

    if (cachedValue) {
      const parsedValue = JSON.parse(cachedValue);
      setLocalCacheRecord(key, parsedValue);
      logCache(`Redis cache hit: ${key}`);
      return parsedValue;
    }

    logCache(`Redis cache miss: ${key}`);
    return null;
  } catch (error) {
    console.error("Redis cache read failed:", error.message);
    return null;
  }
};

const getDbUrlByLongUrl = async (longUrl) => {
  const result = await query(
    "SELECT long_url, short_id, expires_at FROM urls WHERE long_url = $1 LIMIT 1",
    [longUrl]
  );

  return result.rows[0] ? mapUrlRow(result.rows[0]) : null;
};

const getDbUrlByShortId = async (shortId) => {
  const result = await query(
    "SELECT long_url, short_id, expires_at FROM urls WHERE short_id = $1 LIMIT 1",
    [shortId]
  );

  return result.rows[0] ? mapUrlRow(result.rows[0]) : null;
};

const findUrlByLongUrl = async (longUrl) => {
  const cacheKey = getLongUrlCacheKey(longUrl);
  const dbUrlPromise = getDbUrlByLongUrl(longUrl);
  const cachedUrl = await getCachedUrlRecord(cacheKey);

  if (cachedUrl) {
    return cachedUrl;
  }

  const urlDoc = await dbUrlPromise;

  void cacheUrlRecord(urlDoc);
  return urlDoc;
};

const findUrlByShortId = async (shortId) => {
  const cacheKey = getShortIdCacheKey(shortId);
  const dbUrlPromise = getDbUrlByShortId(shortId);
  const cachedUrl = await getCachedUrlRecord(cacheKey);

  if (cachedUrl) {
    return cachedUrl;
  }

  const urlDoc = await dbUrlPromise;

  void cacheUrlRecord(urlDoc);
  return urlDoc;
};

const getNextCounterValue = async () => {
  const redisClient = getRedisClient();

  if (!redisClient || !redisClient.isOpen) {
    throw new Error("Redis is unavailable for counter generation.");
  }

  const counterValue = await redisClient.incr("url_counter");
  logCache(`Redis counter incremented: url_counter=${counterValue}`);
  return counterValue;
};

const formatUrlResponse = (urlDoc) => ({
  shortUrl: `${process.env.BASE_URL}/${urlDoc.shortId}`,
  shortId: urlDoc.shortId,
  longUrl: urlDoc.longUrl,
  expiresAt: urlDoc.expiresAt,
});

const shortenUrl = async (req, res) => {
  try {
    const { longUrl, customExpiryDate } = req.body;

    if (!longUrl || !isValidUrl(longUrl)) {
      return res.status(400).json({ message: "Please provide a valid URL." });
    }

    const expirationDate = resolveExpirationDate(customExpiryDate);

    if (!expirationDate) {
      return res.status(400).json({ message: "Please provide a future expiration date." });
    }

    const normalizedLongUrl = normalizeUrl(longUrl);
    const existingUrl = await findUrlByLongUrl(normalizedLongUrl);

    if (existingUrl && !isExpired(existingUrl)) {
      return res.status(200).json(formatUrlResponse(existingUrl));
    }

    if (existingUrl && isExpired(existingUrl)) {
      const counterValue = await getNextCounterValue();
      const shortId = encodeBase62(counterValue);
      const updateResult = await query(
        `
          UPDATE urls
          SET short_id = $2, expires_at = $3
          WHERE long_url = $1
          RETURNING long_url, short_id, expires_at
        `,
        [normalizedLongUrl, shortId, expirationDate.toISOString()]
      );
      const renewedUrl = mapUrlRow(updateResult.rows[0]);
      void cacheUrlRecord(renewedUrl);

      return res.status(200).json(formatUrlResponse(renewedUrl));
    }

    const counterValue = await getNextCounterValue();
    const shortId = encodeBase62(counterValue);

    const insertResult = await query(
      `
        INSERT INTO urls (long_url, short_id, expires_at)
        VALUES ($1, $2, $3)
        RETURNING long_url, short_id, expires_at
      `,
      [normalizedLongUrl, shortId, expirationDate.toISOString()]
    );
    const createdUrl = mapUrlRow(insertResult.rows[0]);
    void cacheUrlRecord(createdUrl);

    return res.status(201).json(formatUrlResponse(createdUrl));
  } catch (error) {
    if (error.code === "23505") {
      const normalizedLongUrl = normalizeUrl(req.body.longUrl);
      const existingUrl = await findUrlByLongUrl(normalizedLongUrl);

      if (existingUrl && !isExpired(existingUrl)) {
        return res.status(200).json(formatUrlResponse(existingUrl));
      }

      return res.status(409).json({ message: "Short URL collision detected. Please retry." });
    }

    console.error("Shorten URL error:", error.message);
    return res.status(500).json({ message: "Unable to shorten URL right now." });
  }
};

const redirectToLongUrl = async (req, res) => {
  try {
    const { shortId } = req.params;
    const urlDoc = await findUrlByShortId(shortId);

    if (!urlDoc) {
      return res.status(404).json({ message: "Short URL not found." });
    }

    if (isExpired(urlDoc)) {
      return res.status(410).json({ message: "This short URL has expired." });
    }

    return res.redirect(urlDoc.longUrl);
  } catch (error) {
    console.error("Redirect error:", error.message);
    return res.status(500).json({ message: "Unable to process redirect right now." });
  }
};

module.exports = {
  shortenUrl,
  redirectToLongUrl,
};
