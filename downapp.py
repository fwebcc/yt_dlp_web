#!/usr/bin/python3
# -*- coding: UTF-8 -*-

from flask import Flask, render_template, request, send_from_directory, redirect, url_for, session, make_response
from flask_socketio import SocketIO, emit
import yt_dlp
import os
import threading
import json
import urllib.parse
import time
import signal
import sys
import fcntl
import atexit
from multiprocessing import freeze_support

# --- 全局常量与配置 ---
PID_FILE = "video_downloader.pid"
DOWNLOAD_DIR = os.path.join(os.path.dirname(__file__), 'down')
COOKIE_FILES = {
    "default": "conf/cookies.txt",
    "youtube": "conf/cookies_youtube.txt",
    "x": "conf/cookies_x.txt",
    "vimeo": "conf/cookies_vimeo.txt",
    "instagram": "conf/cookies_instagram.txt"
}

app = Flask(__name__)
app.secret_key = 'fweb.cc'
#socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading', engineio_logger=False)
# --- 全局状态变量 ---
stop_flag = False
processing_url = None
task_lock = threading.Lock()
last_emit_time = 0

# --- 1. 文件管理工具组 ---
class FileManager:
    @staticmethod
    def get_abs_path(rel_path):
        return os.path.join(os.path.dirname(__file__), rel_path)

    @staticmethod
    def read_json(rel_path, default=None):
        path = FileManager.get_abs_path(rel_path)
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except: pass
        return default if default is not None else {}

    @staticmethod
    def save_json(rel_path, data):
        path = FileManager.get_abs_path(rel_path)
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            return True
        except: return False

    @staticmethod
    def read_text(rel_path, default=""):
        path = FileManager.get_abs_path(rel_path)
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    return f.read()
            except: pass
        return default

    @staticmethod
    def write_text(rel_path, content):
        path = FileManager.get_abs_path(rel_path)
        try:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        except: return False

# --- 2. 核心辅助函数 ---
def load_config():
    default = {"proxy_url": "socks5h://192.168.2.142:1080", "proxy_enabled": True}
    return FileManager.read_json('conf/config.json', default=default)

def get_auto_cookie_key(url):
    try:
        domain = urllib.parse.urlparse(url).netloc.lower()
        mapping = {'youtube.com': 'youtube', 'youtu.be': 'youtube', 'x.com': 'x', 
                   'twitter.com': 'x', 'vimeo.com': 'vimeo', 'instagram.com': 'instagram'}
        for k, v in mapping.items():
            if k in domain: return v
    except: pass
    return "default"

# --- 3. 下载核心逻辑 ---
def progress_hook(d):
    global last_emit_time
    if d['status'] == 'downloading':
        current_time = time.time()
        if current_time - last_emit_time < 0.5: return
        last_emit_time = current_time
        percent = d.get('_percent_str', '0%').replace(' ', '')
        speed = d.get('_speed_str', 'N/A')
        eta = d.get('_eta_str', 'N/A')
        raw_filename = os.path.basename(d.get('filename', 'Unknown'))
        clean_filename = raw_filename.replace(' ', '_').replace('#', '_').replace('&', '_')
        socketio.emit('update_progress', {'filename': clean_filename, 'percent': percent, 'speed': speed, 'eta': eta})

def download_video(url, cookie_key="default"):
    global processing_url, stop_flag
    stop_flag = False
    socketio.emit('log_message', {'msg': '📡 后台已挂载任务，准备解析...'})
    config = load_config()
    if cookie_key == "auto":
        cookie_key = get_auto_cookie_key(url)
        socketio.emit('log_message', {'msg': f'🔍 自动匹配库: {cookie_key}'})
    target_cookie_file = COOKIE_FILES.get(cookie_key, "conf/cookies.txt")
    cookie_path = FileManager.get_abs_path(target_cookie_file)
    ydl_opts = FileManager.read_json('conf/ydl_config.json')
    ydl_opts['progress_hooks'] = [progress_hook]
    def check_stop_hook(d):
        if stop_flag: raise Exception("USER_STOPPED")
    ydl_opts['progress_hooks'].append(check_stop_hook)
    if os.path.exists(cookie_path):
        ydl_opts['cookiefile'] = cookie_path
        socketio.emit('log_message', {'msg': f'🍪 已挂载库文件: {target_cookie_file}'})
    if config.get('proxy_enabled'):
        ydl_opts['proxy'] = config.get('proxy_url')
        socketio.emit('log_message', {'msg': f'🌐 使用代理: {ydl_opts["proxy"]}'})
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            socketio.emit('log_message', {'msg': '⏳ 正在解析视频信息...'})
            info = ydl.extract_info(url, download=False)
            title = info.get('title', 'video')
            clean_title = title.replace(' ', '_').replace('#', '_').replace('&', '_').replace('*', '_')
            final_filename = f"{clean_title}.mp4"
            final_path = os.path.join(DOWNLOAD_DIR, final_filename)
            ydl_opts['outtmpl'] = final_path
            with yt_dlp.YoutubeDL(ydl_opts) as ydl_final:
                socketio.emit('log_message', {'msg': f'🚀 准备下载: {final_filename}'})
                ydl_final.download([url])
            socketio.emit('download_complete', {'status': 'done'})
            socketio.emit('log_message', {'msg': '✅ 下载完成！'})
    except Exception as e:
        msg = "⏹️ 任务已由用户手动停止" if "USER_STOPPED" in str(e) else f"❌ 出错: {str(e)[:100]}"
        socketio.emit('log_message', {'msg': msg})
    finally:
        processing_url = None
        stop_flag = False

