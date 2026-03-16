const GEMINI_API_KEY = "AIzaSyBRdBozgEE19MmR2FYi4Dl_tgnqM1y21go";

async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(error);
  }
}

listModels();
