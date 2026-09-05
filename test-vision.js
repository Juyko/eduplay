const API_KEY = "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";

const payload = {
  model: "llama-3.2-11b-vision-preview",
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "Describe this image in JSON" },
        { type: "image_url", image_url: { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" } }
      ]
    }
  ],
  temperature: 0.3
};

async function run() {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  console.log(res.status);
  console.log(await res.text());
}
run();
