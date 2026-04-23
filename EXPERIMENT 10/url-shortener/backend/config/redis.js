const { createClient } = require("redis");

let redisClient = null;

const connectRedis = async () => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("REDIS_URL is not configured.");
  }

  redisClient = createClient({ url: redisUrl });

  redisClient.on("error", (error) => {
    console.error("Redis error:", error.message);
  });

  try {
    await redisClient.connect();
    console.log("Redis connected");
    return redisClient;
  } catch (error) {
    console.error("Redis connection failed.");
    redisClient = null;
    throw error;
  }
};

const getRedisClient = () => redisClient;

module.exports = {
  connectRedis,
  getRedisClient,
};
