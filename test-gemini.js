async function run() {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=FAKE_KEY`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
  });
  console.log(res.status);
  console.log(await res.text());
}
run();
