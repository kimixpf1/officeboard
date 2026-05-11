/**
 * Canvas 宠物渲染器 — 物种差异化 v3
 * 120x100 画布，6种物种独立造型：dog/cat/panda/fox/rabbit/penguin
 */
const SPECIES_PROFILES = {
    dog: { bodyRx: 19, bodyRy: 23, headR: 17, headY: -19, earType: 'teddy', earW: 9, earH: 9, earY: -29, tailType: 'wag', tailLen: 14, snout: 0, cheekFluff: true, fluffy: true },
    cat: { bodyRx: 18, bodyRy: 22, headR: 15, headY: -17, earType: 'pointed', earW: 7, earH: 14, earY: -29, tailType: 'curl', tailLen: 20, snout: 0, cheekFluff: false, whiskers: true },
    panda: { bodyRx: 22, bodyRy: 26, headR: 18, headY: -20, earType: 'round', earR: 7, earY: -27, tailType: 'tiny', tailR: 5, snout: 0, cheekFluff: true, eyePatch: true },
    fox: { bodyRx: 16, bodyRy: 22, headR: 14, headY: -16, earType: 'pointedLarge', earW: 8, earH: 18, earY: -30, tailType: 'bushy', tailLen: 26, snout: 5, cheekFluff: false, whiskers: true },
    rabbit: { bodyRx: 18, bodyRy: 22, headR: 15, headY: -17, earType: 'long', earW: 5, earH: 22, earY: -34, tailType: 'cotton', tailR: 5, snout: 0, cheekFluff: true },
    penguin: { bodyRx: 17, bodyRy: 26, headR: 13, headY: -20, earType: 'none', tailType: 'none', snout: 0, cheekFluff: false, beak: true, flippers: true }
};

