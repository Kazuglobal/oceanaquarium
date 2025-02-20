#!/usr/bin/env python3
import cv2
import numpy as np
from pathlib import Path
import sys
import os
import time

def remove_background(input_path, output_path, threshold=200, blur_size=5):
    """
    画像から背景を除去し、透過PNGを生成します
    
    Parameters:
    -----------
    input_path : str
        入力画像のパス
    output_path : str
        出力する透過PNG画像のパス
    threshold : int
        背景を判定する閾値（0-255）
    blur_size : int
        ノイズ除去用のブラーサイズ
    """
    # 画像の読み込み
    img = cv2.imread(input_path)
    if img is None:
        raise FileNotFoundError(f"入力画像 {input_path} が見つかりません。")

    # グレースケール変換
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # ノイズ除去
    blurred = cv2.GaussianBlur(gray, (blur_size, blur_size), 0)
    
    # 適応的閾値処理
    _, mask = cv2.threshold(blurred, threshold, 255, cv2.THRESH_BINARY)
    
    # 輪郭検出と最大輪郭の抽出
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        max_contour = max(contours, key=cv2.contourArea)
        mask = np.zeros_like(gray)
        cv2.drawContours(mask, [max_contour], -1, 255, -1)
    
    # マスクの改善
    kernel = np.ones((5,5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    
    # マスクを反転（背景を透明に）
    mask_inv = cv2.bitwise_not(mask)
    
    # アルファチャンネルの作成
    b, g, r = cv2.split(img)
    rgba = cv2.merge([b, g, r, mask_inv])
    
    # 出力ディレクトリの作成
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # 透過PNGとして保存
    cv2.imwrite(output_path, rgba)
    print(f"保存しました: {output_path}")

def watch_directory(input_dir, output_dir):
    """
    指定されたディレクトリを監視し、新しい画像を自動処理します
    
    Parameters:
    -----------
    input_dir : str
        監視するディレクトリのパス
    output_dir : str
        処理済み画像の出力先ディレクトリのパス
    """
    processed_files = set()
    
    while True:
        try:
            # 入力ディレクトリ内の画像ファイルをチェック
            for file_path in Path(input_dir).glob("*.{jpg,jpeg,png}"):
                if str(file_path) not in processed_files:
                    # 出力パスの生成
                    output_path = Path(output_dir) / f"processed_{file_path.name}"
                    if output_path.suffix.lower() != '.png':
                        output_path = output_path.with_suffix('.png')
                    
                    try:
                        # 背景除去の実行
                        remove_background(str(file_path), str(output_path))
                        processed_files.add(str(file_path))
                    except Exception as e:
                        print(f"エラー: {file_path} の処理中に問題が発生しました - {e}")
            
            # 短い待機時間
            time.sleep(1)
            
        except KeyboardInterrupt:
            print("\n監視を終了します")
            break
        except Exception as e:
            print(f"エラー: {e}")
            time.sleep(5)  # エラー時は少し長めに待機

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='画像の背景を除去し、透過PNGを生成します')
    parser.add_argument('--input', '-i', help='入力画像のパス、または監視するディレクトリ')
    parser.add_argument('--output', '-o', help='出力画像のパス、または出力ディレクトリ')
    parser.add_argument('--threshold', '-t', type=int, default=200, help='背景判定の閾値 (0-255)')
    parser.add_argument('--watch', '-w', action='store_true', help='ディレクトリを監視モードで実行')
    
    args = parser.parse_args()
    
    if args.watch:
        if not args.input or not args.output:
            print("監視モードには入力ディレクトリと出力ディレクトリの指定が必要です")
            sys.exit(1)
        print(f"ディレクトリ {args.input} を監視中...")
        watch_directory(args.input, args.output)
    else:
        if not args.input or not args.output:
            print("使用方法: python remove_background.py -i input.jpg -o output.png [-t threshold]")
            sys.exit(1)
        remove_background(args.input, args.output, args.threshold)
