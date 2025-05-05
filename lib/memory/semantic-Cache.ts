import { SemanticCache } from "@upstash/semantic-cache";
import { Index } from "@upstash/vector";

// 👇 your vector database
const index = new Index();

// 👇 your semantic cache
const semanticCache = new SemanticCache({ index, minProximity: 0.95 });

async function runDemo() {
  await semanticCache.set("Capital of Turkey", "Ankara");
  await delay(1000);

  // 👇 outputs: "Ankara"
  const result = await semanticCache.get("What is Turkey's capital?");
  console.log(result);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

runDemo();