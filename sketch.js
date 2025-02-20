let fishes = [];
let bgImage;
let pollutionLevel = 0;
let garbage = [];
let bubbleSound;
let waterSound;
let isPlayingSound = false;
let isPollutionEnabled = true; // 汚染シミュレーションの状態を追加
let marineSpecies = ['魚', 'クラゲ', 'カニ', 'イルカ', 'お絵かき'];
let speciesCount = {};
let educationalTexts = [
    "海洋汚染は海の生態系に深刻な影響を与えます。",
    "プラスチックごみは分解に数百年かかります。",
    "海洋生物の約40%が人間の活動による影響を受けています。",
    "私たちにできることから始めましょう。",
    "海洋生物は海の汚染に敏感です。",
    "きれいな海を守ることは、私たちの未来を守ることです。"
];
let currentTextIndex = 0;
let uploadedDrawings = [];
let waterQuality = 100; // 水質（0-100）
let oxygenLevel = 100; // 酸素レベル（0-100）
let temperature = 20; // 水温（摂氏）
let lastFrameCount = 0;  // アニメーションのための変数を追加
let bubbles = [];

// 動きのパターンを定義
const MOVEMENT_PATTERNS = {
    SWIM: 'swim',      // 通常の泳ぎ
    BOUNCE: 'bounce',  // 跳ねる動き
    SPIRAL: 'spiral',  // らせん状の動き
    ZIGZAG: 'zigzag'   // ジグザグ
};

// 環境効果を定義
const ENVIRONMENTAL_EFFECTS = {
    NORMAL: {
        tint: [255, 255, 255],
        speed: 1.0,
        visibility: 1.0
    },
    POLLUTED: {
        tint: [200, 180, 180],
        speed: 0.7,
        visibility: 0.6
    },
    TOXIC: {
        tint: [150, 150, 100],
        speed: 0.4,
        visibility: 0.3
    }
};

class Fish {
    constructor(sprite, x, y) {
        this.sprite = sprite;
        this.x = x;
        this.y = y;
        this.speed = random(1, 2);
        this.angle = random(TWO_PI); // 移動方向の角度
        this.targetAngle = this.angle; // 目標の角度
        this.rotationSpeed = 0.05; // 回転速度
        this.amplitude = random(20, 40);
        this.size = random(0.8, 1.2);
        this.isFlipped = false;
        this.flipTransition = 0;
        this.flipDuration = 15;
        
        // アニメーション用のプロパティ
        this.tailAngle = 0;
        this.tailSpeed = 0.1;
        this.bodyWave = 0;
        this.bodyWaveSpeed = 0.05;
        this.verticalOffset = 0;
        this.verticalSpeed = 0.02;
        
        // 移動制御用のプロパティ
        this.directionChangeInterval = random(100, 200); // 方向転換の間隔
        this.directionTimer = 0;
        
        // タッチ操作用のプロパティを追加
        this.isSelected = false;
        this.touchDistance = 50; // タッチ判定の距離
        this.targetReached = false; // 目標に到達したかどうか
        
        // 動作パターン用のプロパティを追加
        this.baseSpeed = random(1, 2);
        this.currentSpeed = this.baseSpeed;
        this.maxSpeed = this.baseSpeed * 3;
        this.actionTimer = 0;
        this.actionInterval = random(100, 200);
        this.currentAction = 'normal';
        this.spinAngle = 0;
        this.isSpinning = false;
        this.spinSpeed = 0;
        this.isStopped = false;
        this.stopDuration = 0;
        
        console.log('魚を作成:', x, y, this.angle, this.size, sprite ? 'カスタム' : 'デフォルト');
    }

    // タッチ判定を行うメソッド
    checkTouch(touchX, touchY) {
        let d = dist(this.x, this.y, touchX, touchY);
        if (d < this.touchDistance * this.size) {
            this.isSelected = true;
            // タッチ位置への角度を計算
            let targetAngle = atan2(touchY - this.y, touchX - this.x);
            this.targetAngle = targetAngle;
            this.targetReached = false;
            return true;
        }
        return false;
    }