const PetRenderer = function(canvas, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = options || {};
    this.species = options.species || 'dog';
    this.profile = SPECIES_PROFILES[this.species] || SPECIES_PROFILES.dog;
    this.colors = Object.assign({
        body: '#F0C060', bodyLight: '#F5D080', bodyDark: '#D4A040',
        belly: '#FBE8B0', ear: '#C4883C', earInner: '#D4A050',
        nose: '#4A2810', eye: '#2C1810', paw: '#FBE8B0',
        blush: 'rgba(255,150,150,0.40)',
    }, options.colors || {});

    this.action = 'idle';
    this._frame = 0;
    this._running = false;
    this._petX = 0;
    this._petFlip = 1;
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

    setSpecies(species, colors) {
        this.species = species;
        this.profile = SPECIES_PROFILES[species] || SPECIES_PROFILES.dog;
        if (colors) Object.assign(this.colors, colors);
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
        const W = this.canvas.width;
        const H = this.canvas.height;
        const c = this.colors;
        const sp = this.profile;
        const t = frame / 30;

        ctx.clearRect(0, 0, W, H);

        // ground
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath(); ctx.ellipse(W/2, H - 8, 50, 10, 0, 0, Math.PI*2); ctx.fill();

        // action params
        let bodyX = 0, bodyY = 0, bodySx = 1, bodySy = 1;
        let ears = [0, 0], tailA = 0, eyeS = 1, mouthOpen = false, mouthO = false;
        let prop = null;
        let petCX = W / 2;

        switch (action) {
            case 'idle':
                bodyY = Math.sin(t * 2) * 2;
                bodySy = 1 + Math.sin(t * 2) * 0.015;
                ears = [Math.sin(t * 1.8) * 0.1, Math.sin(t * 2.2) * 0.1];
                tailA = sp.tailType === 'none' ? 0 : Math.sin(t * 3.5) * 0.3;
                break;
            case 'walk':
                bodyX = Math.sin(t * 5) * 18;
                bodyY = Math.abs(Math.sin(t * 5)) * 6;
                bodySy = 1 + Math.abs(Math.sin(t * 5)) * 0.04;
                ears = [Math.sin(t * 5) * 0.4, Math.sin(t * 5) * 0.4];
                tailA = sp.tailType === 'none' ? 0 : Math.sin(t * 7) * 0.6;
                this._petFlip = bodyX > 0 ? 1 : -1;
                bodySx = this._petFlip;
                break;
            case 'eat':
                bodyY = (Math.sin(t * 7) > 0.4 ? -3 : 0);
                ears = [Math.sin(t * 5) * 0.2, Math.sin(t * 5) * 0.2];
                tailA = sp.tailType === 'none' ? 0 : Math.sin(t * 8) * 0.55;
                eyeS = (Math.sin(t * 7) > 0.2 ? 0.15 : 1);
                mouthOpen = true; mouthO = Math.sin(t * 7) > 0.2;
                prop = 'bowl-food';
                bodyX = -10;
                break;
            case 'drink':
                bodyY = Math.sin(t * 2.5) * 1.5;
                ears = [Math.sin(t * 2) * 0.12, Math.sin(t * 3) * 0.12];
                tailA = sp.tailType === 'none' ? 0 : Math.sin(t * 4) * 0.2;
                mouthO = true;
                prop = 'bowl-water';
                bodyX = -12;
                break;
            case 'leash':
                bodyX = Math.sin(t * 5.5) * 24;
                bodyY = Math.abs(Math.sin(t * 5.5)) * 7;
                bodySy = 1 + Math.abs(Math.sin(t * 5.5)) * 0.06;
                ears = [Math.sin(t * 4.5) * 0.45, Math.sin(t * 4.5) * 0.45];
                tailA = sp.tailType === 'none' ? 0 : Math.sin(t * 8) * 0.7;
                prop = 'leash';
                this._petFlip = bodyX > 0 ? 1 : -1;
                bodySx = this._petFlip;
                break;
            case 'snack':
                bodyY = (Math.sin(t * 9) > 0.5 ? -6 : 2);
                ears = [Math.sin(t * 6) * 0.3, Math.sin(t * 6) * 0.3];
                tailA = sp.tailType === 'none' ? 0 : Math.sin(t * 10) * 0.65;
                eyeS = (Math.sin(t * 9) > 0.3 ? 0.1 : 1);
                mouthOpen = true; mouthO = Math.sin(t * 9) > 0.1;
                prop = 'bone';
                bodyX = -8;
                break;
            case 'sleep':
                bodyY = Math.sin(t * 1.2) * 1;
                bodySy = 0.75;
                ears = [0, 0]; if (sp.tailType !== 'none') tailA = Math.sin(t * 1) * 0.05;
                break;
        }

        petCX = W/2 + bodyX;
        const petCY = (action === 'sleep' ? H - 22 : H - 28) + bodyY;

        ctx.save();

        // ── SLEEP pose ──
        if (action === 'sleep') {
            ctx.translate(petCX + 10, petCY + 8);
            ctx.scale(1, 0.78);

            // body (species-specific size)
            ctx.fillStyle = c.body;
            ctx.beginPath(); ctx.ellipse(8, 4, sp.bodyRx + 6, sp.bodyRy * 0.6, 0.1, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = c.belly;
            ctx.beginPath(); ctx.ellipse(8, 7, sp.bodyRx * 0.7, sp.bodyRy * 0.38, 0.1, 0, Math.PI*2); ctx.fill();

            // head
            ctx.fillStyle = c.body;
            const sleepHeadR = sp.headR * 0.8;
            ctx.beginPath(); ctx.arc(-14, 0, sleepHeadR, 0, Math.PI*2); ctx.fill();
            // species-specific ear (sleep)
            if (sp.earType !== 'none') {
                ctx.fillStyle = c.ear;
                const sleepEarW = sp.earR ? sp.earR : sp.earW * 0.8;
                const sleepEarH = sp.earR ? sp.earR : sp.earH * 0.5;
                ctx.beginPath(); ctx.ellipse(-15, -10, sleepEarW, sleepEarH, -0.3, 0, Math.PI*2); ctx.fill();
            }
            // closed eyes
            ctx.strokeStyle = c.eye; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(-17, -2, 2.5, 0.3, Math.PI-0.3); ctx.stroke();
            ctx.beginPath(); ctx.arc(-10, -2, 2.5, 0.3, Math.PI-0.3); ctx.stroke();
            // nose/beak
            if (sp.beak) {
                ctx.fillStyle = '#F08830';
                ctx.beginPath(); ctx.moveTo(-16, 2); ctx.lineTo(-12, 2); ctx.lineTo(-14, 5); ctx.closePath(); ctx.fill();
            } else {
                ctx.fillStyle = c.nose;
                ctx.beginPath(); ctx.ellipse(-14, 3, 3, 2.2, 0, 0, Math.PI*2); ctx.fill();
            }

            // ZZZ
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
            ctx.beginPath(); ctx.ellipse(0, 30, sp.bodyRx + 6, 5, 0, 0, Math.PI*2); ctx.fill();

            // ── props (behind pet) ──
            const propY = sp.flippers ? 20 : 22;
            if (prop === 'bowl-food' || prop === 'bowl-water') {
                ctx.fillStyle = '#999';
                ctx.beginPath(); ctx.ellipse(-28, propY, 14, 5, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = prop === 'bowl-food' ? '#D4A43A' : '#88BBFF';
                ctx.beginPath(); ctx.ellipse(-28, propY - 2, 12, 4, 0, 0, Math.PI*2); ctx.fill();
                if (prop === 'bowl-food') {
                    ctx.fillStyle = '#C4883C';
                    ctx.beginPath(); ctx.arc(-30, propY - 4, 2, 0, Math.PI*2); ctx.fill();
                    ctx.beginPath(); ctx.arc(-26, propY - 4, 2, 0, Math.PI*2); ctx.fill();
                    ctx.beginPath(); ctx.arc(-28, propY - 6, 2.5, 0, Math.PI*2); ctx.fill();
                }
            }
            if (prop === 'bone') {
                ctx.save();
                const boneY = sp.flippers ? 14 : 18;
                ctx.translate(-22, boneY);
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
                const leashStartY = sp.flippers ? -6 : -6;
                ctx.strokeStyle = '#FF5555'; ctx.lineWidth = 2.5;
                ctx.setLineDash([4, 2]);
                ctx.beginPath();
                ctx.moveTo(22, leashStartY);
                ctx.quadraticCurveTo(40, -22, 50, -28);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = '#FF5555';
                ctx.beginPath(); ctx.arc(50, -28, 4, 0, Math.PI*2); ctx.fill();
            }

            // ── tail (species-specific) ──
            if (sp.tailType !== 'none') {
                ctx.save();
                ctx.translate(sp.bodyRx - 2, -8);
                ctx.rotate(-0.4 + tailA);
                if (sp.tailType === 'bushy') {
                    // Fox: super fluffy tail
                    ctx.fillStyle = c.body;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.quadraticCurveTo(10, -14, 8, -26);
                    ctx.quadraticCurveTo(6, -30, 2, -26);
                    ctx.quadraticCurveTo(4, -14, 0, -6);
                    ctx.fill();
                    ctx.fillStyle = c.belly;
                    ctx.beginPath(); ctx.ellipse(5, -25, 6, 7, 0.2, 0, Math.PI*2); ctx.fill();
                } else if (sp.tailType === 'curl') {
                    // Cat: curling tail
                    ctx.fillStyle = c.body;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.quadraticCurveTo(6, -12, 8, -20);
                    ctx.quadraticCurveTo(4, -24, 0, -22);
                    ctx.quadraticCurveTo(-2, -20, 4, -14);
                    ctx.quadraticCurveTo(2, -6, 0, 0);
                    ctx.fill();
                } else if (sp.tailType === 'cotton') {
                    // Rabbit: cotton ball
                    ctx.fillStyle = '#FFFFFF';
                    ctx.beginPath(); ctx.arc(4, -5, sp.tailR, 0, Math.PI*2); ctx.fill();
                } else if (sp.tailType === 'tiny') {
                    // Panda: tiny round tail
                    ctx.fillStyle = c.body;
                    ctx.beginPath(); ctx.arc(2, -4, sp.tailR, 0, Math.PI*2); ctx.fill();
                } else {
                    // Dog wag: default
                    ctx.fillStyle = c.body;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.quadraticCurveTo(9, -12, 6, -22);
                    ctx.quadraticCurveTo(4, -14, 0, -6);
                    ctx.fill();
                    ctx.fillStyle = c.belly;
                    ctx.beginPath(); ctx.arc(6, -22, 4.5, 0, Math.PI*2); ctx.fill();
                }
                ctx.restore();
            }

            // ── body ──
            // Fluffy fur outline (teddy dog)
            if (sp.fluffy) {
                ctx.fillStyle = c.bodyDark;
                ctx.beginPath(); ctx.ellipse(0, 1, sp.bodyRx + 2, sp.bodyRy + 2, 0, 0, Math.PI*2); ctx.fill();
                // Fur tufts
                const tufts = 7;
                for (let i = 0; i < tufts; i++) {
                    const angle = (i / tufts) * Math.PI * 2;
                    const tx = Math.cos(angle) * (sp.bodyRx + 1);
                    const ty = Math.sin(angle) * (sp.bodyRy + 1);
                    ctx.beginPath(); ctx.arc(tx, ty, 3, 0, Math.PI*2); ctx.fill();
                }
            }
            const bodyGrad = ctx.createLinearGradient(0, -sp.bodyRy, 0, sp.bodyRy);
            bodyGrad.addColorStop(0, c.bodyLight);
            bodyGrad.addColorStop(0.45, c.body);
            bodyGrad.addColorStop(1, c.bodyDark);
            ctx.fillStyle = bodyGrad;
            ctx.beginPath(); ctx.ellipse(0, 0, sp.bodyRx, sp.bodyRy, 0, 0, Math.PI*2); ctx.fill();

            // belly
            if (sp.beak) {
                // Penguin: white belly patch
                ctx.fillStyle = '#FAFAFA';
                ctx.beginPath(); ctx.ellipse(0, 4, sp.bodyRx * 0.65, sp.bodyRy * 0.7, 0, 0, Math.PI*2); ctx.fill();
            } else {
                ctx.fillStyle = c.belly;
                ctx.beginPath(); ctx.ellipse(0, 5, sp.bodyRx * 0.7, sp.bodyRy * 0.62, 0, 0, Math.PI*2); ctx.fill();
            }

            // ── legs / flippers ──
            const legsAnim = (action === 'walk' || action === 'leash') ? bodyX * 0.5 : 0;
            if (sp.flippers) {
                // Penguin flippers (instead of front legs)
                ctx.fillStyle = c.bodyDark;
                ctx.save();
                ctx.translate(-sp.bodyRx + 2, 8);
                ctx.rotate(-0.3 + Math.sin(t * 3) * 0.15);
                ctx.beginPath(); ctx.ellipse(0, 0, 4, 12, 0, 0, Math.PI*2); ctx.fill();
                ctx.restore();
                ctx.save();
                ctx.translate(sp.bodyRx - 2, 8);
                ctx.rotate(0.3 - Math.sin(t * 3) * 0.15);
                ctx.beginPath(); ctx.ellipse(0, 0, 4, 12, 0, 0, Math.PI*2); ctx.fill();
                ctx.restore();
                // Penguin feet
                ctx.fillStyle = '#F08830';
                ctx.beginPath(); ctx.ellipse(-sp.bodyRx * 0.5 + legsAnim * 0.3, sp.bodyRy + 2, 6, 2.5, 0, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(sp.bodyRx * 0.5 - legsAnim * 0.3, sp.bodyRy + 2, 6, 2.5, 0, 0, Math.PI*2); ctx.fill();
            } else {
                // Normal 4 legs
                ctx.fillStyle = c.bodyDark;
                ctx.beginPath(); ctx.roundRect(-7 + legsAnim * 0.3, sp.bodyRy - 4, 8, 9, 4); ctx.fill();
                ctx.beginPath(); ctx.roundRect(9 - legsAnim * 0.3, sp.bodyRy - 4, 8, 9, 4); ctx.fill();
                ctx.fillStyle = c.paw;
                ctx.beginPath(); ctx.ellipse(-3 + legsAnim * 0.3, sp.bodyRy + 4, 5, 3, 0, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(13 - legsAnim * 0.3, sp.bodyRy + 4, 5, 3, 0, 0, Math.PI*2); ctx.fill();
                // front legs
                ctx.fillStyle = c.bodyDark;
                ctx.beginPath(); ctx.roundRect(-sp.bodyRx + 4 + legsAnim * 0.5, sp.bodyRy - 8, 7, 11, 3.5); ctx.fill();
                ctx.beginPath(); ctx.roundRect(sp.bodyRx - 9 - legsAnim * 0.5, sp.bodyRy - 8, 7, 11, 3.5); ctx.fill();
                ctx.fillStyle = c.paw;
                ctx.beginPath(); ctx.ellipse(-sp.bodyRx + 7.5 + legsAnim * 0.5, sp.bodyRy + 2, 4.5, 3, 0, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(sp.bodyRx - 5.5 - legsAnim * 0.5, sp.bodyRy + 2, 4.5, 3, 0, 0, Math.PI*2); ctx.fill();
            }

            // ── head ──
            ctx.fillStyle = c.body;
            if (sp.snout > 0) {
                // Fox: draw head with snout
                ctx.beginPath();
                ctx.arc(0, sp.headY, sp.headR, 0, Math.PI*2);
                ctx.fill();
                // Pointy snout
                ctx.beginPath();
                ctx.moveTo(sp.headR * 0.4, sp.headY + sp.headR * 0.3);
                ctx.quadraticCurveTo(sp.headR + sp.snout, sp.headY + sp.headR * 0.1, sp.headR + sp.snout + 2, sp.headY - 2);
                ctx.quadraticCurveTo(sp.headR + sp.snout, sp.headY - sp.headR * 0.2, sp.headR * 0.4, sp.headY - sp.headR * 0.3);
                ctx.fill();
            } else {
                ctx.beginPath(); ctx.arc(0, sp.headY, sp.headR, 0, Math.PI*2); ctx.fill();
            }

            // cheek fluff
            if (sp.cheekFluff) {
                ctx.fillStyle = c.bodyLight;
                ctx.beginPath(); ctx.ellipse(-sp.headR * 0.75, sp.headY + 4, sp.headR * 0.44, sp.headR * 0.38, -0.3, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(sp.headR * 0.75, sp.headY + 4, sp.headR * 0.44, sp.headR * 0.38, 0.3, 0, Math.PI*2); ctx.fill();
            }

            // ── ears (species-specific) ──
            const earBaseY = sp.earY || -30;
            if (sp.earType !== 'none') {
                const drawEarPair = (lx, rx, ew, eh, er) => {
                    // Left ear
                    ctx.fillStyle = c.ear;
                    ctx.beginPath(); ctx.save();
                    ctx.translate(lx, earBaseY); ctx.rotate(-0.1 + ears[0]);
                    if (er) {
                        ctx.beginPath(); ctx.arc(0, 0, er, 0, Math.PI*2); ctx.fill();
                    } else {
                        ctx.beginPath(); ctx.ellipse(0, 0, ew, eh, 0, 0, Math.PI*2); ctx.fill();
                        if (!sp.beak) {
                            ctx.fillStyle = c.earInner;
                            ctx.beginPath(); ctx.ellipse(0, 1, ew * 0.65, eh * 0.6, 0, 0, Math.PI*2); ctx.fill();
                        }
                    }
                    ctx.restore();
                    // Right ear
                    ctx.fillStyle = c.ear;
                    ctx.beginPath(); ctx.save();
                    ctx.translate(rx, earBaseY); ctx.rotate(0.1 + ears[1]);
                    if (er) {
                        ctx.beginPath(); ctx.arc(0, 0, er, 0, Math.PI*2); ctx.fill();
                    } else {
                        ctx.beginPath(); ctx.ellipse(0, 0, ew, eh, 0, 0, Math.PI*2); ctx.fill();
                        if (!sp.beak) {
                            ctx.fillStyle = c.earInner;
                            ctx.beginPath(); ctx.ellipse(0, 1, ew * 0.65, eh * 0.6, 0, 0, Math.PI*2); ctx.fill();
                        }
                    }
                    ctx.restore();
                };

                if (sp.earType === 'round') {
                    drawEarPair(-sp.headR * 0.55, sp.headR * 0.55, null, null, sp.earR);
                } else if (sp.earType === 'pointed' || sp.earType === 'pointedLarge') {
                    // Triangle ears
                    ctx.fillStyle = c.ear;
                    const ew = sp.earW, eh = sp.earH;
                    // Left
                    ctx.beginPath(); ctx.save();
                    ctx.translate(-sp.headR * 0.55, earBaseY); ctx.rotate(-0.1 + ears[0]);
                    ctx.moveTo(0, -eh); ctx.lineTo(-ew, eh * 0.3); ctx.lineTo(ew, eh * 0.3); ctx.closePath(); ctx.fill();
                    ctx.fillStyle = c.earInner;
                    ctx.moveTo(0, -eh * 0.5); ctx.lineTo(-ew * 0.55, eh * 0.15); ctx.lineTo(ew * 0.55, eh * 0.15); ctx.closePath(); ctx.fill();
                    ctx.restore();
                    // Right
                    ctx.fillStyle = c.ear;
                    ctx.beginPath(); ctx.save();
                    ctx.translate(sp.headR * 0.55, earBaseY); ctx.rotate(0.1 + ears[1]);
                    ctx.moveTo(0, -eh); ctx.lineTo(-ew, eh * 0.3); ctx.lineTo(ew, eh * 0.3); ctx.closePath(); ctx.fill();
                    ctx.fillStyle = c.earInner;
                    ctx.moveTo(0, -eh * 0.5); ctx.lineTo(-ew * 0.55, eh * 0.15); ctx.lineTo(ew * 0.55, eh * 0.15); ctx.closePath(); ctx.fill();
                    ctx.restore();
                } else if (sp.earType === 'teddy') {
                    // Teddy dog: wide round droopy ears
                    ctx.fillStyle = c.ear;
                    ctx.beginPath(); ctx.save();
                    ctx.translate(-sp.headR * 0.5, earBaseY + 4); ctx.rotate(-0.15 + ears[0]);
                    ctx.beginPath(); ctx.ellipse(0, 0, sp.earW, sp.earH, 0, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = c.earInner;
                    ctx.beginPath(); ctx.ellipse(0, 1, sp.earW * 0.6, sp.earH * 0.55, 0, 0, Math.PI*2); ctx.fill();
                    ctx.restore();
                    ctx.fillStyle = c.ear;
                    ctx.beginPath(); ctx.save();
                    ctx.translate(sp.headR * 0.5, earBaseY + 4); ctx.rotate(0.15 + ears[1]);
                    ctx.beginPath(); ctx.ellipse(0, 0, sp.earW, sp.earH, 0, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = c.earInner;
                    ctx.beginPath(); ctx.ellipse(0, 1, sp.earW * 0.6, sp.earH * 0.55, 0, 0, Math.PI*2); ctx.fill();
                    ctx.restore();
                } else {
                    // Floppy / long: ellipse ears
                    drawEarPair(-sp.headR * 0.6, sp.headR * 0.6, sp.earW, sp.earH);
                }
            }

            // ── eyes ──
            const ey = sp.headY - 4;
            if (sp.eyePatch) {
                // Panda eye patches
                ctx.fillStyle = '#1A1A1A';
                ctx.beginPath(); ctx.ellipse(-sp.headR * 0.35, ey, sp.headR * 0.35, sp.headR * 0.4 * eyeS, -0.3, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(sp.headR * 0.35, ey, sp.headR * 0.35, sp.headR * 0.4 * eyeS, 0.3, 0, Math.PI*2); ctx.fill();
                // Small white eye dots
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(-sp.headR * 0.28, ey - 1, sp.headR * 0.12 * eyeS, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(sp.headR * 0.42, ey - 1, sp.headR * 0.12 * eyeS, 0, Math.PI*2); ctx.fill();
            } else {
                // Normal eyes
                const ew = sp.headR * 0.34, eh = sp.headR * 0.4;
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.ellipse(-sp.headR * 0.38, ey, ew, eh * eyeS, 0, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(sp.headR * 0.38, ey, ew, eh * eyeS, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = c.eye;
                ctx.beginPath(); ctx.arc(-sp.headR * 0.38, ey + 1, ew * 0.58 * eyeS, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(sp.headR * 0.38, ey + 1, ew * 0.58 * eyeS, 0, Math.PI*2); ctx.fill();
                // Eye shine
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(-sp.headR * 0.28, ey - 2, ew * 0.33, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(sp.headR * 0.48, ey - 2, ew * 0.33, 0, Math.PI*2); ctx.fill();
            }

            // eyebrows (skip for panda with eyePatch)
            if (!sp.eyePatch) {
                ctx.strokeStyle = 'rgba(160,112,48,0.45)'; ctx.lineWidth = 1.3;
                ctx.beginPath(); ctx.moveTo(-sp.headR * 0.7, ey - 7); ctx.quadraticCurveTo(-sp.headR * 0.38, ey - 10.5, 0, ey - 7); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, ey - 7); ctx.quadraticCurveTo(sp.headR * 0.38, ey - 10.5, sp.headR * 0.7, ey - 7); ctx.stroke();
            }

            // blush
            const ba = parseFloat(c.blush.replace(/[^0-9.]/g, '')) || 0.4;
            ctx.fillStyle = `rgba(255,150,150,${ba})`;
            ctx.beginPath(); ctx.ellipse(-sp.headR * 0.7, sp.headY + 3, 4, 3, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(sp.headR * 0.7, sp.headY + 3, 4, 3, 0, 0, Math.PI*2); ctx.fill();

            // nose / beak
            if (sp.beak) {
                ctx.fillStyle = '#F08830';
                ctx.beginPath(); ctx.moveTo(-2, sp.headY + 4); ctx.lineTo(3, sp.headY + 4); ctx.lineTo(0.5, sp.headY + 8); ctx.closePath(); ctx.fill();
            } else {
                ctx.fillStyle = c.nose;
                const noseY = sp.snout > 0 ? sp.headY : sp.headY + 4;
                ctx.beginPath(); ctx.ellipse(0, noseY, sp.headR * 0.28, sp.headR * 0.2, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.beginPath(); ctx.arc(-1, noseY - 1, sp.headR * 0.08, 0, Math.PI*2); ctx.fill();
            }

            // whiskers (cat, fox)
            if (sp.whiskers) {
                ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1;
                const wy = sp.headY + 2;
                // Left whiskers
                ctx.beginPath(); ctx.moveTo(-sp.headR * 0.3, wy); ctx.lineTo(-sp.headR * 1.5, wy - 4); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-sp.headR * 0.3, wy + 1); ctx.lineTo(-sp.headR * 1.5, wy + 1); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-sp.headR * 0.3, wy + 2); ctx.lineTo(-sp.headR * 1.4, wy + 5); ctx.stroke();
                // Right whiskers
                ctx.beginPath(); ctx.moveTo(sp.headR * 0.3, wy); ctx.lineTo(sp.headR * 1.5, wy - 4); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(sp.headR * 0.3, wy + 1); ctx.lineTo(sp.headR * 1.5, wy + 1); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(sp.headR * 0.3, wy + 2); ctx.lineTo(sp.headR * 1.4, wy + 5); ctx.stroke();
            }

            // ── mouth ──
            if (mouthOpen && mouthO) {
                ctx.fillStyle = '#8B3535';
                const mY = sp.headY + (sp.snout > 0 ? 8 : 10);
                ctx.beginPath(); ctx.ellipse(0, mY, 5, 4, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#D44444';
                ctx.beginPath(); ctx.ellipse(0, mY - 1, 3, 2, 0, 0, Math.PI*2); ctx.fill();
            } else if (mouthO) {
                ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 1.3;
                const mY = sp.headY + (sp.snout > 0 ? 6 : 8);
                ctx.beginPath(); ctx.ellipse(0, mY, 3, 2, 0, 0, Math.PI*2); ctx.stroke();
            } else if (!sp.beak) {
                ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 1.3;
                const mY = sp.headY + (sp.snout > 0 ? 6 : 7);
                ctx.beginPath(); ctx.arc(0, mY, 4, 0.3, Math.PI - 0.3); ctx.stroke();
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
