/**
 * Canvas 宠物渲染器 — 圆润可爱风
 * 独立模块，不依赖 idle-bar.js
 * 用法: const pet = new PetRenderer(canvas, colors); pet.setAction('idle'); pet.start();
 */
const PetRenderer = function(canvas, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = options || {};
    this.colors = Object.assign({
        body: '#F0C060', bodyLight: '#F5D080', bodyDark: '#D4A040',
        belly: '#FBE8B0', ear: '#C4883C', earInner: '#D4A050',
        nose: '#4A2810', eye: '#2C1810', paw: '#FBE8B0',
        blush: 'rgba(255,150,150,0.35)',
    }, options.colors || {});

    this.action = 'idle';
    this._frame = 0;
    this._running = false;
    this._onFrame = null;
};

PetRenderer.prototype = {

    start() {
        if (this._running) return;
        this._running = true;
        this._tick();
    },

    stop() {
        this._running = false;
        if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    },

    setAction(action) {
        if (this.action !== action) { this.action = action; this._frame = 0; }
    },

    setColors(colors) {
        Object.assign(this.colors, colors);
    },

    _tick() {
        if (!this._running) return;
        this._frame++;
        this._render(this._frame, this.action);
        if (this._onFrame) this._onFrame(this._frame, this.action);
        this._raf = requestAnimationFrame(() => this._tick());
    },

    _render(frame, action) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h * 0.6;
        const t = frame / 30;
        const c = this.colors;

        ctx.clearRect(0, 0, w, h);
        const s = Math.min(w, h) / 120; // scale factor

        // ── body params per action ──
        let bodyY = 0, bodySx = 1, bodySy = 1;
        let earL = 0, earR = 0, tailA = 0, eyeS = 1, blushA = 0.35;
        let legsSpread = 0;

        switch (action) {
            case 'idle':
                bodyY = Math.sin(t * 2.5) * 2 * s;
                bodySy = 1 + Math.sin(t * 2.5) * 0.02;
                earL = Math.sin(t * 2) * 0.08;
                earR = -Math.sin(t * 2) * 0.08;
                tailA = Math.sin(t * 4) * 0.25;
                break;
            case 'walk':
                bodyY = Math.abs(Math.sin(t * 5)) * 4 * s - 2 * s;
                bodySy = 1 + Math.abs(Math.sin(t * 5)) * 0.04;
                earL = Math.sin(t * 5) * 0.3; earR = -Math.sin(t * 5) * 0.3;
                tailA = Math.sin(t * 7) * 0.5;
                legsSpread = Math.sin(t * 6) * 5 * s;
                break;
            case 'eat':
                bodyY = (Math.sin(t * 8) > 0.5 ? -2 * s : 0);
                earL = Math.sin(t * 6) * 0.15; earR = -Math.sin(t * 6) * 0.15;
                tailA = Math.sin(t * 9) * 0.45;
                eyeS = (Math.sin(t * 8) > 0.3 ? 0.2 : 1);
                blushA = 0.5;
                break;
            case 'drink':
                bodyY = Math.sin(t * 3) * 1.5 * s;
                earL = Math.sin(t * 2.5) * 0.1; earR = -Math.sin(t * 2.5) * 0.1;
                tailA = Math.sin(t * 5) * 0.2;
                break;
            case 'leash':
                bodyY = Math.abs(Math.sin(t * 6)) * 3 * s - 1 * s;
                earL = Math.sin(t * 5) * 0.25; earR = -Math.sin(t * 5) * 0.25;
                tailA = Math.sin(t * 8) * 0.6;
                legsSpread = Math.sin(t * 6) * 4 * s;
                blushA = 0.5;
                break;
            case 'snack':
                bodyY = (Math.sin(t * 10) > 0.6 ? -3 * s : 0);
                earL = Math.sin(t * 7) * 0.2; earR = -Math.sin(t * 7) * 0.2;
                tailA = Math.sin(t * 10) * 0.55;
                eyeS = (Math.sin(t * 10) > 0.3 ? 0.15 : 1);
                blushA = 0.5;
                break;
            case 'sleep':
                bodyY = Math.sin(t * 1.5) * 1.5 * s;
                bodySy = 0.8;
                earL = 0; earR = 0;
                tailA = Math.sin(t * 1.2) * 0.08;
                blushA = 0.25;
                break;
        }

        const by = cy + bodyY;

        ctx.save();

        // ── sleep: side-lying pose ──
        if (action === 'sleep') {
            ctx.translate(cx - 5 * s, by);
            ctx.rotate(-0.25);

            // body (horizontal oval)
            ctx.fillStyle = c.body;
            ctx.beginPath(); ctx.ellipse(0, 0, 28 * s, 16 * s, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = c.belly;
            ctx.beginPath(); ctx.ellipse(0, 3 * s, 20 * s, 10 * s, 0, 0, Math.PI * 2); ctx.fill();

            // head
            ctx.fillStyle = c.body;
            ctx.beginPath(); ctx.arc(-24 * s, -5 * s, 13 * s, 0, Math.PI * 2); ctx.fill();
            // ear
            ctx.fillStyle = c.ear;
            ctx.beginPath(); ctx.ellipse(-25 * s, -16 * s, 8 * s, 5 * s, -0.3, 0, Math.PI * 2); ctx.fill();
            // closed eyes
            ctx.strokeStyle = c.nose; ctx.lineWidth = 1.5 * s;
            ctx.beginPath(); ctx.arc(-28 * s, -7 * s, 2.5 * s, 0.2, Math.PI - 0.2); ctx.stroke();
            // nose
            ctx.fillStyle = c.nose;
            ctx.beginPath(); ctx.ellipse(-25 * s, -2 * s, 3.5 * s, 2.5 * s, 0, 0, Math.PI * 2); ctx.fill();
            // ZZZ
            ctx.fillStyle = '#aaddff'; ctx.font = `${7*s}px sans-serif`;
            ctx.fillText('z', 12 * s, -16 * s);
            ctx.font = `${9*s}px sans-serif`;
            ctx.fillText('Z', 18 * s, -24 * s);
        } else {
            // ── normal pose ──
            ctx.translate(cx, by);
            ctx.scale(bodySx, bodySy);

            // shadow
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.beginPath(); ctx.ellipse(0, 32 * s, 22 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();

            // tail
            ctx.save();
            ctx.translate(18 * s, -8 * s);
            ctx.rotate(-0.5 + tailA);
            ctx.fillStyle = c.body;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(8 * s, -10 * s, 5 * s, -18 * s);
            ctx.quadraticCurveTo(3 * s, -10 * s, 0, -5 * s);
            ctx.fill();
            ctx.fillStyle = c.belly;
            ctx.beginPath(); ctx.arc(5 * s, -18 * s, 3.5 * s, 0, Math.PI * 2); ctx.fill();
            ctx.restore();

            // body (egg shape)
            const bodyGrad = ctx.createLinearGradient(0, -12 * s, 0, 18 * s);
            bodyGrad.addColorStop(0, c.bodyLight);
            bodyGrad.addColorStop(0.5, c.body);
            bodyGrad.addColorStop(1, c.bodyDark);
            ctx.fillStyle = bodyGrad;
            ctx.beginPath(); ctx.ellipse(0, 0, 18 * s, 22 * s, 0, 0, Math.PI * 2); ctx.fill();

            // belly
            ctx.fillStyle = c.belly;
            ctx.beginPath(); ctx.ellipse(0, 4 * s, 13 * s, 14 * s, 0, 0, Math.PI * 2); ctx.fill();

            // back legs
            ctx.fillStyle = c.bodyDark;
            ctx.beginPath(); ctx.ellipse(-6 * s - legsSpread * 0.3, 22 * s, 7 * s, 7 * s, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(6 * s + legsSpread * 0.3, 22 * s, 7 * s, 7 * s, 0, 0, Math.PI * 2); ctx.fill();
            // paws
            ctx.fillStyle = c.paw;
            ctx.beginPath(); ctx.ellipse(-6 * s - legsSpread * 0.3, 28 * s, 4.5 * s, 2.5 * s, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(6 * s + legsSpread * 0.3, 28 * s, 4.5 * s, 2.5 * s, 0, 0, Math.PI * 2); ctx.fill();

            // front legs
            ctx.fillStyle = c.bodyDark;
            ctx.beginPath(); ctx.ellipse(-12 * s + legsSpread * 0.5, 18 * s, 6 * s, 9 * s, 0.1, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(12 * s - legsSpread * 0.5, 18 * s, 6 * s, 9 * s, -0.1, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = c.paw;
            ctx.beginPath(); ctx.ellipse(-12 * s + legsSpread * 0.5, 26 * s, 4 * s, 2.5 * s, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(12 * s - legsSpread * 0.5, 26 * s, 4 * s, 2.5 * s, 0, 0, Math.PI * 2); ctx.fill();

            // head
            ctx.fillStyle = c.body;
            ctx.beginPath(); ctx.arc(0, -18 * s, 15 * s, 0, Math.PI * 2); ctx.fill();

            // cheek fluff
            ctx.fillStyle = c.bodyLight;
            ctx.beginPath(); ctx.ellipse(-11 * s, -14 * s, 7 * s, 6 * s, -0.3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(11 * s, -14 * s, 7 * s, 6 * s, 0.3, 0, Math.PI * 2); ctx.fill();

            // ears (floppy)
            ctx.fillStyle = c.ear;
            ctx.beginPath(); ctx.save();
            ctx.translate(-10 * s, -30 * s);
            ctx.rotate(-0.15 + earL);
            ctx.ellipse(0, 0, 6.5 * s, 11 * s, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = c.earInner;
            ctx.beginPath(); ctx.ellipse(0, 1 * s, 4 * s, 7 * s, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
            ctx.fillStyle = c.ear;
            ctx.beginPath(); ctx.save();
            ctx.translate(10 * s, -30 * s);
            ctx.rotate(0.15 + earR);
            ctx.ellipse(0, 0, 6.5 * s, 11 * s, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = c.earInner;
            ctx.beginPath(); ctx.ellipse(0, 1 * s, 4 * s, 7 * s, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();

            // eyes
            const ey = -22 * s;
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.ellipse(-6 * s, ey, 5 * s, 6 * eyeS * s, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(6 * s, ey, 5 * s, 6 * eyeS * s, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = c.eye;
            ctx.beginPath(); ctx.arc(-6 * s, ey + 1 * s, 3 * eyeS * s, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(6 * s, ey + 1 * s, 3 * eyeS * s, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-4.5 * s, ey - 2 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(7.5 * s, ey - 2 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();

            // eyebrows
            ctx.strokeStyle = 'rgba(160,112,48,0.5)'; ctx.lineWidth = 1.2 * s;
            ctx.beginPath(); ctx.moveTo(-10 * s, ey - 7 * s); ctx.quadraticCurveTo(-6 * s, ey - 10 * s, -1 * s, ey - 7 * s); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(1 * s, ey - 7 * s); ctx.quadraticCurveTo(6 * s, ey - 10 * s, 10 * s, ey - 7 * s); ctx.stroke();

            // blush
            ctx.fillStyle = c.blush.replace(/[\d.]+\)$/, blushA + ')');
            ctx.beginPath(); ctx.ellipse(-11 * s, -15 * s, 3.5 * s, 2.5 * s, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(11 * s, -15 * s, 3.5 * s, 2.5 * s, 0, 0, Math.PI * 2); ctx.fill();

            // nose
            ctx.fillStyle = c.nose;
            ctx.beginPath(); ctx.ellipse(0, -14 * s, 4 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.beginPath(); ctx.arc(-1 * s, -15 * s, 1.2 * s, 0, Math.PI * 2); ctx.fill();

            // mouth
            if (action === 'eat' || action === 'snack') {
                const open = Math.sin(t * 12) > 0.1;
                if (open) {
                    ctx.fillStyle = '#8B3535';
                    ctx.beginPath(); ctx.ellipse(0, -9 * s, 4 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#D44444';
                    ctx.beginPath(); ctx.ellipse(0, -8 * s, 2.5 * s, 1.5 * s, 0, 0, Math.PI * 2); ctx.fill();
                } else {
                    ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 1.2 * s;
                    ctx.beginPath(); ctx.moveTo(-2.5 * s, -10 * s); ctx.quadraticCurveTo(0, -8 * s, 2.5 * s, -10 * s); ctx.stroke();
                }
            } else if (action === 'drink') {
                ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 1.2 * s;
                ctx.beginPath(); ctx.ellipse(0, -10 * s, 2.5 * s, 1.5 * s, 0, 0, Math.PI * 2); ctx.stroke();
            } else {
                ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 1.2 * s;
                ctx.beginPath(); ctx.arc(0, -12 * s, 3.5 * s, 0.3, Math.PI - 0.3); ctx.stroke();
            }
        }

        // ── action props ──
        if (action === 'eat') {
            ctx.fillStyle = '#888';
            ctx.beginPath(); ctx.ellipse(cx - 35 * s, cy + 22 * s, 10 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#D4A43A';
            ctx.beginPath(); ctx.ellipse(cx - 35 * s, cy + 21 * s, 8 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill();
        } else if (action === 'drink') {
            ctx.fillStyle = '#88aaff';
            ctx.beginPath(); ctx.ellipse(cx - 35 * s, cy + 22 * s, 10 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#aaccff';
            ctx.beginPath(); ctx.ellipse(cx - 35 * s, cy + 21 * s, 7 * s, 2.5 * s, 0, 0, Math.PI * 2); ctx.fill();
        } else if (action === 'leash') {
            ctx.strokeStyle = '#ff6666'; ctx.lineWidth = 2.5 * s;
            ctx.beginPath();
            ctx.moveTo(cx + 24 * s, cy - 10 * s);
            ctx.quadraticCurveTo(cx + 40 * s, cy - 25 * s, cx + 38 * s, cy - 35 * s);
            ctx.stroke();
        } else if (action === 'snack') {
            // bone
            ctx.fillStyle = '#FFF8E0';
            ctx.save();
            ctx.translate(cx - 30 * s, cy + 15 * s);
            ctx.rotate(0.3);
            ctx.fillRect(-4 * s, -2 * s, 14 * s, 4 * s);
            ctx.beginPath(); ctx.arc(-4 * s, 0, 3 * s, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(10 * s, 0, 3 * s, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    },

    destroy() {
        this.stop();
        this.canvas = null;
        this.ctx = null;
    }
};
