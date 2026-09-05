const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('Game.tsx'));

files.forEach(f => {
  const fp = path.join(dir, f);
  let content = fs.readFileSync(fp, 'utf8');

  if (content.includes('let lastFrameTime = 0;')) {
    console.log('Already patched:', f);
    return;
  }

  // Find the render function definition
  const regex = /let raf:\s*number;\s*const render = \((.*?)\) => \{/;
  if (regex.test(content)) {
    content = content.replace(regex, 
`let raf: number;
    let lastFrameTime = 0;

    const render = (time: number) => {
      if (!lastFrameTime) lastFrameTime = time;
      const dt = time - lastFrameTime;
      if (dt < 16.666) {
        raf = requestAnimationFrame(render);
        return;
      }
      lastFrameTime = time - (dt % 16.666);`
    );
    fs.writeFileSync(fp, content);
    console.log('Patched:', f);
  } else {
    console.log('Could not match regex in:', f);
  }
});
