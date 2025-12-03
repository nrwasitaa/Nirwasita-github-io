// ================== INITIALIZATION ==================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Pastikan Home muncul saat pertama kali load
    showPage('page-home');
    
    // 2. Isi default value untuk Block Mining agar tidak kosong
    initBlockMining();
});

// ================== DATE & TIME ==================
function updateDateTime() {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    
    const dayName = days[now.getDay()];
    const date = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hh = now.getHours().toString().padStart(2, "0");
    const mm = now.getMinutes().toString().padStart(2, "0");
    const ss = now.getSeconds().toString().padStart(2, "0");
    
    const el = document.getElementById("datetime");
    if(el) el.textContent = `${dayName}, ${date} ${month} ${year} (${hh}:${mm}:${ss} WIB)`;
}
setInterval(updateDateTime, 1000);
updateDateTime();

// ================== SHA-256 ==================
async function sha256(msg) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest("SHA-256", enc.encode(msg));
    return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

// ================== NAVIGATION ==================
function showPage(pageId) {
    // Sembunyikan semua halaman
    document.querySelectorAll(".page-section").forEach((p) => {
        p.classList.add("d-none");
        p.classList.remove("active");
    });
    
    // Matikan status aktif di navbar
    document.querySelectorAll(".nav-link").forEach((b) => b.classList.remove("active"));
    
    // Tampilkan halaman target
    const target = document.getElementById(pageId);
    if(target) {
        target.classList.remove("d-none");
        // Sedikit delay agar animasi fade-in terasa (opsional hack untuk rendering)
        setTimeout(() => target.classList.add("active"), 10);
    }
    
    // Aktifkan tombol navbar terkait
    const btnId = "tab-" + pageId.replace("page-", "");
    const btn = document.getElementById(btnId);
    if(btn) btn.classList.add("active");
}

// Event Listener untuk tombol Navbar
["home", "profile", "hash", "block", "chain", "ecc", "consensus"].forEach((p) => {
    const t = document.getElementById("tab-" + p);
    if (t) t.onclick = (e) => {
        e.preventDefault();
        showPage("page-" + p);
    };
});

// ================== HASH PAGE ==================
const hashInput = document.getElementById("hash-input");
if(hashInput){
    hashInput.addEventListener("input", async (e) => {
        document.getElementById("hash-output").textContent = await sha256(e.target.value);
    });
}

// ================== BLOCK PAGE (FIX EMPTY FIELDS) ==================
const blockData = document.getElementById("block-data");
const blockNonce = document.getElementById("block-nonce");
const blockHash = document.getElementById("block-hash");
const blockTimestamp = document.getElementById("block-timestamp");
const speedControl = document.getElementById("speed-control");
const btnMine = document.getElementById("btn-mine");

// Fungsi untuk mengisi nilai awal (Supaya tidak kosong / readonly blank)
function initBlockMining() {
    if(blockTimestamp) {
        const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
        blockTimestamp.value = now;
    }
    if(blockNonce) {
        if(blockNonce.value === "") blockNonce.value = "0";
    }
    updateBlockHash();
}

if(blockNonce) {
    // Walaupun readonly, fungsi ini tetap ada untuk update internal
    blockNonce.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, "");
        updateBlockHash();
    });
}
if(blockData) blockData.addEventListener("input", updateBlockHash);

async function updateBlockHash() {
    if(!blockData || !blockNonce || !blockHash) return;
    const data = blockData.value;
    const nonce = blockNonce.value || "0";
    const ts = blockTimestamp ? blockTimestamp.value : "";
    blockHash.textContent = await sha256(data + ts + nonce);
}