# --- 4. 路由定义 ---
@app.route('/')
def index():
    user_cookie, user_token = request.cookies.get('toke'), session.get('toke')
    if not session.get('logged_in') or user_cookie != user_token: return redirect(url_for('login'))
    file_list_data = []
    if os.path.exists(DOWNLOAD_DIR):
        for filename in os.listdir(DOWNLOAD_DIR):
            path = os.path.join(DOWNLOAD_DIR, filename)
            if os.path.isfile(path):
                stats = os.stat(path)
                file_list_data.append({'name': filename, 'size': f"{stats.st_size/(1024*1024):.2f} MB", 'time': time.strftime('%Y-%m-%d %H:%M', time.localtime(stats.st_mtime)), 'mtime': stats.st_mtime})
    file_list_data.sort(key=lambda x: x['mtime'], reverse=True)
    return render_template('index.html', files=file_list_data, config=load_config(), current_cookies=FileManager.read_text('conf/cookies.txt'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        user_email, user_passwd = request.form.get('username'), request.form.get('password')
        if not user_email or not user_passwd: return render_template('login.html', error="请填写完整信息")
        user_data = FileManager.read_json('conf/user.json')
        if user_data.get('ID') == user_email and user_data.get('toke') == user_passwd:
            toke, uid = str(user_data.get('toke', '')), str(user_data.get('ID', ''))
            session.update({'toke': toke, 'logged_in': True})
            resp = make_response(redirect(url_for('index')))
            resp.set_cookie('toke', toke, max_age=3600); resp.set_cookie('ID', uid, max_age=3600)
            return resp
        return render_template('login.html', error="用户名或者密码错误")
    return render_template('login.html')

@app.route('/start_download', methods=['POST'])
def start_download_api():
    if not session.get('logged_in'): return {"status": "error"}, 401
    data = request.get_json()
    url, key = data.get('url', '').strip(), data.get('cookie_key', 'default')
    if not url: return {"status": "error", "message": "链接为空"}, 400
    with task_lock:
        global processing_url
        if processing_url == url: return {"status": "warning", "message": "任务进行中"}, 200
        processing_url = url
        socketio.start_background_task(download_video, url, key)
    return {"status": "success"}

@app.route('/stop_download', methods=['POST'])
def stop_download():
    global stop_flag
    stop_flag = True
    return {"status": "success"}

@app.route('/update_proxy', methods=['POST'])
def update_proxy():
    if not session.get('logged_in'): 
        return redirect(url_for('login'))
    
    # 构造配置字典
    new_config = {
        "proxy_url": request.form.get('proxy_url'), 
        "proxy_enabled": request.form.get('proxy_enabled') == 'on'
    }
    
    # 调用工具组保存，路径对应 load_config 里的 'conf/config.json'
    FileManager.save_json('conf/config.json', new_config)
    
    return redirect(url_for('index'))

@app.route('/update_cookies', methods=['POST'])
def update_cookies():
    if not session.get('logged_in'): return redirect(url_for('login'))
    FileManager.write_text(COOKIE_FILES.get(request.form.get('cookie_target', 'default'), "conf/cookies.txt"), request.form.get('cookies_data', ''))
    return redirect(url_for('index'))

@app.route('/delete/<path:filename>', methods=['POST'])
def delete_file(filename):
    if not session.get('logged_in'): return "Unauthorized", 401
    path = os.path.join(DOWNLOAD_DIR, filename)
    if os.path.exists(path): os.remove(path)
    return redirect(url_for('index'))

@app.route('/get_file/<path:filename>')
def get_file(filename):
    if not session.get('logged_in'): return redirect(url_for('login'))
    return send_from_directory(DOWNLOAD_DIR, filename, as_attachment=request.args.get('download') == '1')

@app.route('/get_cookie_content/<target>')
def get_cookie_content(target):
    if not session.get('logged_in'): return "未授权", 403
    return FileManager.read_text(COOKIE_FILES.get(target, ""), default="")

@app.route('/get_sn')
def get_sn():
    if not session.get('logged_in'): return "未授权", 403
    return FileManager.read_text('conf/sn.txt', default="说明文件不存在。")

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# --- 5. 进程管理与生命周期 ---
def signal_handler(sig, frame):
    cleanup_pid(); sys.exit(0)

def check_and_lock():
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true': return None
    try:
        fp = open(FileManager.get_abs_path(PID_FILE), 'a+')
        fcntl.flock(fp, fcntl.LOCK_EX | fcntl.LOCK_NB)
        fp.seek(0); fp.truncate(); fp.write(str(os.getpid())); fp.flush()
        return fp
    except:
        print("❌ 启动失败: 进程已在运行。"); sys.exit(1)

def cleanup_pid():
    path = FileManager.get_abs_path(PID_FILE)
    if os.path.exists(path):
        try: os.remove(path)
        except: pass

atexit.register(cleanup_pid)

if __name__ == "__main__":
    freeze_support()
    if not os.path.exists(DOWNLOAD_DIR): os.makedirs(DOWNLOAD_DIR)
    
    # 读取 user.json 中的配置信息
    user_conf = FileManager.read_json('conf/user.json', default={"port": 5000})
    run_port = user_conf.get('port', 5000)
    
    _lock = check_and_lock()
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    print(f"🚀 Youtube Downloader WebUI 启动在 http://[::]:{run_port}")
    socketio.run(app, host='::', port=run_port, debug=False, use_reloader=False, allow_unsafe_werkzeug=True)
