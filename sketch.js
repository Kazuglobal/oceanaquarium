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

// タッチポイントを管理するクラスを追加
class TouchPoint {
    constructor(x, y, type = 'attract') {
        this.x = x;
        this.y = y;
        this.type = type; // 'attract' または 'repel'
        this.radius = 150; // 影響範囲
        this.strength = type === 'attract' ? 2 : 3; // 引力/斥力の強さ
        this.alpha = 255; // 表示の透明度
        this.color = type === 'attract' ? color(100, 200, 255, this.alpha) : color(255, 100, 100, this.alpha);
    }

    draw() {
        push();
        noFill();
        stroke(this.color);
        strokeWeight(2);
        ellipse(this.x, this.y, this.radius * 2);
        // 中心点を表示
        fill(this.color);
        noStroke();
        ellipse(this.x, this.y, 10);
        pop();
    }
}

// タッチポイントを格納する配列
let touchPoints = [];

class Fish {
    constructor(sprite, x, y) {
        this.sprite = sprite;
        this.x = x;
        this.y = y;
        
        // 物理パラメータ
        this.velocity = createVector(0, 0);  // 速度ベクトル
        this.acceleration = createVector(0, 0);  // 加速度ベクトル
        this.maxSpeed = random(2, 3);        // 最大速度
        this.maxForce = 0.2;                // 最大操舵力
        this.mass = this.size;              // 質量（サイズに比例）
        
        // 基本パラメータ
        this.angle = random(TWO_PI);
        this.size = random(0.8, 1.2);
        this.isFlipped = false;
        this.flipTransition = 0;
        this.flipDuration = 15;
        this.touchDistance = 50;  // タッチ判定の距離を追加
        this.isSelected = false;  // 選択状態を追加
        
        // アニメーションパラメータ
        this.tailAngle = 0;
        this.tailSpeed = 0.2;
        this.bodyWave = 0;
        this.bodyWaveSpeed = 0.1;
        this.verticalOffset = 0;
        this.verticalSpeed = 0.03;
        
        // 行動パラメータ
        this.neighborRadius = 100;          // 群れ認識の範囲
        this.separationWeight = 1.5;        // 分離力の重み
        this.alignmentWeight = 1.0;         // 整列力の重み
        this.cohesionWeight = 1.0;          // 結合力の重み
        this.wanderAngle = random(TWO_PI);  // ランダム遊泳用の角度
        this.wanderRadius = 50;             // ランダム遊泳の半径
        
        // その他のプロパティは維持
        this.targetReached = false;
    }

    // 群れの行動を計算
    calculateFlockingForce() {
        let separation = createVector(0, 0);
        let alignment = createVector(0, 0);
        let cohesion = createVector(0, 0);
        let neighborCount = 0;
        
        for (let other of fishes) {
            if (other !== this) {
                let d = dist(this.x, this.y, other.x, other.y);
                if (d < this.neighborRadius) {
                    // 分離（近すぎる仲間から離れる）
                    let diff = createVector(this.x - other.x, this.y - other.y);
                    diff.div(d * d);  // 距離の二乗で重み付け
                    separation.add(diff);
                    
                    // 整列（仲間と同じ方向に向かう）
                    let otherVelocity = createVector(cos(other.angle), sin(other.angle));
                    alignment.add(otherVelocity);
                    
                    // 結合（仲間の平均位置に向かう）
                    cohesion.add(createVector(other.x, other.y));
                    
                    neighborCount++;
                }
            }
        }
        
        if (neighborCount > 0) {
            separation.mult(this.separationWeight);
            
            alignment.div(neighborCount);
            alignment.setMag(this.maxSpeed);
            alignment.sub(this.velocity);
            alignment.limit(this.maxForce);
            alignment.mult(this.alignmentWeight);
            
            cohesion.div(neighborCount);
            cohesion.sub(createVector(this.x, this.y));
            cohesion.setMag(this.maxSpeed);
            cohesion.sub(this.velocity);
            cohesion.limit(this.maxForce);
            cohesion.mult(this.cohesionWeight);
            
            return separation.add(alignment).add(cohesion);
        }
        return createVector(0, 0);
    }

    // ランダムな遊泳力を計算
    calculateWanderForce() {
        this.wanderAngle += random(-0.3, 0.3);
        let wanderPoint = createVector(cos(this.angle), sin(this.angle));
        wanderPoint.mult(this.wanderRadius);
        wanderPoint.add(createVector(cos(this.wanderAngle), sin(this.wanderAngle)));
        wanderPoint.setMag(this.maxForce * 0.5);
        return wanderPoint;
    }

    // タッチ判定を行うメソッド
    checkTouch(touchX, touchY) {
        let d = dist(this.x, this.y, touchX, touchY);
        if (d < this.touchDistance * this.size) {
            this.isSelected = true;
            return true;
        }
        return false;
    }