    // ランダムな行動を選択
    selectRandomAction() {
        let actions = [
            { name: 'normal', weight: 0.4 },
            { name: 'dash', weight: 0.2 },
            { name: 'spin', weight: 0.15 },
            { name: 'stop', weight: 0.15 },
            { name: 'zigzag', weight: 0.1 }
        ];
        
        let totalWeight = actions.reduce((sum, action) => sum + action.weight, 0);
        let r = random(totalWeight);
        let sum = 0;
        
        for (let action of actions) {
            sum += action.weight;
            if (r <= sum) {
                return action.name;
            }
        }
        return 'normal';
    }

    update() {
        // アクションの更新
        this.actionTimer++;
        if (this.actionTimer >= this.actionInterval && !this.isSelected) {
            this.actionTimer = 0;
            this.actionInterval = random(100, 200);
            this.currentAction = this.selectRandomAction();
            
            // アクションに応じた初期設定
            switch (this.currentAction) {
                case 'dash':
                    this.currentSpeed = this.maxSpeed;
                    break;
                case 'spin':
                    this.isSpinning = true;
                    this.spinSpeed = random(0.2, 0.4);
                    this.spinAngle = 0;
                    break;
                case 'stop':
                    this.isStopped = true;
                    this.stopDuration = random(30, 60);
                    this.currentSpeed = 0;
                    break;
                case 'zigzag':
                    this.zigzagAngle = 0;
                    break;
                default:
                    this.currentSpeed = this.baseSpeed;
                    break;
            }
        }

        // アクションの実行
        if (!this.isSelected) {
            switch (this.currentAction) {
                case 'dash':
                    this.currentSpeed = lerp(this.currentSpeed, this.baseSpeed, 0.02);
                    break;
                case 'spin':
                    this.spinAngle += this.spinSpeed;
                    if (this.spinAngle >= TWO_PI) {
                        this.isSpinning = false;
                        this.currentAction = 'normal';
                    }
                    break;
                case 'stop':
                    if (this.stopDuration > 0) {
                        this.stopDuration--;
                    } else {
                        this.isStopped = false;
                        this.currentSpeed = this.baseSpeed;
                        this.currentAction = 'normal';
                    }
                    break;
                case 'zigzag':
                    this.zigzagAngle += 0.1;
                    this.targetAngle += sin(this.zigzagAngle) * 0.2;
                    break;
            }
        }

        // 通常の更新処理
        if (!this.isSelected && !this.isStopped) {
            this.directionTimer++;
            if (this.directionTimer >= this.directionChangeInterval) {
                this.targetAngle = random(TWO_PI);
                this.directionTimer = 0;
                this.directionChangeInterval = random(100, 200);
            }
        }
        
        // 角度の更新
        let angleDiff = this.targetAngle - this.angle;
        if (angleDiff > PI) angleDiff -= TWO_PI;
        if (angleDiff < -PI) angleDiff += TWO_PI;
        
        let rotationSpeed = this.isSelected ? 0.2 : this.rotationSpeed;
        this.angle += angleDiff * rotationSpeed;
        
        if (this.isSpinning) {
            this.angle += this.spinSpeed;
        }
        
        // 位置の更新
        if (!this.isStopped) {
            this.x += cos(this.angle) * this.currentSpeed;
            this.y += sin(this.angle) * this.currentSpeed;
        }
        
        // 画面端での跳ね返り処理
        const margin = 50;
        if (this.x > width - margin) {
            this.x = width - margin;
            this.targetAngle = random(PI/2, 3*PI/2);
            this.isSelected = false;
        }
        if (this.x < margin) {
            this.x = margin;
            this.targetAngle = random(-PI/2, PI/2);
            this.isSelected = false;
        }
        if (this.y > height - margin) {
            this.y = height - margin;
            this.targetAngle = random(-PI, 0);
            this.isSelected = false;
        }
        if (this.y < margin) {
            this.y = margin;
            this.targetAngle = random(0, PI);
            this.isSelected = false;
        }
        
        // 魚の向きを移動方向に合わせる
        this.isFlipped = cos(this.angle) < 0;
        
        // アニメーションの更新
        this.tailAngle = sin(frameCount * this.tailSpeed) * 0.3;
        this.bodyWave = sin(frameCount * this.bodyWaveSpeed) * 0.1;
        this.verticalOffset = sin(frameCount * this.verticalSpeed) * 5;
        
        // 泡の生成（速度に応じて頻度を変更）
        let bubbleChance = map(this.currentSpeed, this.baseSpeed, this.maxSpeed, 0.1, 0.3);
        if (random() < bubbleChance) {
            let bubbleX = this.x + cos(this.angle) * -20;
            let bubbleY = this.y + sin(this.angle) * -20;
            bubbles.push(new Bubble(bubbleX, bubbleY));
        }
    }

