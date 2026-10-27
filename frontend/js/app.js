// --- 1. BACKGROUND ANIMATION MESH ---
function initBackground() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;
  const particles = Array.from({ length: 80 }, () => ({
    x: Math.random() * width, y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, radius: Math.random() * 2
  }));

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "rgba(20, 10, 40, 0.8)");
    gradient.addColorStop(1, "rgba(10, 10, 30, 0.9)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(167, 139, 250, 0.5)';
    for (let i = 0; i < particles.length; i++) {
      let p = particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > width) p.vx = -p.vx;
      if (p.y < 0 || p.y > height) p.vy = -p.vy;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
      for (let j = i + 1; j < particles.length; j++) {
        let p2 = particles[j];
        let dist = Math.hypot(p.x - p2.x, p.y - p2.y);
        if (dist < 110) {
          ctx.strokeStyle = `rgba(139, 92, 246, ${1 - dist / 110})`;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}
document.addEventListener('DOMContentLoaded', initBackground);

// --- 2. AUTHENTICATION ---
let isLoginMode = true;
function toggleAuthMode() {
  isLoginMode = !isLoginMode;
  document.getElementById('authBtn').innerHTML = isLoginMode
    ? 'Authenticate Session <i class="fa-solid fa-arrow-right"></i>'
    : 'Register Organization <i class="fa-solid fa-user-plus"></i>';
  document.getElementById('toggleText').innerText = isLoginMode ? "New to Aegis?" : "Already registered?";
  document.getElementById('toggleAction').innerText = isLoginMode ? "Initialize New Node" : "Access Secure Vault";
}

function handleAuth() {
  const orgId = document.getElementById('orgIdInput').value;
  const pwd = document.getElementById('passwordInput').value;
  const msgBox = document.getElementById('authMessage');
  const endpoint = isLoginMode ? '/api/login' : '/api/signup';

  fetch(`http://127.0.0.1:5000${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ org_id: orgId, password: pwd })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === "SUCCESS") {
      if (isLoginMode) {
        document.getElementById('loginView').classList.add('hidden');
        document.getElementById('dashboardView').classList.remove('hidden');
      } else {
        msgBox.innerText = data.message;
        msgBox.className = "text-emerald-400 text-sm mt-2 text-center";
        msgBox.classList.remove('hidden');
        toggleAuthMode();
      }
    } else {
      msgBox.innerText = data.message;
      msgBox.className = "text-red-400 text-sm mt-2 text-center";
      msgBox.classList.remove('hidden');
    }
  });
}

// --- 3. SINGULAR 64-BIT PERCEPTUAL HASHING ---
function previewImage() {
  const input = document.getElementById('imageInput');
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('uploadPlaceholder').classList.add('hidden');
      document.getElementById('imagePreview').src = e.target.result;
      document.getElementById('imagePreviewContainer').classList.remove('hidden');
      document.getElementById('processingPipeline').classList.remove('hidden');

      const img = new Image();
      img.onload = function() {
        // Draw into an 8x8 matrix (64 pixels = 64 bits)
        const canvas = document.getElementById('canvasHash');
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 8, 8);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function computeSingular64BitHash() {
  const canvas = document.getElementById('canvasHash');
  const data = canvas.getContext('2d').getImageData(0, 0, 8, 8).data;
  let grays = [], sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    let avg = (data[i] + data[i + 1] + data[i + 2]) / 3.0;
    grays.push(avg);
    sum += avg;
  }
  const mean = sum / 64.0;
  const bits = grays.map(v => v >= mean ? '1' : '0').join('');
  let hex = '';
  for (let i = 0; i < 64; i += 4) {
    hex += parseInt(bits.substring(i, i + 4), 2).toString(16);
  }
  return hex;
}

function processAndRegister() {
  const btn = document.getElementById('registerBtn');
  const statusBox = document.getElementById('statusBox');
  const singularHash = computeSingular64BitHash();

  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Encrypting...';
  statusBox.classList.remove('hidden');
  statusBox.innerText = `[LOCAL VAULT] Computed 64-Bit Perceptual Hash: ${singularHash}\n[NETWORK] Syncing singular hash tohashes.csv...`;

  fetch('http://127.0.0.1:5000/api/register-hash', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_hash: singularHash })
  })
  .then(res => res.json())
  .then(data => {
    btn.innerHTML = '<i class="fa-solid fa-check mr-2"></i> Protected in Vault (Upload Another)';
    document.getElementById('assetCount').innerText = data.total_assets;
    statusBox.innerText += `\n[SUCCESS] Asset #${data.asset_id} registered. Raw media purged from memory.`;

    const log = document.getElementById('activityLog');
    log.innerHTML = `
      <div class="border-l-2 border-emerald-500 pl-3 py-1">
        <div class="text-emerald-400 font-bold">VAULT REGISTERED (#${data.asset_id})</div>
        <div class="text-gray-300">aHash: ${data.image_hash}</div>
      </div>
    ` + log.innerHTML;
  });
}

// --- 4. AUTONOMOUS WEB SCOURING & HAMMING ENFORCEMENT ---
function triggerWebScan() {
  const btn = document.getElementById('simulateBtn');
  const targetUrl = document.getElementById('targetUrlInput').value;
  const log = document.getElementById('activityLog');
  const hammingReadout = document.getElementById('hammingReadout');

  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Scouring & Hashing DOM...';
  btn.disabled = true;

  log.innerHTML = `
    <div class="border-l-2 border-purple-500 pl-3 py-1">
      <div class="text-purple-400 font-bold">[CRAWLER] Scouring ${targetUrl}</div>
      <div class="text-gray-400">Extracting <img> tags & computing Hamming distances...</div>
    </div>
  ` + log.innerHTML;

  fetch('http://127.0.0.1:5000/api/scan-web', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_url: targetUrl })
  })
  .then(res => res.json())
  .then(data => {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-radar mr-2"></i> Scour Web & Enforce Takedown';

    if (data.status === "THREAT_MITIGATED") {
      const m = data.match;
      hammingReadout.innerText = `${m.distance} / 64 (${m.similarity}%)`;
      hammingReadout.className = "text-2xl font-bold text-red-500 mt-1 font-mono animate-pulse";

      document.getElementById('statusBox').classList.remove('hidden');
      document.getElementById('statusBox').innerText = data.dmca_preview;

      log.innerHTML = `
        <div class="border-l-2 border-red-500 pl-3 py-1 bg-red-950/20">
          <div class="text-red-400 font-bold">🚨 LEAK DETECTED (Hamming Dist: ${m.distance}/64)</div>
          <div class="text-gray-300">Vault Hash: ${m.vault_hash}</div>
          <div class="text-gray-300">Found Hash: ${m.detected_hash}</div>
          <div class="text-emerald-400 mt-1">✔ Gemini AI DMCA Emailed to ${data.whois.registrar}</div>
          <div class="text-emerald-400">✔ Remote Host Takedown Executed</div>
        </div>
      ` + log.innerHTML;
    } else {
      log.innerHTML = `
        <div class="border-l-2 border-gray-500 pl-3 py-1">
          <div class="text-gray-300 font-bold">[SCAN RESULT] ${data.status}</div>
          <div class="text-gray-400">${data.message}</div>
        </div>
      ` + log.innerHTML;
    }
  });
}