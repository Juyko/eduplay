const API_KEY = "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";
async function run() {
  const res = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { "Authorization": "Bearer " + API_KEY }
  });
  const data = await res.json();
  console.log(data.data.map(m => m.id));
}
run();
