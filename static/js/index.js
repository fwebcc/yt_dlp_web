let currentPage = 1;
let isLoggedIn = false; 

/**
 * 从 API 获取电影数据
 */
function fetchMovies(page = 1) {
    const keyword = $('#search_input').val();
    $('.loading').show();
    $('#result_body').empty();
    $('#pagination').empty();

    $.ajax({
        url: '/api/movies', 
        method: 'GET',
        data: { q: keyword, p: page },
        success: function(data) {
            $('.loading').hide();
            $('#total_count').text(data.total_count);
            isLoggedIn = data.is_logged_in; 
            isLoggedAdmin = data.is_logged_admin; 
            if (keyword) {
                $('#search_stats_box').show();
                $('#search_count').text(data.search_count);
            } else {
                $('#search_stats_box').hide();
            }

            renderTable(data.results);
            renderPagination(data.page, data.total_pages);
        },
        error: function(err) {
            $('.loading').hide();
            console.error("加载失败", err);
        }
    });
}

/**
 * 核心修改：将表格渲染改为 Col-4 卡片渲染
 */
/**
 * 修改后的渲染逻辑：每一条记录占据一行 (col-12)，内部划分为三列 (col-4)
 */
function renderTable(results) {
    const container = $('#result_body');
    container.empty(); // 清空容器

    if (results.length === 0) {
        container.append('<div class="col-12 text-center py-5 text-muted">未发现匹配资源</div>');
        return;
    }

    results.forEach(item => {
        const resList = item.data || [];
        const resCount = resList.length;
        
        // 权限工具（编辑/删除）
        let adminTools = '';
        if (isLoggedIn && isLoggedAdmin) {
            adminTools = `
                <div class="mt-2">
                    <a href="javascript:void(0);" onclick="edit_page(${item.id})" class="btn btn-sm btn-outline-info mr-1"><i class="fa fa-edit"></i></a>
                    <a href="javascript:void(0);" onclick="deleteMovie(${item.id})" class="btn btn-sm btn-outline-danger"><i class="fa fa-trash"></i></a>
                </div>`;
        }

        // 资源按钮状态
        if (isLoggedIn) {
            but=`<button type="button" class="btn btn-primary btn-block btn-extract rounded-pill" 
                       data-toggle="modal" data-target="#myModal" 
                       onclick="renderResourceList('${item.name.replace(/'/g, "\\'")}', '${encodeURIComponent(JSON.stringify(resList))}')">
                   <i class="fa fa-cloud-download"></i> 提取资源 (${resCount})
               </button>`
        }else{
             but=`<button type="button" class="btn btn-primary btn-block btn-extract rounded-pill" 
                       data-toggle="modal" data-target="#myModal" 
                       onclick="login()">
                   <i class="fa fa-cloud-download"></i> 提取资源 (${resCount})
               </button>`

        }

        const btnHtml = resCount > 0 
            ? but
            : `<button class="btn btn-light btn-block disabled text-muted" disabled>无资源</button>`;
        // 构建三列布局的行
        const rowHtml = `
            <div class="col-12 mb-3">
                <div class="card movie-card shadow-sm">
                    <div class="card-body">
                        <div class="row align-items-center text-center text-md-left">
                            <div class="col-12 col-md-4 border-right-md">
                                <h6 class="font-weight-bold text-dark mb-1">${item.name}</h6>
                                <a href="https://www.douban.com/search?cat=1002&q=${encodeURIComponent(item.name.split(' ')[0])}" 
                                   target="_blank" class="badge badge-pill badge-douban">
                                   <i class="fa fa-share"></i> 豆瓣详情
                                </a>
                            </div>

                            <div class="col-12 col-md-4 py-3 py-md-0 border-right-md text-center">
                                <div class="text-muted small">
                                    <i class="fa fa-clock-o"></i> 入库时间：<br>${item.added_time}
                                </div>
                                ${adminTools}
                            </div>

                            <div class="col-12 col-md-4">
                                ${btnHtml}
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        container.append(rowHtml);
    });
}
/**
 * 渲染分页
 */
function renderPagination(current, total) {
    const pagBox = $('#pagination');
    pagBox.empty();
    if (total <= 1) return;

    for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || (i >= current - 2 && i <= current + 2)) {
            const li = $('<li class="page-item"></li>');
            const btn = $('<a class="page-link shadow-none" href="javascript:void(0);"></a>').text(i);
            if (i === current) li.addClass('active');
            else {
                btn.on('click', () => {
                    currentPage = i;
                    fetchMovies(i);
                    window.scrollTo(0, 0);
                });
            }
            li.append(btn);
            pagBox.append(li);
        } else if (i === current - 3 || i === current + 3) {
            pagBox.append('<li class="page-item disabled"><span class="page-link">...</span></li>');
        }
    }
}

$(document).ready(function() {
    $('#search_btn').on('click', function(e) {
        e.preventDefault();
        currentPage = 1;
        fetchMovies(1);
    });
    $('#search_input').on('keypress', function(e) {
        if (e.which === 13) {
            e.preventDefault();
            currentPage = 1;
            fetchMovies(1);
        }
    });
});

/**
 * 以下为您原始代码中的核心逻辑，全部完整保留
 */
async function deleteMovie(resId) {
    if (!confirm(`确定要删除 ID 为 ${resId} 的记录吗？`)) return;
    try {
        const response = await fetch(`/api/delete_resource/${resId}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.status === 'success') location.reload(); 
        else alert('删除失败: ' + result.message);
    } catch (error) { console.error('请求出错:', error); }
}