if(btnMine) {
    btnMine.addEventListener("click", async () => {
        const data = blockData.value;
        const speedMultiplier = parseInt(speedControl.value) || 1;
        const baseBatch = 1000;
        const batchSize = baseBatch * speedMultiplier;
        const difficulty = "0000";
        const status = document.getElementById("mining-status");
        
        // Update timestamp saat mulai mining
        const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
        blockTimestamp.value = timestamp;
        
        blockHash.textContent = "";
        blockNonce.value = "0";
        let nonce = 0;
        
        if (status) status.textContent = "Mining...";
        
        async function mineStep() {
            const promises = [];
            for (let i = 0; i < batchSize; i++) {
                promises.push(sha256(data + timestamp + (nonce + i)));
            }
            const results = await Promise.all(promises);
            for (let i = 0; i < results.length; i++) {
                const h = results[i];
                if (h.startsWith(difficulty)) {
                    blockNonce.value = nonce + i;
                    blockHash.textContent = h;
                    if (status) status.textContent = `Selesai (Nonce=${nonce + i})`;
                    return;
                }
            }
            nonce += batchSize;
            blockNonce.value = nonce;
            if (status) status.textContent = `Mining... ${nonce}`;
            setTimeout(mineStep, 0);
        }
        mineStep();
    });
}

// ================== BLOCKCHAIN PAGE ==================
const ZERO_HASH = "0".repeat(64);
let blocks = [];
const chainDiv = document.getElementById("blockchain");

function renderChain() {
    if(!chainDiv) return;
    chainDiv.innerHTML = "";
    blocks.forEach((blk, i) => {
        const div = document.createElement("div");
        div.className = "blockchain-block";
        div.innerHTML = `
            <h3>Block #${blk.index}</h3>
            <label>Prev Hash:</label><div class="output text-muted small">${blk.previousHash.substring(0,20)}...</div>
            
            <label>Data:</label>
            <textarea class="form-control form-control-sm" rows="2" onchange="onChainDataChange(${i},this.value)">${blk.data}</textarea>
            
            <label>Nonce:</label>
            <div class="output" id="nonce-${i}">${blk.nonce}</div>
            
            <label>Timestamp:</label>
            <div class="output small" id="timestamp-${i}">${blk.timestamp}</div>
            
            <label>Hash:</label>
            <div class="output small" id="hash-${i}" style="font-size:0.7rem">${blk.hash}</div>

            <button onclick="mineChainBlock(${i})" class="btn btn-primary btn-sm w-100 mt-3">
                <i class="fa-solid fa-hammer"></i> Mine Block
            </button>
            
            <div id="status-${i}" class="text-center small mt-1 text-primary"></div>
        `;
        chainDiv.appendChild(div);
    });
}

function addChainBlock() {
    const idx = blocks.length;
    const prev = idx ? blocks[idx - 1].hash : ZERO_HASH;
    const blk = {
        index: idx,
        data: "",
        previousHash: prev,
        timestamp: "",
        nonce: 0,
        hash: "",
    };
    blocks.push(blk);
    renderChain();
}

// Assign ke window agar bisa dipanggil dari HTML onclick
window.onChainDataChange = function (i, val) {
    blocks[i].data = val;
    blocks[i].nonce = 0;
    blocks[i].timestamp = "";
    blocks[i].hash = "";
    for (let j = i + 1; j < blocks.length; j++) {
        blocks[j].previousHash = blocks[j - 1].hash;
        blocks[j].nonce = 0;
        blocks[j].timestamp = "";
        blocks[j].hash = "";
    }
    renderChain();
};

