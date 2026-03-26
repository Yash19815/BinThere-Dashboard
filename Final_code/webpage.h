#pragma once

const char WS_MONITOR_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BinThere — Serial Monitor</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#0d0d0d;color:#00ff41;font-family:'Courier New',monospace;height:100vh;display:flex;flex-direction:column;overflow:hidden}
  #hdr{background:#111;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #1f1f1f;flex-shrink:0}
  #hdr-left{display:flex;align-items:center;gap:10px}
  #title{font-size:13px;font-weight:bold;letter-spacing:1px}
  #ip{font-size:11px;color:#444}
  #status{display:flex;align-items:center;gap:6px;font-size:11px;color:#666}
  #dot{width:7px;height:7px;border-radius:50%;background:#ff3333;transition:background .3s}
  #dot.on{background:#00ff41;box-shadow:0 0 6px #00ff41}
  #terminal{flex:1;overflow-y:auto;padding:10px 16px;font-size:12px;line-height:1.7}
  #terminal::-webkit-scrollbar{width:6px}
  #terminal::-webkit-scrollbar-track{background:#111}
  #terminal::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:3px}
  .ln{white-space:pre-wrap;word-break:break-all;padding:1px 0}
  .ts{color:#2a2a2a;margin-right:8px;user-select:none}
  #ftr{background:#111;padding:8px 16px;display:flex;align-items:center;gap:8px;border-top:1px solid #1f1f1f;flex-shrink:0}
  .btn{background:#161616;color:#00ff41;border:1px solid #2a2a2a;padding:5px 12px;cursor:pointer;font-family:monospace;font-size:11px;border-radius:3px;transition:all .2s}
  .btn:hover{background:#1e1e1e;border-color:#00ff41}
  #lc{color:#2a2a2a;font-size:11px;margin-left:auto}
</style>
</head>
<body>
<div id="hdr">
  <div id="hdr-left">
    <span id="title">&#x1F5D1; BINTHERE / SERIAL MONITOR</span>
    <span id="ip"></span>
  </div>
  <div id="status"><div id="dot"></div><span id="stxt">Disconnected</span></div>
</div>
<div id="terminal"></div>
<div id="ftr">
  <button class="btn" onclick="clearLog()">Clear</button>
  <button class="btn" id="asBtn" onclick="toggleAS()">Auto-scroll ON</button>
  <span id="lc">0 lines</span>
</div>
<script>
const term=document.getElementById('terminal');
const dot=document.getElementById('dot');
const stxt=document.getElementById('stxt');
const lc=document.getElementById('lc');
const asBtn=document.getElementById('asBtn');
document.getElementById('ip').textContent=location.host;
let autoScroll=true,lineCount=0,ws;

const COLORS={
  '[ERROR]':'#ff3333','[RETRY]':'#ff8800','[ULTRA]':'#00aaff',
  '[SOIL]':'#bb88ff','[MG995]':'#ff88aa','[SG90]':'#ffcc00',
  '[TOF]':'#00ffcc','[WiFi]':'#66ff66','[POST]':'#66ccff',
  '[BOOT]':'#888','[POWER]':'#888','[CYCLE]':'#aaa',
  'MICROWAVE':'#ffffff','[WSMON]':'#555555'
};

function colorFor(t){
  for(const[k,v] of Object.entries(COLORS)) if(t.includes(k)) return v;
  return '#00ff41';
}

function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

function appendLine(raw,forceColor){
  const lines=raw.split('\n');
  lines.forEach(text=>{
    if(!text.trim())return;
    const now=new Date();
    const ts=now.toTimeString().slice(0,8)+'.'+String(now.getMilliseconds()).padStart(3,'0');
    const div=document.createElement('div');
    div.className='ln';
    div.style.color=forceColor||colorFor(text);
    div.innerHTML='<span class="ts">'+ts+'</span>'+esc(text);
    term.appendChild(div);
    lineCount++;
    if(term.children.length>600)term.removeChild(term.firstChild);
  });
  lc.textContent=lineCount+' lines';
  if(autoScroll)term.scrollTop=term.scrollHeight;
}

function connect(){
  ws=new WebSocket('ws://'+location.host+'/ws');
  ws.onopen=()=>{
    dot.className='on';stxt.textContent='Connected';
    appendLine('[WSMON] Stream connected — waiting for logs...','#555');
  };
  ws.onclose=()=>{
    dot.className='';stxt.textContent='Reconnecting...';
    appendLine('[WSMON] Lost connection. Retrying in 3s...','#ff3333');
    setTimeout(connect,3000);
  };
  ws.onerror=()=>{ws.close()};
  ws.onmessage=e=>appendLine(e.data);
}

function clearLog(){term.innerHTML='';lineCount=0;lc.textContent='0 lines'}
function toggleAS(){autoScroll=!autoScroll;asBtn.textContent='Auto-scroll '+(autoScroll?'ON':'OFF')}
connect();
</script>
</body>
</html>
)rawliteral";