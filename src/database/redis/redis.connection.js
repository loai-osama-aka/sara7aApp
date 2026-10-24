import { createClient } from "redis"
import { env } from "../../config/env.service.js";

export const client = createClient({
  url: env.redisUri
});

export async function connectRedis() {
  try {
    await client.connect()
    console.log('connected to redis database');


  } catch (error) {
    console.log(error);

  }
}