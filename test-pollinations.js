const payload = {
  model: "openai",
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "What is this image? Reply in JSON {\"desc\": \"...\"}" },
        { type: "image_url", image_url: { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" } }
      ]
    }
  ]
};

async function run() {
  const res = await fetch("https://text.pollinations.ai/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  console.log(res.status);
  console.log(await res.text());
}
run();
