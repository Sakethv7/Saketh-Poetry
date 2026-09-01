(() => {
  'use strict';

  const canvas = document.getElementById('painting');
  const ctx = canvas.getContext('2d');
  const caption = document.getElementById('caption');
  const scene = document.getElementById('scene');
  const ids = ['dusk','warmth','monsoon','fog','pigment','grain','vignette','clearing'];
  const inputs = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
  const rain = document.getElementById('rain');

  const presets = {
    home: { title:'anthology opening', image:'assets/art/wandering-poet-indic-home-v1.webp', dusk:30,warmth:24,monsoon:22,fog:6,pigment:104,grain:28,vignette:40,clearing:28,rain:true },
    umbrella: { title:'the green umbrella', image:'assets/art/green-umbrella-mumbai-watercolor-v2.webp', dusk:48,warmth:30,monsoon:48,fog:15,pigment:112,grain:34,vignette:46,clearing:10,rain:true },
    lane: { title:'khaali gali', image:'assets/art/khaali-gali-old-delhi.jpg', dusk:54,warmth:16,monsoon:36,fog:12,pigment:98,grain:38,vignette:58,clearing:22,rain:true },
    aangan: { title:'aangan ke phool', image:'assets/art/aangan-single-flower.jpg', dusk:12,warmth:34,monsoon:8,fog:3,pigment:108,grain:30,vignette:32,clearing:18,rain:false },
    spring: { title:'the woman who brought spring', image:'assets/art/woman-spring-delhi-garden.jpg', dusk:8,warmth:20,monsoon:14,fog:22,pigment:92,grain:34,vignette:24,clearing:16,rain:true },
    hairpin: { title:'hairpin', image:'assets/art/hairpin-rooftop-veteran.jpg', dusk:42,warmth:22,monsoon:12,fog:18,pigment:94,grain:44,vignette:48,clearing:14,rain:false },
    barsati: { title:'jhuti tasalli', image:'assets/art/jhuti-tasalli-barsati.jpg', dusk:68,warmth:42,monsoon:18,fog:4,pigment:102,grain:48,vignette:68,clearing:38,rain:true },
    taxi: { title:'a wandering taxi', image:'assets/art/wandering-taxi-mumbai-monsoon-v1.webp', dusk:62,warmth:42,monsoon:44,fog:10,pigment:108,grain:38,vignette:52,clearing:18,rain:true }
  };

  let image = new Image();
  let rainSeed = Math.random() * 10000;

  function value(id) { return Number(inputs[id].value); }
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
  }
  function hash(n) { return Math.abs(Math.sin(n * 12.9898 + rainSeed) * 43758.5453) % 1; }

  function render() {
    if (!image.complete || !image.naturalWidth) return;
    const w = canvas.width, h = canvas.height;
    const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
    const sw = image.naturalWidth * scale, sh = image.naturalHeight * scale;
    ctx.clearRect(0,0,w,h);
    ctx.filter = `saturate(${value('pigment')}%) contrast(104%)`;
    ctx.drawImage(image,(w-sw)/2,(h-sh)/2,sw,sh);
    ctx.filter = 'none';

    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgba(8,14,28,${value('dusk')/170})`; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = `rgba(22,63,92,${value('monsoon')/260})`; ctx.fillRect(0,0,w,h);
    ctx.globalCompositeOperation = 'screen';
    const glow = ctx.createRadialGradient(w*.78,h*.38,0,w*.78,h*.38,w*.45);
    glow.addColorStop(0,`rgba(238,151,65,${value('warmth')/150})`); glow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=glow; ctx.fillRect(0,0,w,h);
    ctx.fillStyle=`rgba(225,232,225,${value('fog')/230})`; ctx.fillRect(0,0,w,h);

    ctx.globalCompositeOperation='source-over';
    const clear = value('clearing')/100;
    if (clear) {
      const g=ctx.createRadialGradient(w*.5,h*.48,0,w*.5,h*.48,w*.36);
      g.addColorStop(0,`rgba(5,10,12,${clear*.58})`); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    }

    if (rain.checked) {
      ctx.strokeStyle='rgba(204,222,228,.18)'; ctx.lineWidth=Math.max(1,w/1100);
      for(let i=0;i<125;i++) { const x=hash(i)*w, y=hash(i+301)*h, l=(8+hash(i+99)*24)*w/1100; ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-l*.18,y+l);ctx.stroke(); }
    }

    const vg=ctx.createRadialGradient(w/2,h/2,w*.18,w/2,h/2,w*.72);
    vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,`rgba(0,0,0,${value('vignette')/115})`);
    ctx.fillStyle=vg;ctx.fillRect(0,0,w,h);

    const amount=Math.round(value('grain')*w*h/90000);
    ctx.globalAlpha=.12;
    for(let i=0;i<amount;i++){const v=hash(i+700);ctx.fillStyle=v>.5?'#efe4cd':'#211b16';ctx.fillRect(hash(i+900)*w,hash(i+1100)*h,1.2,1.2);}
    ctx.globalAlpha=1;
  }

  function loadPreset() {
    const p=presets[scene.value];
    ids.forEach(id => { inputs[id].value=p[id]; inputs[id].nextElementSibling; });
    rain.checked=p.rain; caption.textContent=`Wandering Poet · ${p.title}`;
    image=new Image(); image.onload=render; image.src=p.image;
    updateOutputs();
  }
  function updateOutputs(){ids.forEach(id=>document.querySelector(`output[for=${id}]`).textContent=`${inputs[id].value}%`);render();}
  scene.addEventListener('change',loadPreset);
  ids.forEach(id=>inputs[id].addEventListener('input',updateOutputs));
  rain.addEventListener('change',render);
  document.getElementById('reset').addEventListener('click',loadPreset);
  document.getElementById('seed').addEventListener('click',()=>{rainSeed=Math.random()*10000;render();});
  document.getElementById('save').addEventListener('click',()=>{const a=document.createElement('a');a.download=`wandering-poet-${scene.value}.png`;a.href=canvas.toDataURL('image/png');a.click();});
  new ResizeObserver(()=>{size();render();}).observe(canvas);
  size(); loadPreset();
})();
