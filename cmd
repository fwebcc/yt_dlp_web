#!/bin/bash

# 获取脚本所在的绝对路径
APP_DIR=$(cd $(dirname "$0"); pwd)
FILES=("downapp")

case "$1" in
    start)
        for FILE in "${FILES[@]}"; do
            FULL_PATH="$APP_DIR/$FILE"
            if [ -f "$FULL_PATH" ]; then
                # 【关键点】启动时必须传入完整路径，方便后续 stop 时精准匹配
                nohup python3 "$FULL_PATH" > /dev/null 2>&1 &
                echo "已启动: $FILE (PID: $!)"
            else
                echo "跳过: 未找到文件 $FULL_PATH"
            fi
        done
        ;;
    stop)
        for FILE in "${FILES[@]}"; do
            FULL_PATH="$APP_DIR/$FILE"
            # 使用完整路径进行匹配，避免误杀其他同名脚本
            pid=$(ps -ef | grep "$FULL_PATH" | grep -v grep | awk '{print $2}')
            
            if [ -n "$pid" ]; then
                kill -9 $pid
                echo "已停止: $FILE (PID: $pid)"
            else
                # 如果带路径没搜到，再尝试只搜文件名（兼容手动启动的情况）
                pid_fallback=$(ps -ef | grep "$FILE" | grep -v grep | grep -v "$0" | awk '{print $2}')
                if [ -n "$pid_fallback" ]; then
                    kill -9 $pid_fallback
                    echo "已停止 (兼容模式): $FILE (PID: $pid_fallback)"
                else
                    echo "未运行: $FILE"
                fi
            fi
        done
        ;;
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
    *)
        echo "用法: $0 {start|stop|restart}"
        exit 1
esac