function add_page(){
    const add_page1 = `
    <div id="add-movie-form" style="padding: 20px; color: #333; background: #fff; border-radius: 10px;">
        <h3 style="margin-bottom: 20px; color: #1e3c72;"><i class="fa fa-plus-circle"></i> 手动添加影片资源</h3>
        <div class="form-group">
            <label><b>🎬 影片名称:</b></label>
            <input type="text" id="m_name" class="form-control" placeholder="例如：龙之家族">
        </div>
        <div id="res-items-container">
            <label><b>🔗 资源链接列表:</b></label>
            <div class="res-item" style="background: #f8f9fa; padding: 10px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 10px;">
                <input type="text" class="form-control res-label" placeholder="版本标签 (如: 4K蓝光)" style="margin-bottom:5px;">
                <input type="text" class="form-control res-url" placeholder="磁力链接">
            </div>
        </div>
        <button type="button" onclick="addMoreRes()" class="btn btn-outline-secondary btn-sm mb-3"><i class="fa fa-plus"></i> 添加更多版本</button>
        <button onclick="submitData()" class="btn btn-primary btn-block" style="background: #1e3c72; border: none;">确认提交到数据库</button>
    </div>`;
    $('#mpage').html(add_page1);
}

function addMoreRes() {
    const newItem = `
    <div class="res-item" style="background: #f8f9fa; padding: 10px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 10px;">
        <input type="text" class="form-control res-label" placeholder="版本标签" style="margin-bottom:5px;">
        <input type="text" class="form-control res-url" placeholder="磁力链接">
    </div>`;
    $('#res-items-container').append(newItem);
}

async function submitData() {
    const movieName = $('#m_name').val().trim();
    if (!movieName) { alert("影片名称不能为空！"); return; }
    let dataObj = [];
    $('.res-item').each(function() {
        const label = $(this).find('.res-label').val().trim();
        const url = $(this).find('.res-url').val().trim();
        if (url) dataObj.push({ "label": label || "默认版本", "url": url });
    });
    if (dataObj.length === 0) { alert("请至少填写一个资源链接！"); return; }

    const payload = {
        name: movieName,
        data_json: JSON.stringify(dataObj),
        added_time: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    };

    try {
        const response = await fetch('/api/add_resource', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.status === 'success') location.reload();
        else alert("❌ " + result.message);
    } catch (err) { console.error(err); }
}

async function edit_page(resId) {
    try {
        const response = await fetch(`/api/get_resource/${resId}`);
        const result = await response.json();
        if (result.status !== 'success') return alert("获取数据失败");

        const movie = result.data;
        const resList = JSON.parse(movie.data_json || "[]");

        let editHtml = `
        <div id="edit-movie-form" style="padding: 20px;" class="card bg-light">
            <h3><i class="fa fa-edit"></i> 编辑影片资源</h3>
            <input type="hidden" id="edit_id" value="${movie.id}">
            <div class="form-group">
                <label>影片名称:</label>
                <input type="text" id="edit_name" class="form-control" value="${movie.name}">
            </div>
            <div id="edit-res-container">
                ${resList.map(item => `
                    <div class="res-item" style="background:#f8f9fa; padding:10px; margin-bottom:10px; border-radius:8px; border:1px solid #ddd;">
                        <input type="text" class="form-control res-label" value="${item.label}" style="margin-bottom:5px;">
                        <textarea class="form-control res-url" rows="3" style="font-size:12px;">${item.url}</textarea>
                        <button type="button" onclick="$(this).parent().remove()" class="btn btn-danger btn-sm mt-1">&times; 删除此组</button>
                    </div>
                `).join('')}
            </div>
            <button type="button" onclick="addMoreEditRes()" class="btn btn-primary btn-sm mb-3">+ 增加版本</button>
            <button onclick="submitUpdate()" class="btn btn-success btn-block">确认保存</button>
        </div>`;
        $('#mpage').html(editHtml);
        $('#myModal').modal('show');
    } catch (err) { alert("加载失败"); }
}

function addMoreEditRes() {
    const newItem = `<div class="res-item" style="background:#f8f9fa; padding:10px; margin-bottom:10px; border-radius:8px; border:1px solid #ddd;">
        <input type="text" class="form-control res-label" placeholder="版本标签" style="margin-bottom:5px;">
        <textarea class="form-control res-url" rows="3" placeholder="磁力链接" style="font-size:12px;"></textarea>
        <button type="button" onclick="$(this).parent().remove()" class="btn btn-danger btn-sm mt-1">&times; 删除此组</button>
    </div>`;
    $('#edit-res-container').append(newItem);
}

