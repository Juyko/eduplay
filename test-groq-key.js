const API_KEY = "AQ.Ab8RN6KqzhjVnUwqkEuoYlO9i3ZwVsnskW_Lb_Y1xlRTEZxA2Q";
async function run() {
  const res = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { "Authorization": "Bearer " + API_KEY }
  });
  console.log(res.status);
  console.log(await res.text());
}
run();