    draw() {
        push();
        translate(this.x, this.y + this.verticalOffset);
        
        // アクションに応じたエフェクトを表示
        if (this.currentAction === 'dash') {
            // 加速時のエフェクト
            let speedRatio = this.currentSpeed / this.maxSpeed;
            noFill();
            stroke(255, 255, 255, 100 * speedRatio);
            for (let i = 0; i < 3; i++) {
                let size = (this.touchDistance * 2 * this.size) * (1 + i * 0.2);
                ellipse(0, 0, size, size);
            }
        }
        
        // 選択中は半透明の円を表示
        if (this.isSelected) {
            noFill();
            stroke(255, 255, 255, 100);
            ellipse(0, 0, this.touchDistance * 2 * this.size);
        }
        
        // 移動方向に合わせて回転
        rotate(this.angle + (this.isFlipped ? PI : 0));
        
        scale(this.size);
        
        // スムーズな反転アニメーション
        let flipScale = this.isFlipped ? -1 : 1;
        if (this.flipTransition > 0) {
            let progress = this.flipTransition / this.flipDuration;
            flipScale = lerp(flipScale, -flipScale, progress);
        }
        scale(flipScale, 1);
        
        if (this.sprite) {
            // カスタム画像の魚を描画
            imageMode(CENTER);
            image(this.sprite, 0, 0);
            
            // 泡エフェクト
            if (frameCount % 5 === 0 && random() < 0.3) {
                let bubbleSize = random(2, 4);
                fill(255, 255, 255, 150);
                noStroke();
                ellipse(this.sprite.width/3, random(-5, 5), bubbleSize, bubbleSize);
            }
        } else {
            // デフォルトの魚を描画
            fill(255, 100, 100);
            noStroke();
            
            // 体の波打ち効果を適用
            beginShape();
            for (let i = -20; i <= 20; i++) {
                let x = i;
                let y = sin(i * 0.2 + frameCount * this.bodyWaveSpeed) * 5;
                vertex(x, y);
            }
            endShape();
            
            // 尾びれ
            push();
            translate(-20, 0);
            rotate(this.tailAngle);
            triangle(0, 0, 15, -10, 15, 10);
            pop();
            
            // 目
            fill(0);
            ellipse(15, -5, 5, 5);
        }
        
        pop();
    }
}

class GarbageParticle {
    constructor() {
        this.x = random(width);
        this.y = -20;
        this.size = random(10, 30);
        this.speed = random(1, 3);
        this.rotation = random(TWO_PI);
        this.rotationSpeed = random(-0.1, 0.1);
    }

    update() {
        this.y += this.speed;
        this.rotation += this.rotationSpeed;
        if (this.y > height + 20) {
            this.y = -20;
            this.x = random(width);
        }
    }

    draw() {
        push();
        translate(this.x, this.y);
        rotate(this.rotation);
        fill(150, 150, 150, 127);
        noStroke();
        beginShape();
        vertex(-this.size/2, -this.size/2);
        vertex(this.size/2, -this.size/2);
        vertex(this.size/2, this.size/2);
        vertex(-this.size/2, this.size/2);
        endShape(CLOSE);
        pop();
    }
}

function preload() {
    // 画像の読み込みを削除し、デフォルトの魚は図形で描画
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    imageMode(CENTER);
    frameRate(60);
    
    // 水中背景の作成
    createUnderwaterBackground();
    
    // アニメーションループを開始
    loop();
}

