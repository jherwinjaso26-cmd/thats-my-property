class DynamicPropertyGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.playerMesh = null;
        this.obstacles = [];
        
        this.selectedColor = '#38bdf8';
        this.currentRound = 1;
        this.matchTime = 180;
        this.targetScore = 5;
        this.gameMode = 'FFA';
        this.playerScore = 0;
        this.timerInterval = null;
        
        this.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
        this.audioCtx = null;
        
        this.initInputListeners();
    }

    initInputListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.key in this.keys) this.keys[e.key] = true;
        });
        window.addEventListener('keyup', (e) => {
            if (e.key in this.keys) this.keys[e.key] = false;
        });
        window.addEventListener('resize', () => this.handleResize());
    }

    initAudio() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playTone(freq, type, duration) {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
    }

    setOutfit(colorHex) {
        this.selectedColor = colorHex;
        this.playTone(440, 'sine', 0.1);
    }

    startGame() {
        this.initAudio();
        
        this.gameMode = document.getElementById('lobby-mode').value;
        this.matchTime = parseInt(document.getElementById('lobby-time').value);
        this.targetScore = parseInt(document.getElementById('lobby-score').value);
        
        document.getElementById('lobby-screen').style.display = 'none';
        document.getElementById('hud-overlay').classList.remove('hidden');
        
        document.getElementById('hud-mode').innerText = this.gameMode;
        document.getElementById('hud-target-score').innerText = `First to ${this.targetScore}`;
        document.getElementById('hud-player-tag').innerText = "PLAYER_ALPHA";
        
        this.init3DScene();
        this.buildEnvironment();
        this.startMatchTimer();
        this.triggerRandomEventLoop();
    }

    init3DScene() {
        const canvas = document.getElementById('game-canvas');
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#0f172a');
        this.scene.fog = new THREE.FogExp2('#0f172a', 0.015);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 18, 22);
        this.camera.lookAt(0, 0, -2);

        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const ambientLight = new THREE.AmbientLight('#334155', 1.2);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight('#38bdf8', 1.5);
        dirLight.position.set(10, 20, 10);
        this.scene.add(dirLight);
    }

    buildEnvironment() {
        const floorGeo = new THREE.PlaneGeometry(60, 60);
        const floorMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.8 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        const grid = new THREE.GridHelper(60, 30, '#475569', '#334155');
        grid.position.y = 0.01;
        this.scene.add(grid);

        const charGroup = new THREE.Group();
        const bodyGeo = new THREE.BoxGeometry(1.2, 1.8, 1.2);
        const bodyMat = new THREE.MeshStandardMaterial({ color: this.selectedColor, roughness: 0.4 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.9;
        charGroup.add(body);

        const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const headMat = new THREE.MeshStandardMaterial({ color: '#f8fafc' });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 2.1;
        charGroup.add(head);

        this.playerMesh = charGroup;
        this.scene.add(this.playerMesh);

        this.generateRoundObstacles();
        this.animate();
    }

    generateRoundObstacles() {
        this.obstacles.forEach(obj => this.scene.remove(obj));
        this.obstacles = [];

        let count = this.currentRound * 6;
        for (let i = 0; i < count; i++) {
            const h = 1 + Math.random() * 3;
            const geo = new THREE.BoxGeometry(1.5, h, 1.5);
            const mat = new THREE.MeshStandardMaterial({ 
                color: this.currentRound === 3 ? '#ef4444' : '#64748b', 
                metalness: 0.5 
            });
            const block = new THREE.Mesh(geo, mat);
            block.position.set(
                (Math.random() - 0.5) * 40,
                h / 2,
                (Math.random() - 0.5) * 40 - 5
            );
            this.scene.add(block);
            this.obstacles.push(block);
        }
    }

    startMatchTimer() {
        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.matchTime--;
            if (this.matchTime <= 0) {
                clearInterval(this.timerInterval);
                this.handleMatchEnd();
            }
            this.updateTimerUI();
        }, 1000);
    }

    updateTimerUI() {
        const m = Math.floor(this.matchTime / 60).toString().padStart(2, '0');
        const s = (this.matchTime % 60).toString().padStart(2, '0');
        document.getElementById('hud-timer').innerText = `${m}:${s}`;
    }

    triggerRandomEventLoop() {
        setTimeout(() => {
            if (this.matchTime > 0) {
                this.fireRandomMechanicAlert();
                this.triggerRandomEventLoop();
            }
        }, 12000 + Math.random() * 8000);
    }

    fireRandomMechanicAlert() {
        const events = [
            { title: "Defend Property!", body: "An intruder was spotted! Guard your plot for the next 3 minutes or face severe point deduction penalties.", tone: 300, wave: 'square' },
            { title: "Steal Mission!", body: "A property shield has expired nearby. Infiltrate and take control of Plot B before the match clock finishes!", tone: 600, wave: 'sawtooth' }
        ];
        const currentEvent = events[Math.floor(Math.random() * events.length)];
        
        this.playTone(currentEvent.tone, currentEvent.wave, 0.4);
        
        document.getElementById('alert-title').innerText = currentEvent.title;
        document.getElementById('alert-body').innerText = currentEvent.body;
        document.getElementById('alert-popup').classList.remove('hidden');
    }

    dismissAlert() {
        document.getElementById('alert-popup').classList.add('hidden');
        this.playTone(880, 'sine', 0.08);
    }

    handleMatchEnd() {
        this.playTone(150, 'sawtooth', 0.8);
        alert(`Match Complete! Final Round Reached: ${this.currentRound} | Your Score: ${this.playerScore}`);
        location.reload();
    }

    handleResize() {
        if (!this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.playerMesh) {
            const speed = 0.25;
            if (this.keys.ArrowUp) this.playerMesh.position.z -= speed;
            if (this.keys.ArrowDown) this.playerMesh.position.z += speed;
            if (this.keys.ArrowLeft) this.playerMesh.position.x -= speed;
            if (this.keys.ArrowRight) this.playerMesh.position.x += speed;

            const time = Date.now() * 0.005;
            if (this.keys.ArrowUp || this.keys.ArrowDown || this.keys.ArrowLeft || this.keys.ArrowRight) {
                this.playerMesh.position.y = Math.abs(Math.sin(time)) * 0.4;
            } else {
                this.playerMesh.position.y = 0;
            }
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

const gameApp = new DynamicPropertyGame();