    // タッチポイントからの影響を計算
    calculateTouchInfluence() {
        let totalForce = createVector(0, 0);

        for (let point of touchPoints) {
            let d = dist(this.x, this.y, point.x, point.y);
            if (d < point.radius) {
                let force = map(d, 0, point.radius, point.strength, 0);
                let angle = atan2(this.y - point.y, this.x - point.x);
                
                if (point.type === 'attract') {
                    angle += PI;  // 引力の場合は角度を反転
                }
                
                let forceVector = createVector(cos(angle) * force, sin(angle) * force);
                totalForce.add(forceVector);
            }
        }

        return totalForce;
    }

    update() {
        // 力の計算
        let flockForce = this.calculateFlockingForce();
        let wanderForce = this.calculateWanderForce();
        let touchForce = this.calculateTouchInfluence();
        
        // 力の適用
        this.acceleration.mult(0);  // 加速度をリセット
        this.acceleration.add(flockForce);
        this.acceleration.add(wanderForce);
        this.acceleration.add(createVector(touchForce.x, touchForce.y));
        
        // 速度と位置の更新
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxSpeed);
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        
        // 角度の更新
        if (this.velocity.mag() > 0.1) {
            this.angle = this.velocity.heading();
        }
        
        // 画面端での跳ね返り
        const margin = 50;
        if (this.x > width - margin) {
            this.x = width - margin;
            this.velocity.x *= -1;
        }
        if (this.x < margin) {
            this.x = margin;
            this.velocity.x *= -1;
        }
        if (this.y > height - margin) {
            this.y = height - margin;
            this.velocity.y *= -1;
        }
        if (this.y < margin) {
            this.y = margin;
            this.velocity.y *= -1;
        }
        
        // 魚の向きを移動方向に合わせる
        this.isFlipped = cos(this.angle) < 0;
        
        // アニメーションの更新
        let speed = this.velocity.mag();
        this.tailAngle = sin(frameCount * this.tailSpeed * speed) * 0.3;
        this.bodyWave = sin(frameCount * this.bodyWaveSpeed * speed) * 0.1;
        this.verticalOffset = sin(frameCount * this.verticalSpeed) * 5;
        
        // 泡の生成
        if (random() < speed / this.maxSpeed * 0.3) {
            let bubbleX = this.x + cos(this.angle + PI) * 20;
            let bubbleY = this.y + sin(this.angle + PI) * 20;
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

async function setup() {
    createCanvas(windowWidth, windowHeight);
    imageMode(CENTER);
    frameRate(60);
    
    // 水中背景の作成
    createUnderwaterBackground();
    
    // アニメーションループを開始
    loop();

    // Kinectの初期化を試みる
    await kinectHandler.init();
    updateStatus();
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
    
    // Kinectからの手の位置を取得して処理
    if (kinectHandler.isKinectConnected()) {
        const hands = kinectHandler.getHandPositions();
        for (let hand of hands) {
            // 手の深度に応じて影響力を調整
            const strength = map(hand.depth, kinectHandler.minDepth, kinectHandler.maxDepth, 3, 1);
            // 深い位置（遠い）の手は魚を引き寄せ、浅い位置（近い）の手は魚を追い払う
            const type = hand.depth > (kinectHandler.maxDepth + kinectHandler.minDepth) / 2 ? 'attract' : 'repel';
            
            // タッチポイントとして追加
            touchPoints.push(new TouchPoint(hand.x, hand.y, type));
        }
    }

    // タッチポイントを描画
    for (let point of touchPoints) {
        point.draw();
    }
    
    // 魚の更新と描画
    for (let fish of fishes) {
        fish.update();
        fish.draw();
    }

    // Kinectの手の位置が更新されるたびにtouchPointsをクリア
    if (kinectHandler.isKinectConnected()) {
        touchPoints = [];
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
        fish.tailSpeed = 0.2 * speedScale;
        fish.bodyWaveSpeed = 0.1 * speedScale;
        fish.verticalSpeed = 0.03 * speedScale;
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

// タッチイベントハンドラーを更新
function touchStarted() {
    // コントロールパネルの領域を除外
    if (mouseY > height - 100) return;
    
    // 右クリックまたは2本指タッチで逃避モード
    let isRepelMode = mouseButton === RIGHT || touches.length >= 2;
    
    // タッチポイントを追加
    if (touches.length > 0) {
        // マルチタッチの場合
        for (let touch of touches) {
            touchPoints.push(new TouchPoint(touch.x, touch.y, isRepelMode ? 'repel' : 'attract'));
        }
    } else {
        // マウスクリックの場合
        touchPoints.push(new TouchPoint(mouseX, mouseY, isRepelMode ? 'repel' : 'attract'));
    }
    
    return false; // デフォルトの動作を防止
}

function touchEnded() {
    // タッチが終了したらポイントをクリア
    touchPoints = [];
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

// ステータス表示を更新
function updateStatus() {
    const statusDiv = document.getElementById('status');
    if (kinectHandler.isKinectConnected()) {
        statusDiv.textContent = 'Kinect: 接続済み';
        statusDiv.style.color = '#00ff00';
    } else {
        statusDiv.textContent = 'Kinect: 未接続 (タッチ操作のみ)';
        statusDiv.style.color = '#ff9900';
    }
}