function createUnderwaterBackground() {
    bgImage = createGraphics(width, height);
    
    // グラデーションの深い青で基本背景を作成
    let c1 = color(0, 30, 80);  // 深い青
    let c2 = color(0, 100, 150);  // やや明るい青
    
    for (let y = 0; y < height; y++) {
        let inter = map(y, 0, height, 0, 1);
        let c = lerpColor(c2, c1, inter);
        bgImage.stroke(c);
        bgImage.line(0, y, width, y);
    }
    
    // 水中の光の差し込み効果
    for (let i = 0; i < 20; i++) {
        let x = random(width);
        let topY = random(height * 0.2);
        let bottomY = random(height * 0.6, height);
        let beamWidth = random(30, 100);
        
        for (let y = topY; y < bottomY; y++) {
            let alpha = map(y, topY, bottomY, 150, 0);
            let beamX = x + sin(y * 0.01) * 20;
            bgImage.noStroke();
            bgImage.fill(255, 255, 255, alpha * 0.1);
            bgImage.ellipse(beamX, y, beamWidth * (1 - y/height), 2);
        }
    }
    
    // 水中の浮遊物
    for (let i = 0; i < 200; i++) {
        let x = random(width);
        let y = random(height);
        let size = random(1, 3);
        let alpha = random(50, 150);
        bgImage.noStroke();
        bgImage.fill(200, 200, 255, alpha);
        bgImage.ellipse(x, y, size, size);
    }
}

function draw() {
    clear();
    
    // 背景の描画
    image(bgImage, width/2, height/2, width, height);
    
    // 泡の更新と描画
    for (let i = bubbles.length - 1; i >= 0; i--) {
        bubbles[i].update();
        bubbles[i].draw();
        if (bubbles[i].isDead()) {
            bubbles.splice(i, 1);
        }
    }
    
    // 魚の更新と描画
    for (let fish of fishes) {
        fish.update();
        fish.draw();
    }
}

function updateStats() {
    // 種別ごとの生存数をカウント
    speciesCount = {};
    for (let species of marineSpecies) {
        speciesCount[species] = 0;
    }
    for (let fish of fishes) {
        speciesCount[fish.species]++;
    }
    
    // 統計情報の表示を更新
    let statsDiv = document.getElementById('stats');
    let statsHtml = '<h3>生態系の状態</h3>';
    statsHtml += `<p>汚染レベル: ${floor(pollutionLevel * 100)}%</p>`;
    for (let species in speciesCount) {
        statsHtml += `<p>${species}: ${speciesCount[species]}匹</p>`;
    }
    statsDiv.innerHTML = statsHtml;
}

function updateEducationalText() {
    currentTextIndex = (currentTextIndex + 1) % educationalTexts.length;
    document.getElementById('educational-text').innerHTML = educationalTexts[currentTextIndex];
}

function resetSimulation() {
    pollutionLevel = 0;
    garbage = [];
    // 生物の健康状態をリセット
    for (let fish of fishes) {
        fish.health = 100;
    }
}

function toggleSound() {
    isPlayingSound = !isPlayingSound;
    // if (isPlayingSound) {
    //     waterSound.play();
    // } else {
    //     waterSound.pause();
    // }
}

function addFish(species) {
    if (!species) {
        species = random(marineSpecies.filter(s => s !== 'お絵かき'));
    }
    
    // 新しい魚を作成（デフォルトの魚として）
    let newFish = new Fish(null, random(width), random(height));
    newFish.size = random(0.8, 1.2);
    fishes.push(newFish);
    console.log('デフォルトの魚を作成:', fishes.length);
}

