// 存储所有视频数据
let allVideos = [];
// 缓存键名
const CACHE_KEY = 'videos_cache';
// 缓存过期时间（24小时，单位：毫秒）
const CACHE_EXPIRE_TIME = 24 * 60 * 60 * 1000;

// 下拉刷新相关变量
let startY = 0;
let moveY = 0;
let isDragging = false;
let isRefreshing = false;
const REFRESH_THRESHOLD = 80; // 触发刷新的最小下拉距离

// 从缓存获取数据
function getFromCache() {
    const cacheData = localStorage.getItem(CACHE_KEY);
    if (!cacheData) return null;
    
    try {
        const parsedData = JSON.parse(cacheData);
        // 检查缓存是否过期
        if (Date.now() - parsedData.timestamp < CACHE_EXPIRE_TIME) {
            return parsedData.data;
        }
        // 缓存过期，清除缓存
        localStorage.removeItem(CACHE_KEY);
        return null;
    } catch (error) {
        console.error('解析缓存数据失败:', error);
        localStorage.removeItem(CACHE_KEY);
        return null;
    }
}

// 保存数据到缓存
function saveToCache(data) {
    try {
        const cacheData = {
            timestamp: Date.now(),
            data: data
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
        console.error('保存数据到缓存失败:', error);
    }
}

// 清除缓存
function clearCache() {
    localStorage.removeItem(CACHE_KEY);
}

// 渲染视频列表
function renderVideos(videos) {
    const videosContainer = document.getElementById('videos-container');
    videosContainer.innerHTML = '';
    
    if (videos.length === 0) {
        videosContainer.innerHTML = '<div class="error">没有找到相关视频</div>';
        return;
    }
    
    videos.forEach(video => {
        const videoCard = document.createElement('div');
        videoCard.className = 'video-card';
        
        // 从JSON数据中直接获取iframe嵌入代码
        // 补全协议部分(https:)，确保在各种环境下都能正常加载
        const iframeSrc = video.iframeSrc.startsWith('//') 
            ? `https:${video.iframeSrc}` 
            : video.iframeSrc;
        
        videoCard.innerHTML = `
            <div class="video-thumbnail">
                <iframe 
                    src="${iframeSrc}" 
                    scrolling="no" 
                    border="0" 
                    frameborder="no" 
                    framespacing="0" 
                    allowfullscreen="true"
                    title="${video.title}">
                </iframe>
            </div>
            <div class="video-content">
                <h3><a href="${video.link}" target="_blank">${video.title}</a></h3>
                <p class="video-description">${video.description}</p>
            </div>
        `;
        
        videosContainer.appendChild(videoCard);
    });
}

// 从Gitee仓库加载视频数据 - 直接访问raw文件[1,7](@ref)
function loadVideos(forceRefresh = false) {
    // 显示加载状态
    const videosContainer = document.getElementById('videos-container');
    if (videosContainer) {
        videosContainer.innerHTML = `
            <div class="loading">
                <i class="fa fa-circle-o-notch fa-spin fa-3x"></i>
                <p>正在加载视频数据...</p>
            </div>
        `;
    }

    // 如果不是强制刷新，先检查缓存
    if (!forceRefresh) {
        const cachedData = getFromCache();
        if (cachedData) {
            console.log('使用缓存数据渲染视频');
            allVideos = cachedData;
            renderVideos(allVideos);
            return;
        }
    } else {
        // 强制刷新时清除缓存
        clearCache();
    }

    // Gitee仓库中data目录下的videos.json路径[1](@ref)
    const giteeRawUrl = 'https://frp-boy.com:52171/api/data/videos';
    console.log('直接请求Gitee数据:', giteeRawUrl);
    
    // 直接使用fetch请求Gitee原始文件[1,7](@ref)
    fetch(giteeRawUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // 验证数据格式
            if (Array.isArray(data)) {
                allVideos = data;
                // 保存到缓存
                saveToCache(data);
                renderVideos(allVideos);
                console.log('视频数据加载成功，数量:', data.length);
                
                // 如果是下拉刷新触发的加载，结束刷新状态
                if (isRefreshing) {
                    finishRefresh();
                }
            } else {
                throw new Error('视频数据格式不正确，预期为数组');
            }
        })
        .catch(error => {
            console.error('从Gitee加载视频失败:', error);
            const videosContainer = document.getElementById('videos-container');
            if (videosContainer) {
                videosContainer.innerHTML = `
                    <div class="error">
                        <i class="fa fa-exclamation-triangle"></i>
                        <p>加载视频失败: ${error.message}</p>
                        <p style="font-size: 0.8rem; margin-top: 1rem;">
                            <button onclick="loadVideos(true)" style="padding: 5px 10px; margin: 5px;">重试</button>
                        </p>
                    </div>
                `;
            }
            
            // 如果是下拉刷新触发的加载，结束刷新状态
            if (isRefreshing) {
                finishRefresh();
            }
        });
}