window.mineChainBlock = function (i) {
    const blk = blocks[i];
    const prev = blk.previousHash;
    const data = blk.data;
    const difficulty = "0000";
    const batchSize = 1000 * 50;
    blk.nonce = 0;
    blk.timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
    
    const t0 = performance.now();
    const status = document.getElementById(`status-${i}`);
    const ndiv = document.getElementById(`nonce-${i}`);
    const hdiv = document.getElementById(`hash-${i}`);
    const tdiv = document.getElementById(`timestamp-${i}`);
    
    status.textContent = "Mining...";
    
    async function step() {
        const promises = [];
        for (let j = 0; j < batchSize; j++)
            promises.push(sha256(prev + data + blk.timestamp + (blk.nonce + j)));
        const results = await Promise.all(promises);
        
        for (let j = 0; j < results.length; j++) {
            const h = results[j];
            if (h.startsWith(difficulty)) {
                blk.nonce += j;
                blk.hash = h;
                ndiv.textContent = blk.nonce;
                hdiv.textContent = h;
                tdiv.textContent = blk.timestamp;
                const dur = ((performance.now() - t0) / 1000).toFixed(3);
                status.textContent = `Selesai (${dur}s)`;
                return;
            }
        }
        blk.nonce += batchSize;
        ndiv.textContent = blk.nonce;
        setTimeout(step, 0);
    }
    step();
};

const btnAddBlock = document.getElementById("btn-add-block");
if(btnAddBlock) btnAddBlock.onclick = addChainBlock;
// Init Genesis
if(blocks.length === 0) addChainBlock();


