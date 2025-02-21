// Kinectセンサーの処理を管理するクラス
class KinectHandler {
    constructor() {
        this.kinect = null;
        this.depthData = null;
        this.handPositions = [];
        this.isConnected = false;
        this.minDepth = 500;  // 最小深度（mm）
        this.maxDepth = 2000; // 最大深度（mm）
    }

    // Kinectの初期化
    async init() {
        try {
            // WebKinectを初期化
            this.kinect = await Kinect2.create();
            this.isConnected = true;
            console.log('Kinect connected successfully');
            
            // 深度ストリームを開始
            await this.kinect.openDepthReader();
            
            // フレーム更新時のコールバックを設定
            this.kinect.on('depthFrame', (data) => {
                this.processDepthFrame(data);
            });
        } catch (error) {
            console.error('Failed to initialize Kinect:', error);
            this.isConnected = false;
        }
    }

    // 深度フレームの処理
    processDepthFrame(depthData) {
        this.depthData = depthData;
        this.handPositions = this.detectHands();
    }

    // 手の位置を検出
    detectHands() {
        if (!this.depthData) return [];

        const positions = [];
        const width = 512;  // Kinectの深度画像の幅
        const height = 424; // Kinectの深度画像の高さ
        
        // 深度データを走査して手の候補を検出
        for (let y = 0; y < height; y += 10) {  // パフォーマンスのため間引いて処理
            for (let x = 0; x < width; x += 10) {
                const index = y * width + x;
                const depth = this.depthData[index];
                
                // 指定範囲内の深度値を持つ点を手の候補として検出
                if (depth > this.minDepth && depth < this.maxDepth) {
                    // 画面座標に変換
                    const screenX = map(x, 0, width, 0, window.innerWidth);
                    const screenY = map(y, 0, height, 0, window.innerHeight);
                    
                    positions.push({
                        x: screenX,
                        y: screenY,
                        depth: depth
                    });
                }
            }
        }

        return this.clusterHandPositions(positions);
    }

    // 検出された点をクラスタリングして手の位置を特定
    clusterHandPositions(points) {
        if (points.length === 0) return [];

        const clusters = [];
        const threshold = 50; // クラスタリングの距離閾値

        for (let point of points) {
            let foundCluster = false;
            
            for (let cluster of clusters) {
                const d = dist(point.x, point.y, cluster.x, cluster.y);
                if (d < threshold) {
                    // 既存のクラスタに追加
                    cluster.x = (cluster.x + point.x) / 2;
                    cluster.y = (cluster.y + point.y) / 2;
                    cluster.depth = (cluster.depth + point.depth) / 2;
                    cluster.count++;
                    foundCluster = true;
                    break;
                }
            }
            
            if (!foundCluster) {
                // 新しいクラスタを作成
                clusters.push({
                    x: point.x,
                    y: point.y,
                    depth: point.depth,
                    count: 1
                });
            }
        }

        // 一定以上の点を含むクラスタのみを手として認識
        return clusters.filter(c => c.count > 5);
    }

    // 手の位置情報を取得
    getHandPositions() {
        return this.handPositions;
    }

    // 接続状態を確認
    isKinectConnected() {
        return this.isConnected;
    }
}

// グローバルなKinectハンドラーのインスタンスを作成
const kinectHandler = new KinectHandler(); 