window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('stageCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const flipBtn = document.getElementById('flip');
    const statusText = document.getElementById('status');
    const historyTags = document.getElementById('historyTags');
    const choiceBtns = document.querySelectorAll('.choice-btn');
    const gameModeSelect = document.getElementById('gameModeSelect');
    const flipModeSelect = document.getElementById('flipModeSelect');
    const skinBtn = document.getElementById('skinBtn');
    const coinStyleBtn = document.getElementById('coinStyleBtn');
    const resetBtn = document.getElementById('resetBtn');
    const victoryOverlay = document.getElementById('victoryOverlay');
    const claimBtn = document.getElementById('claimBtn');
    const stageWrapper = document.getElementById('stageWrapper');
    const chargeBar = document.getElementById('chargeBar');
    const chargeBarContainer = document.getElementById('chargeBarContainer');

    let isFlipping = false;
    let userChoice = 'heads';
    let currentSkin = 0;
    const skins = ['Cyber', 'Neon Fancy', 'Cosmic Hero'];
    let currentCoinStyle = 0;

    const coinStyles = [
        { name: 'Cyber Gold', heads: '#fbbf24', tails: '#f8fafc', glow: '#f59e0b', stroke: '#d97706' },
        { name: 'Neon Plasma', heads: '#ec4899', tails: '#8b5cf6', glow: '#f43f5e', stroke: '#c084fc' },
        { name: 'Quantum Cyan', heads: '#38bdf8', tails: '#312e81', glow: '#06b6d4', stroke: '#0284c7' }
    ];

    let stats = { wins: 0, streak: 0, maxStreak: 0 };
    let flipProgress = 0;
    let coinResult = 'heads';
    let sparkles = [];
    let kineticCharge = 0;
    let chargeInterval = null;
    let peakHeight = 25;
    let lastTime = performance.now();

    // Web Audio Engine
    let audioCtx = null;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playSmoothSound(freq, type = 'sine', duration = 0.15, gainVal = 0.08) {
        try {
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1800, audioCtx.currentTime);

            gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) {}
    }

    function playVictoryChime() {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
            setTimeout(() => playSmoothSound(freq, 'triangle', 0.4, 0.1), idx * 90);
        });
    }

    if (flipBtn) {
        flipBtn.addEventListener('mousedown', startCharging);
        flipBtn.addEventListener('mouseup', releaseCharge);
        flipBtn.addEventListener('mouseleave', releaseCharge);
        flipBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startCharging(); });
        flipBtn.addEventListener('touchend', (e) => { e.preventDefault(); releaseCharge(); });
    }

    function startCharging() {
        if (isFlipping) return;
        initAudio();
        kineticCharge = 0;
        if (chargeBarContainer) chargeBarContainer.style.display = 'block';
        if (statusText) statusText.innerText = "Charging Kinetic Energy...";
        
        chargeInterval = setInterval(() => {
            if (kineticCharge < 1) {
                kineticCharge += 0.05;
                if (chargeBar) chargeBar.style.width = `${kineticCharge * 100}%`;
                playSmoothSound(220 + kineticCharge * 350, 'sine', 0.08, 0.03);
            }
        }, 30);
    }

    function releaseCharge() {
        if (isFlipping || !chargeInterval) return;
        clearInterval(chargeInterval);
        chargeInterval = null;
        if (chargeBarContainer) chargeBarContainer.style.display = 'none';
        peakHeight = Math.max(10, 45 - kineticCharge * 30);
        executeFlip();
    }

    choiceBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isFlipping) return;
            initAudio();
            playSmoothSound(440, 'sine', 0.08, 0.04);
            choiceBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            userChoice = btn.dataset.choice;
        });
    });

    if (skinBtn) {
        skinBtn.addEventListener('click', () => {
            initAudio();
            currentSkin = (currentSkin + 1) % skins.length;
            skinBtn.innerText = `Avatar: ${skins[currentSkin]}`;
            playSmoothSound(520, 'sine', 0.08, 0.04);
        });
    }

    if (coinStyleBtn) {
        coinStyleBtn.addEventListener('click', () => {
            initAudio();
            currentCoinStyle = (currentCoinStyle + 1) % coinStyles.length;
            coinStyleBtn.innerText = `Core: ${coinStyles[currentCoinStyle].name}`;
            playSmoothSound(580, 'sine', 0.08, 0.04);
        });
    }

    function resetGame() {
        stats.wins = 0; stats.streak = 0;
        const winsEl = document.getElementById('stat-wins');
        const streakEl = document.getElementById('stat-streak');
        if (winsEl) winsEl.innerText = 0;
        if (streakEl) streakEl.innerText = 0;
        if (historyTags) historyTags.innerHTML = '';
        if (victoryOverlay) victoryOverlay.classList.add('hidden');
        if (statusText) statusText.innerText = "Hold FLIP to charge kinetic energy!";
    }

    if (resetBtn) resetBtn.addEventListener('click', resetGame);
    if (claimBtn) claimBtn.addEventListener('click', resetGame);

    function createSparkles(x, y, color, count = 20) {
        for (let i = 0; i < count; i++) {
            sparkles.push({
                x, y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6 - 1,
                size: Math.random() * 3 + 2,
                color, life: 1
            });
        }
    }

    // Canvas Visual Rendering
    function drawScene() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Floor Horizon
        ctx.beginPath();
        ctx.moveTo(20, 215); ctx.lineTo(300, 215);
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)'; ctx.lineWidth = 2; ctx.stroke();

        let handY = 150;
        let headAngle = 0;
        let bodyY = 0;

        if (isFlipping) {
            if (flipProgress < 0.15) {
                const p = flipProgress / 0.15; handY = 150 + p * 18; bodyY = p * 3;
            } else if (flipProgress < 0.3) {
                const p = (flipProgress - 0.15) / 0.15; handY = 168 - p * 55; bodyY = -p * 5;
            } else {
                handY = 140; headAngle = 0.25;
            }
        }

        // Stickman Avatar
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#a855f7';
        ctx.fillStyle = '#a855f7';
        ctx.lineCap = 'round';

        ctx.save();
        ctx.translate(160, 90 + bodyY);
        ctx.rotate(headAngle);
        ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(5, -2, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        ctx.beginPath();
        ctx.moveTo(160, 106 + bodyY); ctx.lineTo(160, 160 + bodyY);
        ctx.moveTo(160, 160 + bodyY); ctx.lineTo(145, 210);
        ctx.moveTo(160, 160 + bodyY); ctx.lineTo(175, 210);
        ctx.moveTo(160, 118 + bodyY); ctx.lineTo(140, 138); ctx.lineTo(145, 150);
        ctx.moveTo(160, 118 + bodyY); ctx.lineTo(180, (118 + handY) / 2); ctx.lineTo(195, handY);
        ctx.stroke();

        // Trajectory Calculations
        let coinX = 198; let groundY = 211; let coinY = groundY; let scaleY = 1;
        const style = coinStyles[currentCoinStyle];

        if (isFlipping) {
            if (flipProgress >= 0.25 && flipProgress <= 0.85) {
                const airP = (flipProgress - 0.25) / 0.60;
                const startY = 110;
                coinY = (1 - airP) * (1 - airP) * startY + 2 * (1 - airP) * airP * peakHeight + airP * airP * groundY;
                coinX = 198 + airP * 30;
                scaleY = Math.cos(airP * Math.PI * 22);
            } else if (flipProgress > 0.85) {
                const bounceP = (flipProgress - 0.85) / 0.15;
                coinY = groundY - (12 * Math.sin(bounceP * Math.PI));
                coinX = 228;
                scaleY = Math.cos(bounceP * Math.PI * 2);
            }
        } else {
            coinY = handY - 6;
        }

        // Render Coin - Hides result completely until landed!
        ctx.save();
        ctx.translate(coinX, coinY);
        ctx.scale(1, Math.abs(scaleY) < 0.1 ? 0.1 : scaleY);

        let coinColor = style.heads;
        
        // Show result color ONLY when landed (progress > 0.85)
        if (isFlipping && flipProgress > 0.85) {
            coinColor = coinResult === 'heads' ? style.heads : style.tails;
        }

        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fillStyle = coinColor;
        ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = style.stroke; ctx.stroke();

        ctx.fillStyle = '#0f172a'; ctx.font = '800 10px Orbitron';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

        // Display rules:
        // 1. Air time (spinning): Blank / spin line so no answer is spoiled
        // 2. Landing time (>0.85): Show actual result 'H' or 'T'
        // 3. Resting before toss: Show neutral '?'
        if (isFlipping) {
            if (flipProgress > 0.85) {
                ctx.fillText(coinResult === 'heads' ? 'H' : 'T', 0, 1);
            } else if (Math.abs(scaleY) > 0.4) {
                ctx.fillText('~', 0, 1); // Generic spinning indicator in air
            }
        } else {
            ctx.fillText('?', 0, 1);
        }
        ctx.restore();

        // Particle Effects
        sparkles.forEach((p, idx) => {
            p.x += p.vx; p.y += p.vy; p.life -= 0.035;
            if (p.life <= 0) sparkles.splice(idx, 1);
            else {
                ctx.save(); ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
        });
    }

    function animateFrame(now) {
        const dt = (now - lastTime) / 1000;
        lastTime = now;

        if (isFlipping) {
            flipProgress += dt * 1.1;
            if (Math.abs(flipProgress - 0.85) < 0.02) {
                if (stageWrapper) stageWrapper.classList.add('shake');
                setTimeout(() => { if (stageWrapper) stageWrapper.classList.remove('shake'); }, 200);
                playSmoothSound(140, 'triangle', 0.15, 0.12);
                createSparkles(228, 211, '#ec4899', 15);
            }
            if (flipProgress >= 1) {
                isFlipping = false; flipProgress = 0; finishFlip();
            }
        }
        drawScene();
        requestAnimationFrame(animateFrame);
    }

    function executeFlip() {
        if (isFlipping) return;
        isFlipping = true;
        flipProgress = 0;
        if (flipBtn) flipBtn.disabled = true;
        if (statusText) statusText.innerText = "Collapsing Reality Wavefront...";

        const bias = flipModeSelect ? flipModeSelect.value : 'fair';
        if (bias === 'alwaysWin') coinResult = userChoice;
        else if (bias === 'heavyHeads') coinResult = Math.random() < 0.75 ? 'heads' : 'tails';
        else if (bias === 'heavyTails') coinResult = Math.random() < 0.75 ? 'tails' : 'heads';
        else coinResult = Math.random() < 0.5 ? 'heads' : 'tails';

        playSmoothSound(350, 'sine', 0.12, 0.08);
    }

    function finishFlip() {
        if (flipBtn) flipBtn.disabled = false;
        const won = userChoice === coinResult;

        if (won) {
            if (statusText) statusText.innerText = `STATE REALIZED: ${coinResult.toUpperCase()}! TIMELINE WON! 🎉`;
            playSmoothSound(650, 'sine', 0.25, 0.12);
            createSparkles(228, 211, '#4ade80', 25);
            stats.wins++; stats.streak++;
        } else {
            if (statusText) statusText.innerText = `STATE REALIZED: ${coinResult.toUpperCase()}! PARADOX LOSS! 😅`;
            playSmoothSound(180, 'sawtooth', 0.25, 0.08);
            createSparkles(228, 211, '#f43f5e', 20);
            stats.streak = 0;
        }

        const winsEl = document.getElementById('stat-wins');
        const streakEl = document.getElementById('stat-streak');
        if (winsEl) winsEl.innerText = stats.wins;
        if (streakEl) streakEl.innerText = stats.streak;

        if (historyTags) {
            const tag = document.createElement('span');
            tag.className = `tag ${won ? 'tag-win' : 'tag-loss'}`;
            tag.innerText = won ? 'WIN' : 'LOSS';
            historyTags.prepend(tag);
            if (historyTags.children.length > 8) historyTags.removeChild(historyTags.lastChild);
        }

        const mode = gameModeSelect ? gameModeSelect.value : 'freePlay';
        if ((mode === 'bestOf3' && stats.wins >= 3) || (mode === 'targetScore' && stats.wins >= 5)) {
            setTimeout(() => {
                if (victoryOverlay) victoryOverlay.classList.remove('hidden');
                playVictoryChime();
            }, 300);
        }
    }

    requestAnimationFrame(animateFrame);
});