// ================== ECC DIGITAL SIGNATURE ==================
// Wrap in try-catch to prevent site crash if elliptic CDN fails
try {
    const ec = new elliptic.ec("secp256k1");
    const eccPrivate = document.getElementById("ecc-private");
    const eccPublic = document.getElementById("ecc-public");
    const eccMessage = document.getElementById("ecc-message");
    const eccSignature = document.getElementById("ecc-signature");
    const eccVerifyResult = document.getElementById("ecc-verify-result");

    function randomPrivateHex() {
        const arr = new Uint8Array(32);
        crypto.getRandomValues(arr);
        return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    function normHex(h) {
        if (!h) return "";
        return h.toLowerCase().replace(/^0x/, "");
    }

    if(document.getElementById("btn-generate-key")) {
        document.getElementById("btn-generate-key").onclick = () => {
            const priv = randomPrivateHex();
            const key = ec.keyFromPrivate(priv, "hex");
            const pub = "04" + key.getPublic().getX().toString("hex").padStart(64, "0") + key.getPublic().getY().toString("hex").padStart(64, "0");
            eccPrivate.value = priv;
            eccPublic.value = pub;
            eccSignature.value = "";
            eccVerifyResult.textContent = "";
        };
    }

    if(document.getElementById("btn-sign")) {
        document.getElementById("btn-sign").onclick = async () => {
            const msg = eccMessage.value;
            if (!msg) { alert("Isi pesan!"); return; }
            const priv = normHex(eccPrivate.value.trim());
            if (!priv) { alert("Private key kosong!"); return; }
            
            const hash = await sha256(msg);
            const sig = ec.keyFromPrivate(priv, "hex").sign(hash, { canonical: true }).toDER("hex");
            eccSignature.value = sig;
            eccVerifyResult.textContent = "";
        };
    }

    if(document.getElementById("btn-verify")) {
        document.getElementById("btn-verify").onclick = async () => {
            try {
                const msg = eccMessage.value,
                    sig = normHex(eccSignature.value.trim()),
                    pub = normHex(eccPublic.value.trim());
                if (!msg || !sig || !pub) { alert("Lengkapi semua field!"); return; }
                
                const key = ec.keyFromPublic(pub, "hex");
                const valid = key.verify(await sha256(msg), sig);
                
                if(valid) {
                    eccVerifyResult.innerHTML = "<span class='text-success fw-bold'>✅ Signature VALID!</span>";
                } else {
                    eccVerifyResult.innerHTML = "<span class='text-danger fw-bold'>❌ Signature TIDAK Valid!</span>";
                }
            } catch (e) {
                eccVerifyResult.innerHTML = "<span class='text-danger'>Error verifikasi</span>";
            }
        };
    }
} catch (error) {
    console.warn("Elliptic library failed to load or ECC error:", error);
}

// ================== KONSENSUS PAGE ==================
const ZERO = "0".repeat(64);
let balances = { A: 100, B: 100, C: 100 };
let txPool = [];
let chainsConsensus = { A: [], B: [], C: [] };

function updateBalancesDOM() {
    ["A", "B", "C"].forEach((u) => {
        const el = document.getElementById("saldo-" + u);
        if (el) el.textContent = balances[u];
    });
}
function parseTx(line) {
    const m = line.match(/^([A-C])\s*->\s*([A-C])\s*:\s*(\d+)$/);
    if (!m) return null;
    return { from: m[1], to: m[2], amt: parseInt(m[3]) };
}

async function shaMine(prev, data, timestamp) {
    const diff = "000";
    const base = 1000;
    const batch = base * 50;
    return new Promise((resolve) => {
        let nonce = 0;
        async function loop() {
            const promises = [];
            for (let i = 0; i < batch; i++)
                promises.push(sha256(prev + data + timestamp + (nonce + i)));
            const results = await Promise.all(promises);
            for (let i = 0; i < results.length; i++) {
                const h = results[i];
                if (h.startsWith(diff)) {
                    resolve({ nonce: nonce + i, hash: h });
                    return;
                }
            }
            nonce += batch;
            setTimeout(loop, 0);
        }
        loop();
    });
}

async function createGenesisConsensus() {
    const diff = "000";
    const ts = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
    for (let u of ["A", "B", "C"]) {
        let nonce = 0;
        let found = "";
        while (true) {
            const h = await sha256(ZERO + "Genesis" + ts + nonce);
            if (h.startsWith(diff)) {
                found = h;
                break;
            }
            nonce++;
        }
        chainsConsensus[u] = [
            {
                index: 0,
                prev: ZERO,
                data: "Genesis Block: 100 coins",
                timestamp: ts,
                nonce,
                hash: found,
                invalid: false,
            },
        ];
    }
    renderConsensusChains();
    updateBalancesDOM();
}
createGenesisConsensus();

function renderConsensusChains() {
    ["A", "B", "C"].forEach((u) => {
        const cont = document.getElementById("chain-" + u);
        if(!cont) return;
        cont.innerHTML = "";
        chainsConsensus[u].forEach((blk, i) => {
            const d = document.createElement("div");
            d.className = "chain-block" + (blk.invalid ? " invalid" : "");
            d.innerHTML = `
                <div class="fw-bold text-primary">Block #${blk.index}</div>
                <div class="small text-muted">Prev:</div>
                <input class="form-control form-control-sm mb-1" value="${blk.prev.substring(0,10)}..." readonly title="${blk.prev}">
                
                <div class="small text-muted">Data:</div>
                <textarea class="data form-control form-control-sm mb-1" rows="3">${blk.data}</textarea>
                
                <div class="row g-1">
                    <div class="col-6">
                        <div class="small text-muted">Nonce:</div>
                        <input class="form-control form-control-sm" value="${blk.nonce}" readonly>
                    </div>
                    <div class="col-6">
                         <div class="small text-muted">Time:</div>
                         <input class="form-control form-control-sm" value="${blk.timestamp.split(' ')[1]}" readonly>
                    </div>
                </div>
                
                <div class="small text-muted mt-1">Hash:</div>
                <input class="form-control form-control-sm" value="${blk.hash.substring(0,15)}..." readonly title="${blk.hash}">`;

            const ta = d.querySelector("textarea.data");
            ta.addEventListener("input", (e) => {
                chainsConsensus[u][i].data = e.target.value;
            });

            cont.appendChild(d);
        });
    });
}

// Send Logic
["A", "B", "C"].forEach((u) => {
    const btn = document.getElementById("send-" + u);
    if(btn) {
        btn.onclick = () => {
            const amt = parseInt(document.getElementById("amount-" + u).value);
            const to = document.getElementById("receiver-" + u).value;
            if (amt <= 0 || isNaN(amt)) { alert("Jumlah harus angka > 0"); return; }
            if (balances[u] < amt) { alert("Saldo tidak cukup"); return; }
            const tx = `${u} -> ${to} : ${amt}`;
            txPool.push(tx);
            document.getElementById("mempool").value = txPool.join("\n");
        };
    }
});

const btnMineAll = document.getElementById("btn-mine-all");
if(btnMineAll) {
    btnMineAll.onclick = async () => {
        if (txPool.length === 0) { alert("Tidak ada transaksi."); return; }
        const parsed = [];
        for (const t of txPool) {
            const tx = parseTx(t);
            if (!tx) { alert("Format salah: " + t); return; }
            parsed.push(tx);
        }
        const tmp = { ...balances };
        for (const tx of parsed) {
            if (tmp[tx.from] < tx.amt) { alert("Saldo " + tx.from + " tidak cukup."); return; }
            tmp[tx.from] -= tx.amt;
            tmp[tx.to] += tx.amt;
        }
        const ts = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
        const data = txPool.join(" | ");
        const mining = ["A", "B", "C"].map(async (u) => {
            const prev = chainsConsensus[u].at(-1).hash;
            const r = await shaMine(prev, data, ts);
            chainsConsensus[u].push({
                index: chainsConsensus[u].length,
                prev,
                data,
                timestamp: ts,
                nonce: r.nonce,
                hash: r.hash,
                invalid: false,
            });
        });
        await Promise.all(mining);
        balances = tmp;
        updateBalancesDOM();
        txPool = [];
        document.getElementById("mempool").value = "";
        renderConsensusChains();
        alert("Mining selesai (50× lebih cepat).");
    };
}

const btnVerifyConsensus = document.getElementById("btn-verify-consensus");
if(btnVerifyConsensus) {
    btnVerifyConsensus.onclick = async () => {
        try {
            for (const u of ["A", "B", "C"]) {
                for (let i = 1; i < chainsConsensus[u].length; i++) {
                    const blk = chainsConsensus[u][i];
                    const expectedPrev = i === 0 ? ZERO : chainsConsensus[u][i - 1].hash;
                    const recomputed = await sha256(blk.prev + blk.data + blk.timestamp + blk.nonce);
                    blk.invalid = recomputed !== blk.hash || blk.prev !== expectedPrev;
                }
            }
            renderConsensusChains();
            alert("Verifikasi selesai.");
        } catch (err) {
            console.error("Error verifikasi:", err);
        }
    };
}

const btnConsensus = document.getElementById("btn-consensus");
if(btnConsensus) {
    btnConsensus.onclick = async () => {
        try {
            const users = ["A", "B", "C"];
            const maxLen = Math.max(...users.map((u) => chainsConsensus[u].length));
            for (let i = 0; i < maxLen; i++) {
                const candidates = users.map((u) => chainsConsensus[u][i]).filter((b) => b && !b.invalid);
                if (candidates.length === 0) continue;
                
                const freq = {};
                let majority = candidates[0];
                for (const blk of candidates) {
                    const key = blk.hash + blk.data;
                    freq[key] = (freq[key] || 0) + 1;
                    if (freq[key] > (freq[majority.hash + majority.data] || 0)) {
                        majority = blk;
                    }
                }
                for (const u of users) {
                    const chain = chainsConsensus[u];
                    if (!chain[i]) continue;
                    if (chain[i].invalid) {
                        chain[i] = { ...majority, invalid: false };
                    }
                    if (i > 0 && chain[i]) {
                        chain[i].prev = chain[i - 1].hash;
                    }
                }
            }
            renderConsensusChains();
            alert("Konsensus selesai: blok invalid diganti dengan mayoritas.");
        } catch (e) {
            console.error(e);
        }
    };
}
document.addEventListener("scroll", function () {
    const footer = document.getElementById("scroll-footer");
    if (!footer) return;

    const reachedBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 1;

    if (reachedBottom) {
        footer.style.display = "flex";
    } else {
        footer.style.display = "none";
    }
});


