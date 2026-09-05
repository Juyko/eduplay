const API_KEY = "AQ.Ab8RN6KqzhjVnUwqkEuoYlO9i3ZwVsnskW_Lb_Y1xlRTEZxA2Q";
async function run() {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
  const data = await res.json();
  console.log(data.models.map(m => m.name).filter(n => n.includes('flash')));
}
run();
