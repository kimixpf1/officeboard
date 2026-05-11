/**
 * Canvas 宠物渲染器 — 圆润可爱风 v2
 * 120x100 画布，宠物有活动范围，道具可见，动画幅度大
 */
const PetRenderer = function(canvas, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = options || {};
    this.colors = Object.assign({
        body: '#F0C060', bodyLight: '#F5D080', bodyDark: '#D4A040',
        belly: '#FBE8B0', ear: '#C4883C', earInner: '#D4A050',
        nose: '#4A2810', eye: '#2C1810', paw: '#FBE8B0',
        blush: 'rgba(255,150,150,0.40)',
    }, options.colors || {});

    this.action = 'idle';
    this._frame = 0;
    this._running = false;
    this._petX = 0;       // 宠物水平偏移
    this._petFlip = 1;    // 朝向
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
        const W = this.canvas.width;   // 120
        const H = this.canvas.height;  // 100
        const c = this.colors;
        const t = frame / 30;
        const s = 1; // scale = 1 (canvas is right-sized)

        ctx.clearRect(0, 0, W, H);

        // ── 底色（浅色地面） ──
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath(); ctx.ellipse(W/2, H - 8, 50, 10, 0, 0, Math.PI*2); ctx.fill();

        // ── 动作参数 ──
        let bodyX = 0, bodyY = 0, bodySx = 1, bodySy = 1;
        let ears = [0, 0], tailA = 0, eyeS = 1, mouthOpen = false, mouthO = false;
        let prop = null; // 'bowl-food' | 'bowl-water' | 'bone' | 'leash'
        let petCX = W / 2;

        switch (action) {
            case 'idle':
                bodyY = Math.sin(t * 2) * 2;
                bodySy = 1 + Math.sin(t * 2) * 0.015;
                ears = [Math.sin(t * 1.8) * 0.1, Math.sin(t * 2.2) * 0.1];
                tailA = Math.sin(t * 3.5) * 0.3;
                break;
            case 'walk':
                bodyX = Math.sin(t * 5) * 18;   // 左右走动！
                bodyY = Math.abs(Math.sin(t * 5)) * 6;
                bodySy = 1 + Math.abs(Math.sin(t * 5)) * 0.04;
                ears = [Math.sin(t * 5) * 0.4, Math.sin(t * 5) * 0.4];
                tailA = Math.sin(t * 7) * 0.6;
                this._petFlip = bodyX > 0 ? 1 : -1;
                bodySx = this._petFlip;
                break;
            case 'eat':
                bodyY = (Math.sin(t * 7) > 0.4 ? -3 : 0);
                ears = [Math.sin(t * 5) * 0.2, Math.sin(t * 5) * 0.2];
                tailA = Math.sin(t * 8) * 0.55;
                eyeS = (Math.sin(t * 7) > 0.2 ? 0.15 : 1);
                mouthOpen = true; mouthO = Math.sin(t * 7) > 0.2;
                prop = 'bowl-food';
                bodyX = -10 * s;
                break;
            case 'drink':
                bodyY = Math.sin(t * 2.5) * 1.5;
                ears = [Math.sin(t * 2) * 0.12, Math.sin(t * 3) * 0.12];
                tailA = Math.sin(t * 4) * 0.2;
                mouthO = true;
                prop = 'bowl-water';
                bodyX = -12 * s;
                break;
            case 'leash':
                bodyX = Math.sin(t * 5.5) * 24;  // 大范围走动
                bodyY = Math.abs(Math.sin(t * 5.5)) * 7;
                bodySy = 1 + Math.abs(Math.sin(t * 5.5)) * 0.06;
                ears = [Math.sin(t * 4.5) * 0.45, Math.sin(t * 4.5) * 0.45];
                tailA = Math.sin(t * 8) * 0.7;
                prop = 'leash';
                this._petFlip = bodyX > 0 ? 1 : -1;
                bodySx = this._petFlip;
                break;
            case 'snack':
                bodyY = (Math.sin(t * 9) > 0.5 ? -6 : 2);  // 跳起来！
                ears = [Math.sin(t * 6) * 0.3, Math.sin(t * 6) * 0.3];
                tailA = Math.sin(t * 10) * 0.65;
                eyeS = (Math.sin(t * 9) > 0.3 ? 0.1 : 1);
                mouthOpen = true; mouthO = Math.sin(t * 9) > 0.1;
                prop = 'bone';
                bodyX = -8 * s;
                break;
            case 'sleep':
                bodyY = Math.sin(t * 1.2) * 1;
                bodySy = 0.75;
                ears = [0, 0]; tailA = Math.sin(t * 1) * 0.05;
                break;
        }

        petCX = W/2 + bodyX;
        const petCY = (action === 'sleep' ? H - 22 : H - 28) + bodyY;

        ctx.save();

        // ── SLEEP: 侧躺 ──
        if (action === 'sleep') {
            ctx.translate(petCX + 10, petCY + 8);
            ctx.scale(1, 0.78);

            // body
            ctx.fillStyle = c.body;
            ctx.beginPath(); ctx.ellipse(8, 4, 26, 15, 0.1, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = c.belly;
            ctx.beginPath(); ctx.ellipse(8, 7, 18, 9, 0.1, 0, Math.PI*2); ctx.fill();

            // head
            ctx.fillStyle = c.body;
            ctx.beginPath(); ctx.arc(-14, 0, 13, 0, Math.PI*2); ctx.fill();
            // ear
            ctx.fillStyle = c.ear;
            ctx.beginPath(); ctx.ellipse(-15, -10, 7, 5, -0.3, 0, Math.PI*2); ctx.fill();
            // closed eyes
            ctx.strokeStyle = c.eye; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(-17, -2, 2.5, 0.3, Math.PI-0.3); ctx.stroke();
            ctx.beginPath(); ctx.arc(-10, -2, 2.5, 0.3, Math.PI-0.3); ctx.stroke();
            // nose
            ctx.fillStyle = c.nose;
            ctx.beginPath(); ctx.ellipse(-14, 3, 3, 2.2, 0, 0, Math.PI*2); ctx.fill();

            // ZZZ (animated)
            const zz = frame % 90;
            ctx.fillStyle = '#aaddff';
            ctx.font = '11px sans-serif'; if (zz < 30) ctx.fillText('z', 22, -10);
            ctx.font = '14px sans-serif'; if (zz > 15 && zz < 45) ctx.fillText('Z', 30, -20);
            ctx.font = '18px sans-serif'; if (zz > 30 && zz < 60) ctx.fillText('Z', 40, -32);
        } else {
            // ── NORMAL POSE ──
            ctx.translate(petCX, petCY);
            ctx.scale(bodySx, bodySy);

            // ground shadow
            ctx.fillStyle = 'rgba(0,0,0,0.08)';
            ctx.beginPath(); ctx.ellipse(0, 30, 26, 5, 0, 0, Math.PI*2); ctx.fill();

            // ── 道具（在宠物后面） ──
            if (prop === 'bowl-food' || prop === 'bowl-water') {
                ctx.fillStyle = '#999';
                ctx.beginPath(); ctx.ellipse(-28, 22, 14, 5, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = prop === 'bowl-food' ? '#D4A43A' : '#88BBFF';
                ctx.beginPath(); ctx.ellipse(-28, 20, 12, 4, 0, 0, Math.PI*2); ctx.fill();
                // 食物颗粒
                if (prop === 'bowl-food') {
                    ctx.fillStyle = '#C4883C';
                    ctx.beginPath(); ctx.arc(-30, 18, 2, 0, Math.PI*2); ctx.fill();
                    ctx.beginPath(); ctx.arc(-26, 18, 2, 0, Math.PI*2); ctx.fill();
                    ctx.beginPath(); ctx.arc(-28, 16, 2.5, 0, Math.PI*2); ctx.fill();
                }
            }
            if (prop === 'bone') {
                ctx.save();
                ctx.translate(-22, 18);
                ctx.rotate(0.4 + Math.sin(t * 3) * 0.15);
                ctx.fillStyle = '#FFF8E0';
                ctx.fillRect(-10, -3, 20, 6);
                ctx.beginPath(); ctx.arc(-10, 0, 4, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(10, 0, 4, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#E8D8B0';
                ctx.beginPath(); ctx.arc(-10, 0, 2, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(10, 0, 2, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            }
            if (prop === 'leash') {
                ctx.strokeStyle = '#FF5555'; ctx.lineWidth = 2.5;
                ctx.setLineDash([4, 2]);
                ctx.beginPath();
                ctx.moveTo(22, -6);
                ctx.quadraticCurveTo(40, -22, 50, -28);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = '#FF5555';
                ctx.beginPath(); ctx.arc(50, -28, 4, 0, Math.PI*2); ctx.fill();
            }

            // ── tail ──
            ctx.save();
            ctx.translate(18, -8);
            ctx.rotate(-0.4 + tailA);
            ctx.fillStyle = c.body;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(9, -12, 6, -22);
            ctx.quadraticCurveTo(4, -14, 0, -6);
            ctx.fill();
            // fluffy tip
            ctx.fillStyle = c.belly;
            ctx.beginPath(); ctx.arc(6, -22, 4.5, 0, Math.PI*2); ctx.fill();
            ctx.restore();

            // ── body ──
            const bodyGrad = ctx.createLinearGradient(0, -14, 0, 20);
            bodyGrad.addColorStop(0, c.bodyLight);
            bodyGrad.addColorStop(0.45, c.body);
            bodyGrad.addColorStop(1, c.bodyDark);
            ctx.fillStyle = bodyGrad;
            ctx.beginPath(); ctx.ellipse(0, 0, 20, 24, 0, 0, Math.PI*2); ctx.fill();

            // belly
            ctx.fillStyle = c.belly;
            ctx.beginPath(); ctx.ellipse(0, 5, 14, 15, 0, 0, Math.PI*2); ctx.fill();

            // ── legs ──
            const legsAnim = (action === 'walk' || action === 'leash') ? bodyX * 0.5 : 0;
            // back legs
            ctx.fillStyle = c.bodyDark;
            ctx.roundRect(-7 + legsAnim*0.3, 20, 8, 9, 4);
            ctx.fill();
            ctx.roundRect(9 - legsAnim*0.3, 20, 8, 9, 4);
            ctx.fill();
            ctx.fillStyle = c.paw;
            ctx.beginPath(); ctx.ellipse(-3 + legsAnim*0.3, 28, 5, 3, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(13 - legsAnim*0.3, 28, 5, 3, 0, 0, Math.PI*2); ctx.fill();

            // front legs
            ctx.fillStyle = c.bodyDark;
            ctx.roundRect(-16 + legsAnim*0.5, 16, 7, 11, 3.5);
            ctx.fill();
            ctx.roundRect(11 - legsAnim*0.5, 16, 7, 11, 3.5);
            ctx.fill();
            ctx.fillStyle = c.paw;
            ctx.beginPath(); ctx.ellipse(-12.5 + legsAnim*0.5, 26, 4.5, 3, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(14.5 - legsAnim*0.5, 26, 4.5, 3, 0, 0, Math.PI*2); ctx.fill();

            // ── head ──
            ctx.fillStyle = c.body;
            ctx.beginPath(); ctx.arc(0, -18, 16, 0, Math.PI*2); ctx.fill();

            // cheek fluff
            ctx.fillStyle = c.bodyLight;
            ctx.beginPath(); ctx.ellipse(-12, -14, 7, 6, -0.3, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(12, -14, 7, 6, 0.3, 0, Math.PI*2); ctx.fill();

            // ears
            ctx.fillStyle = c.ear;
            ctx.beginPath(); ctx.save();
            ctx.translate(-10, -30); ctx.rotate(-0.1 + ears[0]);
            ctx.ellipse(0, 0, 7, 13, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = c.earInner;
            ctx.beginPath(); ctx.ellipse(0, 1, 4.5, 8, 0, 0, Math.PI*2); ctx.fill();
            ctx.restore();
            ctx.fillStyle = c.ear;
            ctx.beginPath(); ctx.save();
            ctx.translate(10, -30); ctx.rotate(0.1 + ears[1]);
            ctx.ellipse(0, 0, 7, 13, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = c.earInner;
            ctx.beginPath(); ctx.ellipse(0, 1, 4.5, 8, 0, 0, Math.PI*2); ctx.fill();
            ctx.restore();

            // ── eyes ──
            const ey = -22;
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.ellipse(-6, ey, 5.5, 6.5*eyeS, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(6, ey, 5.5, 6.5*eyeS, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = c.eye;
            ctx.beginPath(); ctx.arc(-6, ey+1, 3.2*eyeS, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(6, ey+1, 3.2*eyeS, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-4.5, ey-2, 1.8, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(7.5, ey-2, 1.8, 0, Math.PI*2); ctx.fill();

            // eyebrows
            ctx.strokeStyle = 'rgba(160,112,48,0.45)'; ctx.lineWidth = 1.3;
            ctx.beginPath(); ctx.moveTo(-11, ey-7); ctx.quadraticCurveTo(-6, ey-10.5, 0, ey-7); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, ey-7); ctx.quadraticCurveTo(6, ey-10.5, 11, ey-7); ctx.stroke();

            // blush
            const ba = parseFloat(c.blush.replace(/[^0-9.]/g, '')) || 0.4;
            ctx.fillStyle = `rgba(255,150,150,${ba})`;
            ctx.beginPath(); ctx.ellipse(-11, -15, 4, 3, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(11, -15, 4, 3, 0, 0, Math.PI*2); ctx.fill();

            // nose
            ctx.fillStyle = c.nose;
            ctx.beginPath(); ctx.ellipse(0, -14, 4.5, 3.2, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath(); ctx.arc(-1, -15, 1.3, 0, Math.PI*2); ctx.fill();

            // ── mouth ──
            if (mouthOpen && mouthO) {
                ctx.fillStyle = '#8B3535';
                ctx.beginPath(); ctx.ellipse(0, -8, 5, 4, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#D44444';
                ctx.beginPath(); ctx.ellipse(0, -7, 3, 2, 0, 0, Math.PI*2); ctx.fill();
            } else if (mouthO) {
                ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 1.3;
                ctx.beginPath(); ctx.ellipse(0, -10, 3, 2, 0, 0, Math.PI*2); ctx.stroke();
            } else {
                ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 1.3;
                ctx.beginPath(); ctx.arc(0, -11, 4, 0.3, Math.PI-0.3); ctx.stroke();
            }
        }

        ctx.restore();
    },

    destroy() {
        this.stop();
        this.canvas = null;
        this.ctx = null;
    }
};