function mousePressed() {
    // クリック位置に新しい生物を追加
    if (mouseY < height - 100) { // コントロールパネルを除外
        addFish();
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    createUnderwaterBackground();
    bubbles = []; // ウィンドウリサイズ時に泡をリセット
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        console.log('ファイル選択:', file.name, file.type, file.size);
        
        // ファイル形式のチェック
        const allowedTypes = ['image/png', 'image/jpeg', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            alert('対応していないファイル形式です。PNG, JPG, GIF形式の画像を選択してください。');
            return;
        }
        
        // ファイルサイズのチェック（5MB以下）
        if (file.size > 5 * 1024 * 1024) {
            alert('ファイルサイズが大きすぎます。5MB以下の画像を選択してください。');
            return;
        }
        
        // ローディング表示を追加
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }
        console.log('ローディング表示を開始');
        
        const formData = new FormData();
        formData.append('image', file);
        
        // サーバーへの接続を試行（最大3回）
        let retryCount = 0;
        const maxRetries = 3;
        
        function attemptUpload() {
            console.log(`アップロード試行 ${retryCount + 1}/${maxRetries}`);
            
            fetch('http://localhost:5000/remove-background', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                console.log('サーバーレスポンス:', response.status, response.statusText);
                if (!response.ok) {
                    throw new Error('サーバーエラー: ' + response.status);
                }
                return response.blob();
            })
            .then(blob => {
                console.log('画像データを受信:', blob.type, blob.size);
                return createImageBitmap(blob);
            })
            .then(imageBitmap => {
                console.log('画像の読み込み完了');
                const img = createImage(imageBitmap.width, imageBitmap.height);
                img.drawingContext.drawImage(imageBitmap, 0, 0);
                processUploadedImage(img);
                if (loadingIndicator) {
                    loadingIndicator.style.display = 'none';
                }
            })
            .catch(error => {
                console.error('エラー詳細:', error);
                if (retryCount < maxRetries && error.message.includes('Failed to fetch')) {
                    retryCount++;
                    console.log(`接続を再試行します... (${retryCount}/${maxRetries})`);
                    setTimeout(attemptUpload, 1000 * retryCount);
                } else {
                    if (loadingIndicator) {
                        loadingIndicator.style.display = 'none';
                    }
                    let errorMessage = 'サーバーに接続できません。\n';
                    errorMessage += '以下を確認してください：\n';
                    errorMessage += '1. Flaskサーバー（python app.py）が起動しているか\n';
                    errorMessage += '2. ポート5000が利用可能か\n';
                    errorMessage += '3. ファイアウォールの設定\n';
                    errorMessage += `\nエラー詳細: ${error.message}`;
                    alert(errorMessage);
                }
            });
        }
        
        attemptUpload();
    }
}

function processUploadedImage(img) {
    console.log('画像処理開始:', img.width, img.height);
    
    try {
        let maxSize = 100;
        let resizedImg = createGraphics(maxSize, maxSize);
        let scale = Math.min(maxSize / img.width, maxSize / img.height);
        let newWidth = img.width * scale;
        let newHeight = img.height * scale;
        
        resizedImg.clear();
        resizedImg.background(255, 0);
        resizedImg.imageMode(CENTER);
        resizedImg.image(img, maxSize/2, maxSize/2, newWidth, newHeight);
        
        console.log('リサイズ後のサイズ:', newWidth, newHeight);
        
        // アップロードされた画像を配列に追加
        uploadedDrawings.push(resizedImg);
        
        // 新しい魚を追加（アップロードされた画像を使用）
        let newFish = new Fish(resizedImg, random(width), random(height));
        newFish.size = random(0.8, 1.2);
        fishes.push(newFish);
        
        console.log('カスタム魚を作成:', fishes.length, '匹目');
    } catch (error) {
        console.error('画像処理中にエラーが発生:', error);
        alert('画像の処理中にエラーが発生しました。別の画像を試してください。');
    }
}

// 複数の絵を組み合わせる機能
function combineDrawings() {
    if (uploadedDrawings.length < 2) return;
    
    let combined = createGraphics(200, 200);
    let drawing1 = random(uploadedDrawings);
    let drawing2 = random(uploadedDrawings.filter(d => d !== drawing1));
    
    // 2つの絵を重ねて表示
    combined.image(drawing1, 0, 0);
    combined.image(drawing2, random(-50, 50), random(-50, 50));
    
    uploadedDrawings.push(combined);
    return combined;
}

function updateEnvironment() {
    // 水質の変化
    waterQuality = max(0, waterQuality - (pollutionLevel * 0.1));
    
    // 酸素レベルの変化（汚染と水温の影響）
    oxygenLevel = max(0, oxygenLevel - (pollutionLevel * 0.1) - (max(0, temperature - 25) * 0.1));
    
    // 水温の変化（時間経過で微増）
    if (pollutionLevel > 0.5) {
        temperature += 0.01; // 温暖化の影響
    }
    
    // 環境データの表示更新
    updateEnvironmentDisplay();
}