// 获取Markdown文件内容 - 直接使用Gitee raw URL[1,7](@ref)
function getMarkdownContent(markdownPath) {
    if (!markdownPath) {
        return Promise.reject(new Error('Markdown路径不能为空'));
    }
    
    // 确保使用raw格式的URL[1](@ref)
    let rawUrl = markdownPath;
    if (markdownPath.includes('/blob/')) {
        rawUrl = markdownPath.replace('/blob/', '/raw/');
    }
    
    console.log('获取Markdown内容，路径:', rawUrl);
    
    return fetch(rawUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`获取Markdown内容失败: ${response.status}`);
            }
            return response.text();
        })
        .catch(error => {
            console.error('获取Markdown内容错误:', error);
            throw error;
        });
}

// 下拉刷新相关函数
function startRefresh(e) {
    // 如果正在刷新中，不处理新的触摸事件
    if (isRefreshing) return;
    
    // 记录初始触摸位置
    startY = e.touches[0].clientY;
    isDragging = true;
}

function handleDrag(e) {
    // 如果不在拖拽状态或正在刷新，不处理
    if (!isDragging || isRefreshing) return;
    
    // 计算移动距离
    const currentY = e.touches[0].clientY;
    moveY = currentY - startY;
    
    // 只处理向下拖拽且页面在顶部的情况
    if (moveY > 0 && window.scrollY <= 0) {
        e.preventDefault(); // 阻止页面滚动
        
        const pageContent = document.getElementById('videos');
        const refreshContainer = document.getElementById('refresh-container');
        const refreshText = document.getElementById('refresh-text');
        
        // 设置刷新容器高度和内容区域位移
        const displayHeight = Math.min(moveY, REFRESH_THRESHOLD + 20);
        refreshContainer.style.height = `${displayHeight}px`;
        pageContent.style.transform = `translateY(${displayHeight}px)`;
        
        // 当拖拽距离超过阈值时改变提示文本
        if (moveY >= REFRESH_THRESHOLD) {
            pageContent.classList.add('pulling-down');
            refreshText.textContent = '松开刷新';
        } else {
            pageContent.classList.remove('pulling-down');
            refreshText.textContent = '下拉刷新';
        }
    }
}

function endDrag(e) {
    if (!isDragging || isRefreshing) {
        isDragging = false;
        return;
    }
    
    const pageContent = document.getElementById('videos');
    const refreshContainer = document.getElementById('refresh-container');
    const refreshText = document.getElementById('refresh-text');
    
    // 检查是否达到刷新阈值
    if (moveY >= REFRESH_THRESHOLD) {
        // 触发刷新
        isRefreshing = true;
        pageContent.classList.add('refreshing');
        pageContent.classList.remove('pulling-down');
        refreshText.textContent = '正在刷新...';
        
        // 执行刷新操作，强制从服务器加载新数据
        loadVideos(true);
    } else {
        // 未达到阈值，回弹
        refreshContainer.style.height = '0';
        pageContent.style.transform = 'translateY(0)';
        pageContent.classList.remove('pulling-down');
    }
    
    // 重置拖拽状态
    isDragging = false;
    moveY = 0;
}

// 结束刷新状态
function finishRefresh() {
    const pageContent = document.getElementById('videos');
    const refreshContainer = document.getElementById('refresh-container');
    const refreshText = document.getElementById('refresh-text');
    
    // 重置状态
    isRefreshing = false;
    pageContent.classList.remove('refreshing');
    refreshText.textContent = '下拉刷新';
    
    // 回弹动画
    refreshContainer.style.height = '0';
    pageContent.style.transform = 'translateY(0)';
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化导航交互
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // 首页按钮直接跳转
            if (this.classList.contains('home-btn')) {
                return;
            }
            
            e.preventDefault();
            
            // 更新活跃状态
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // 处理页面跳转
            const targetPage = this.getAttribute('data-page');
            if (targetPage) {
                window.location.href = `${targetPage}.html`;
            }
        });
    });
    
    // 平滑滚动
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // 初始化下拉刷新事件监听
    const pageContent = document.getElementById('videos');
    pageContent.addEventListener('touchstart', startRefresh, { passive: false });
    pageContent.addEventListener('touchmove', handleDrag, { passive: false });
    pageContent.addEventListener('touchend', endDrag);
    
    // 加载视频数据
    loadVideos();
});