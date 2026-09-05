const API_KEY = "AIzaSyB26e2Fcjk3466KSkwrgocy9issGRhjJw4";
async function run() {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
  console.log(await res.text());
}
run();
