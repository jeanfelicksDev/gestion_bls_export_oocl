const { execSync } = require('child_process');

const dbUrl = "postgresql://neondb_owner:npg_KULyzug76ZvT@ep-morning-water-agi3yojo-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&pool_timeout=30";

try {
  console.log("Removing old DATABASE_URL for OOCL...");
  try {
    execSync(`npx vercel env rm DATABASE_URL production -y`, { stdio: 'inherit' });
  } catch (e) {
    console.log("Variable might not exist, skipping removal.");
  }
  
  console.log("Adding new DATABASE_URL for OOCL...");
  execSync(`npx vercel env add DATABASE_URL production`, {
    input: dbUrl,
    stdio: ['pipe', 'inherit', 'inherit']
  });
  console.log("OOCL Env updated successfully");
} catch (e) {
  console.error("Error:", e.message);
}