async function submitUpdate() {
    const resId = $('#edit_id').val();
    const movieName = $('#edit_name').val().trim();
    let dataObj = [];
    $('#edit-res-container .res-item').each(function() {
        const label = $(this).find('.res-label').val().trim();
        const url = $(this).find('.res-url').val().trim();
        if (url) dataObj.push({ "label": label || "默认", "url": url });
    });

    const payload = { id: resId, name: movieName, data_json: JSON.stringify(dataObj) };
    const response = await fetch('/api/update_resource', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result.status === 'success') { alert("修改成功"); location.reload(); }
}

function renderResourceList(movieName, encodedJson) {
    let data;
    try {
        let decoded = decodeURIComponent(encodedJson);
        data = JSON.parse(decoded);
        if (typeof data === 'string') data = JSON.parse(data);
    } catch (e) {
        $('#mpage').html('<p class="p-3 text-danger">数据解析失败</p>');
        return;
    }

    const is_logged_in = !!document.cookie.match(new RegExp('(^| )toke=([^;]+)'));

    let listHtml = `
        <div style="padding: 15px; background: #fff; border-radius: 12px;">
            <h5 style="margin-bottom: 20px; color: #007bff; border-left: 4px solid #007bff; padding-left: 10px; font-weight: bold;">${movieName}</h5>
            <div style="max-height: 70vh; overflow-y: auto;">
    `;
    
    if (data && data.length > 0) {
        data.forEach((item, index) => {
            listHtml += `
                <div class="d-flex flex-wrap justify-content-between align-items-center bg-light p-3 mb-2 rounded border">
                    <div class="mb-2 w-100">
                        <span class="badge badge-primary">${item.label || 'BluRay'}</span>
                    </div>
                    <div class="w-100 mt-1">
                        ${is_logged_in ? 
                            `<button data-link="${item.url}" onclick="bootstrapCopyHandler(this)" class="btn btn-success btn-block btn-sm rounded-pill"><i class="fa fa-magnet"></i> 复制磁力</button>` : 
                            `<a href="javascript:void(0);" onclick="login()" class="btn btn-outline-danger btn-block btn-sm rounded-pill">登录可见</a>`
                        }
                    </div>
                </div>`;
        });
    } else {
        listHtml += '<p class="text-center p-4 text-muted">无可用链接</p>';
    }
    listHtml += `</div></div>`;
    $('#mpage').html(listHtml);
}

function login() {
    const loginHtml = `
    <div class="p-3 bg-white rounded shadow">
        <h5 class="font-weight-bold mb-4 border-left pl-2">用户登录</h5>
        <div class="form-group">
            <label class="small text-muted">账号</label>
            <input type="text" id="email" class="form-control border-top-0 border-left-0 border-right-0 rounded-0" placeholder="请输入邮箱">
        </div>
        <div class="form-group">
            <label class="small text-muted">密码</label>
            <input type="password" id="passwd" class="form-control border-top-0 border-left-0 border-right-0 rounded-0" placeholder="请输入密码">
        </div>
        <div id="login_msg" class="small mb-3"></div>
        <button id="do_login_btn" onclick="do_login_action()" class="btn btn-dark btn-block py-2 font-weight-bold">立即登录</button>
    </div>`;
    $('#mpage').html(loginHtml);
}

function do_login_action() {
    const email = $('#email').val();
    const rawPass = $('#passwd').val();
    if (!email || !rawPass) return;
    const encryptedPass = md5(rawPass); 
    
    $.ajax({
        url: '/login',
        method: 'GET',
        data: { email: email, passwd: encryptedPass },
        success: function(data) {
            if (data.info === 'y') {
                $('#login_msg').addClass('text-success').text("✅ 登录成功！");
                setTimeout(() => { window.location.href = "/"; }, 1000);
            } else {
                $('#login_msg').addClass('text-danger').text("❌ " + data.val);
            }
        }
    });
}

function exit() {
   document.cookie = "toke=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
   window.location.href = "/";
}

/**
 * 完整保留您的 iOS 兼容复制逻辑
 */
function bootstrapCopyHandler(el) {
    const text = el.getAttribute('data-link');
    if (!text) return;

    const textArea = document.createElement('span');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    textArea.innerText = text;
    document.body.appendChild(textArea);

    const range = document.createRange();
    range.selectNodeContents(textArea);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    try {
        const success = document.execCommand('copy');
        if (success) {
            renderBootstrapFeedback(el);
        } else {
            navigator.clipboard.writeText(text).then(() => renderBootstrapFeedback(el));
        }
    } catch (err) {
        console.error("复制失败", err);
    }

    selection.removeAllRanges();
    document.body.removeChild(textArea);
}

function renderBootstrapFeedback(el) {
    const $el = $(el); 
    const originalHTML = $el.html();
    $el.html('<i class="fa fa-check"></i> 已复制');
    $el.removeClass('btn-success').addClass('btn-info').prop('disabled', true);

    setTimeout(() => {
        $el.html(originalHTML);
        $el.removeClass('btn-info').addClass('btn-success').prop('disabled', false);
    }, 2000);
}