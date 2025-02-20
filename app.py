from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import cv2
import numpy as np
import os
import logging
from remove_background import remove_background
import tempfile
from pathlib import Path
import traceback

app = Flask(__name__)
# CORSの設定を明示的に行う
CORS(app, resources={
    r"/remove-background": {
        "origins": ["http://localhost:8000"],
        "methods": ["POST"],
        "allow_headers": ["Content-Type"]
    }
})

# ログ設定
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

UPLOAD_FOLDER = 'uploads'
PROCESSED_FOLDER = 'processed'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

@app.route('/remove-background', methods=['POST'])
def process_image():
    try:
        # リクエストのログを追加
        logger.info('画像処理リクエストを受信')
        logger.debug(f'リクエストヘッダー: {request.headers}')
        
        if 'image' not in request.files:
            logger.error('画像ファイルが提供されていません')
            return jsonify({'error': '画像ファイルを選択してください'}), 400
        
        file = request.files['image']
        if file.filename == '':
            logger.error('ファイル名が空です')
            return jsonify({'error': 'ファイルが選択されていません'}), 400
        
        # ファイル形式の確認
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
        if not file.filename.lower().endswith(tuple(allowed_extensions)):
            logger.error(f'不適切なファイル形式: {file.filename}')
            return jsonify({'error': '許可されているファイル形式: PNG, JPG, JPEG, GIF'}), 400
        
        # 一時ファイルとして保存
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as temp_in:
            logger.debug(f'一時入力ファイル作成: {temp_in.name}')
            file.save(temp_in.name)
            temp_out = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
            logger.debug(f'一時出力ファイル作成: {temp_out.name}')
            
            try:
                # 背景除去を実行
                logger.info('背景除去処理を開始')
                remove_background(temp_in.name, temp_out.name)
                logger.info('背景除去処理が完了')
                return send_file(temp_out.name, mimetype='image/png')
            
            except Exception as e:
                logger.error(f'背景除去処理中にエラーが発生: {str(e)}')
                logger.error(traceback.format_exc())
                return jsonify({
                    'error': '画像処理中にエラーが発生しました',
                    'details': str(e)
                }), 500
            
            finally:
                # 一時ファイルを削除
                try:
                    os.unlink(temp_in.name)
                    os.unlink(temp_out.name)
                    logger.debug('一時ファイルを削除しました')
                except Exception as e:
                    logger.warning(f'一時ファイルの削除中にエラー: {str(e)}')
    
    except Exception as e:
        logger.error(f'予期せぬエラーが発生: {str(e)}')
        logger.error(traceback.format_exc())
        return jsonify({
            'error': 'サーバーエラーが発生しました',
            'details': str(e)
        }), 500

if __name__ == '__main__':
    logger.info('Flaskサーバーを起動します...')
    app.run(port=5000, debug=True, host='0.0.0.0') 