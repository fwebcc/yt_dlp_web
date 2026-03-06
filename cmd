#!/bin/bash

# 获取脚本所在的绝对路径
APP_DIR=$(cd $(dirname "$0"); pwd)
FILES=("downapp.py")

# 定义 Deno 路径
export DENO_INSTALL="$HOME/.deno"
export PATH="$DENO_INSTALL/bin:$PATH"

check_env() {
    echo "--- 检查环境依赖 ---"
    # 检查 Deno 是否安装
    if ! command -v deno &> /dev/null; then
        echo "未找到 Deno，正在安装..."
        curl -fsSL https://deno.land/install.sh | sh
    fi

    # 检查并更新 yt-dlp
    echo "检查并更新 yt-dlp 及其插件..."
    pip install -U "yt-dlp[default]" yt-dlp-ejs --break-system-packages
}

case "$1" in
    start)
        # 仅在环境缺失时或按需运行环境检查（不建议每次启动都运行 pip install）
        # 如果你想每次启动都更新，可以保留下面这行
        # check_env 

        for FILE in "${FILES[@]}"; do
            FULL_PATH="$APP_DIR/$FILE"
            if [ -f "$FULL_PATH" ]; then
                # 检查是否已经在运行
                pid=$(ps -ef | grep "$FULL_PATH" | grep -v grep | awk '{print $2}')
                if [ -n "$pid" ]; then
                    echo "$FILE 已在运行 (PID: $pid)，跳过。"
                    continue
                fi

                nohup python3 -u "$FULL_PATH" > "$APP_DIR/$FILE".log 2>&1 &
                echo "已启动: $FILE (PID: $!)"
            else
                echo "错误: 未找到文件 $FULL_PATH"
            fi
        done
        ;;

    stop)
        for FILE in "${FILES[@]}"; do
            FULL_PATH="$APP_DIR/$FILE"
            # 优先匹配全路径
            pid=$(ps -ef | grep "$FULL_PATH" | grep -v grep | awk '{print $2}')
            
            if [ -z "$pid" ]; then
                # 兜底匹配文件名
                pid=$(ps -ef | grep "$FILE" | grep -v grep | grep -v "$0" | awk '{print $2}')
            fi

            if [ -n "$pid" ]; then
                echo "正在停止: $FILE (PID: $pid)..."
                kill $pid # 先尝试正常停止
                sleep 1
                kill -9 $pid 2>/dev/null # 如果还没死，强制杀死
                echo "已完成停止。"
            else
                echo "未运行: $FILE"
            fi
        done
        ;;

    up)
        # 显式执行环境更新
        check_env
        ;;

    restart)
        $0 stop
        sleep 2
        $0 start
        ;;

    *)
        echo "用法: $0 {start|stop|restart|up}"
        exit 1
esac
