// 存储所有视频数据
let allVideos = [];
// 缓存键名
const CACHE_KEY = 'videos_cache';
// 缓存过期时间（24小时，单位：毫秒）
const CACHE_EXPIRE_TIME = 24 * 60 * 60 * 1000;

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

// 从Gitee仓库加载视频数据（带代理支持）
function loadVideos(forceRefresh = false) {
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

    // Gitee仓库中data目录下的videos.json路径
    const giteeRawUrl = 'https://gitee.com/peacerocket/PeaceSpace/raw/main/data/videos.json';
    
    // CORS代理服务列表（解决跨域问题）
    const proxyServices = [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://cors-anywhere.herokuapp.com/'
    ];
    
    // 尝试使用代理加载数据
    const tryWithProxy = async (proxyIndex = 0) => {
        if (proxyIndex >= proxyServices.length) {
            throw new Error('所有代理服务均失败，请稍后再试');
        }
        
        try {
            const proxyUrl = proxyServices[proxyIndex] + encodeURIComponent(giteeRawUrl);
            console.log(`尝试使用代理: ${proxyServices[proxyIndex]}`);
            
            const response = await fetch(proxyUrl, {
                headers: {
                    'Accept': 'application/json',
                },
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 验证数据格式
            if (Array.isArray(data)) {
                allVideos = data;
                // 保存到缓存
                saveToCache(data);
                renderVideos(allVideos);
            } else {
                throw new Error('视频数据格式不正确，预期为数组');
            }
            
        } catch (error) {
            console.warn(`代理 ${proxyIndex + 1} 失败:`, error);
            
            // 尝试下一个代理
            if (proxyIndex < proxyServices.length - 1) {
                console.log('尝试下一个代理...');
                setTimeout(() => tryWithProxy(proxyIndex + 1), 1000);
            } else {
                // 所有代理都失败
                console.error('加载视频失败:', error);
                const videosContainer = document.getElementById('videos-container');
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
        }
    };
    
    // 开始尝试第一个代理
    tryWithProxy(0);
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
    
    // 加载视频数据
    loadVideos();
});
