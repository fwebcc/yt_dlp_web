# yt_dlp_web
yt_dlp下载web页面
<img width="926" height="616" alt="QQ截图20260227125048" src="https://github.com/user-attachments/assets/66fb3558-b609-42cd-8ee0-33851f77f5db" />
<img width="980" height="631" alt="QQ截图20260227125059" src="https://github.com/user-attachments/assets/6612ab67-b05a-42f3-acee-cbf45ce7294e" />
apt install ffmpeg -y
#apt install nodejs -y


python3 -m pip install -U yt-dlp

pip3 install flask
pip3 install yt_dlp

pip3 install flask_socketio

如果使用的不是源码，直接安装下面补全js功能就可以了!
安装浏览器插件 Get cookies.txt LOCALLY

安装 Deno 运行时 (推荐)

curl -fsSL https://deno.land/install.sh | sh

echo 'export DENO_INSTALL="/root/.deno"' >> ~/.bashrc
echo 'export PATH="$DENO_INSTALL/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

验证安装：输入 deno --version，看到版本号即成功。

# 升级 yt-dlp 及其默认组件
pip install -U "yt-dlp[default]" --break-system-packages

# 安装关键的挑战脚本库
pip install -U yt-dlp-ejs --break-system-packages

conf/user.json文件夹里修改启动端口5000,默认用户名和密码，密码需要MD5加密存储

./cmd 启动打包程序

python3 downapp.py 启动源码程序，确保flask已安装
默认用户名密码 admin admin

测试环境debian 12
