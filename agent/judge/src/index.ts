import { app } from "./lib/judge";

const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

console.log(`Starting ProofOfVerdict Judge on port ${port}...`);

export default {
  port,
  fetch: app.fetch,
};
