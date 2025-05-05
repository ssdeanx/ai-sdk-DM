import { Redis } from '@upstash/redis'
import { Index } from "@upstash/vector"

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const UPSTASH_VECTOR_REST_URL = process.env.UPSTASH_VECTOR_REST_URL;
const UPSTASH_VECTOR_REST_TOKEN = process.env.UPSTASH_VECTOR_REST_TOKEN;
const Memory = new Redis({
  url: UPSTASH_REDIS_REST_URL,
  token: UPSTASH_REDIS_REST_TOKEN,
});



(async () => {
  await Memory.set('foo', 'bar');
  const data = await Memory.get('foo');
  console.log(data); // Optional: log the data to see the result
})();

const Vectordb = new Index({
    url: UPSTASH_VECTOR_REST_URL!,
    token: UPSTASH_VECTOR_REST_TOKEN!,
});

(async () => {
  await Vectordb.upsert({
    id: "id1",
    data: "Enter data as string",
    metadata: { metadata_field: "metadata_value" },
  });

  await Vectordb.query({
    data: "Enter data as string",
    topK: 1,
    includeVectors: true,
    includeMetadata: true,
  });
})();

export { Memory, Vectordb };