function updateEnvironmentDisplay() {
    let envStats = document.getElementById('environment-stats');
    if (envStats) {
        envStats.innerHTML = `
            <h3>環境データ</h3>
            <p>水質: ${waterQuality.toFixed(1)}%</p>
            <p>酸素レベル: ${oxygenLevel.toFixed(1)}%</p>
            <p>水温: ${temperature.toFixed(1)}℃</p>
            <p>汚染レベル: ${(pollutionLevel * 100).toFixed(1)}%</p>
        `;
    }
}

// 定期的な環境更新
setInterval(updateEnvironment, 1000);

function togglePollution() {
    isPollutionEnabled = !isPollutionEnabled;
    if (!isPollutionEnabled) {
        // 汚染シミュレーションを停止した時、汚染レベルを徐々に下げる
        let cleanupInterval = setInterval(() => {
            if (pollutionLevel > 0) {
                pollutionLevel = max(0, pollutionLevel - 0.1);
                // ゴミを減らす
                if (garbage.length > 0 && random() < 0.5) {
                    garbage.pop();
                }
            }
            if (pollutionLevel <= 0) {
                clearInterval(cleanupInterval);
            }
        }, 1000);
    }
}

function duplicateFish() {
    // 既存の魚がいる場合、ランダムに1匹選んで複製
    if (fishes.length > 0) {
        let originalFish = random(fishes);
        let newFish = new Fish(
            originalFish.sprite,
            random(width),
            random(height)
        );
        // サイズをわずかに変更してバリエーションを付ける
        newFish.size = originalFish.size * random(0.9, 1.1);
        fishes.push(newFish);
    }
}

function adjustFishSize(value) {
    // スライダーの値を0.5から1.5の範囲に変換
    let scale = map(Number(value), 50, 150, 0.5, 1.5);
    
    // すべての魚のサイズを調整
    for (let fish of fishes) {
        fish.size = scale;
    }
}

function adjustFishSpeed(value) {
    // スライダーの値を0.5から1.5の範囲に変換
    let speedScale = map(Number(value), 50, 150, 0.5, 1.5);
    
    // すべての魚の速度を調整
    for (let fish of fishes) {
        // 方向は保持したまま速度のみ変更
        fish.speed = speedScale * (fish.direction < 0 ? -1 : 1);
        
        // アニメーション速度も調整
        fish.tailSpeed = 0.1 * speedScale;
        fish.bodyWaveSpeed = 0.05 * speedScale;
        fish.verticalSpeed = 0.02 * speedScale;
    }
}

function mouseMoved() {
    // コントロールパネルの領域を除外
    if (mouseY > height - 100) return;
    
    // すべての魚に対してタッチ判定を行う
    for (let fish of fishes) {
        fish.checkTouch(mouseX, mouseY);
    }
}

// タッチデバイス用のイベントハンドラを追加
function touchMoved(event) {
    // デフォルトのスクロール動作を防止
    event.preventDefault();
    
    // コントロールパネルの領域を除外
    if (event.touches[0].clientY > height - 100) return;
    
    // すべての魚に対してタッチ判定を行う
    for (let fish of fishes) {
        fish.checkTouch(event.touches[0].clientX, event.touches[0].clientY);
    }
    
    return false;
}

// バブルクラスを追加
class Bubble {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = random(2, 5);
        this.speed = random(0.5, 2);
        this.alpha = 255;
        this.fadeSpeed = random(2, 4);
        this.wobble = random(0.02, 0.05);
        this.wobbleOffset = random(TWO_PI);
    }

    update() {
        // 上昇運動
        this.y -= this.speed;
        // 横揺れ
        this.x += sin(frameCount * this.wobble + this.wobbleOffset) * 0.5;
        // フェードアウト
        this.alpha -= this.fadeSpeed;
        // サイズの微変動
        this.size += sin(frameCount * 0.1) * 0.1;
    }

    draw() {
        if (this.alpha > 0) {
            push();
            noStroke();
            fill(255, 255, 255, this.alpha);
            ellipse(this.x, this.y, this.size, this.size);
            pop();
        }
    }

    isDead() {
        return this.alpha <= 0;
    }
}
