// 缓存配置
const CACHE_KEY = 'articles_cache';
const CACHE_EXPIRE_TIME = 7 * 24 * 60 * 60 * 1000; // 7天过期时间

// 下拉刷新相关变量
let startY = 0;
let moveY = 0;
let isDragging = false;
let isRefreshing = false;
const refreshThreshold = 60; // 触发刷新的阈值

// 返回上一页功能
function goBack() {
    // 尝试返回历史记录
    if (window.history.length > 1) {
        window.history.back();
    } else {
        // 如果没有历史记录，默认返回文章列表页
        const isInPagesDir = window.location.pathname.includes('pages/');
        const targetPath = isInPagesDir ? 'articles.html' : 'pages/articles.html';
        window.location.href = targetPath;
    }
}

// 获取URL中的文章ID参数
function getArticleId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// 生成文章目录
function generateToc(markdownContent) {
    const toc = document.getElementById('article-toc');
    toc.innerHTML = '';
    
    // 提取Markdown中的标题
    const headings = markdownContent.match(/#{2,3}\s+.+/g) || [];
    
    if (headings.length === 0) {
        toc.innerHTML = '<li>无目录</li>';
        return headings;
    }
    
    headings.forEach(heading => {
        // 解析标题级别和内容
        const level = heading.match(/#+/)[0].length;
        const text = heading.replace(/#+\s+/, '');
        // 创建唯一ID用于锚点
        const id = text.toLowerCase().replace(/\s+/g, '-');
        
        // 创建目录项
        const li = document.createElement('li');
        li.className = `toc-level-${level}`;
        
        const a = document.createElement('a');
        a.href = `#${id}`;
        a.textContent = text;
        li.appendChild(a);
        
        toc.appendChild(li);
    });
    
    return headings;
}

// 为Markdown内容中的标题添加ID
function addHeadingIds(markdownContent, headings) {
    let content = markdownContent;
    
    headings.forEach(heading => {
        const level = heading.match(/#+/)[0];
        const text = heading.replace(/#+\s+/, '');
        const id = text.toLowerCase().replace(/\s+/g, '-');
        
        // 替换原始标题为带ID的HTML标题
        const replacement = `${level} <span id="${id}">${text}</span>`;
        content = content.replace(heading, replacement);
    });
    
    return content;
}

// 处理标题生成安全的文件名
function getSafeFilename(title) {
    // 转换为小写，替换空格为连字符，移除特殊字符
    return title.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');
}

// 显示错误信息
function showError(message) {
    console.error('加载失败:', message);
    document.querySelector('.loading').style.display = 'none';
    document.getElementById('article-content').style.display = 'none';
    document.querySelector('.error').style.display = 'block';
    document.getElementById('error-message').textContent = message;
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

// 加载文章详情 - 适配后端API
function loadArticleDetail(forceRefresh = false) {
    // 重置状态
    document.querySelector('.loading').style.display = 'block';
    document.getElementById('article-content').style.display = 'none';
    document.querySelector('.error').style.display = 'none';
    
    const articleId = getArticleId();
    if (!articleId) {
        showError('未找到文章ID参数');
        finishRefresh(); // 结束刷新状态
        return;
    }
    
    // 后端API基础地址
    const apiBaseUrl = 'https://frp-boy.com:52171';
    // 从后端API获取文章列表数据
    const articlesListUrl = `${apiBaseUrl}/api/data/articles`;
    
    // 通过后端API加载数据
    const loadFromBackend = async () => {
        try {
            // 1. 从后端获取文章列表数据
            const response = await fetch(articlesListUrl);
            
            if (!response.ok) {
                throw new Error(`获取文章列表失败: ${response.status}`);
            }
            
            const articles = await response.json();
            
            // 验证数据格式
            if (!Array.isArray(articles)) {
                throw new Error('文章数据格式错误');
            }
            
            // 查找对应的文章
            const article = articles.find(a => a.id.toString() === articleId);
            
            if (!article) {
                throw new Error('未找到对应的文章');
            }
            
            // 保存到缓存
            saveToCache(articles);
            
            // 显示文章内容区域
            document.querySelector('.loading').style.display = 'none';
            document.getElementById('article-content').style.display = 'block';
            
            // 填充文章基本信息
            document.getElementById('article-title').textContent = article.artiTitle || '未命名文章';
            document.getElementById('article-date').textContent = article.date || '未知日期';
            document.getElementById('article-tag').textContent = article.tag || '未分类';
            document.getElementById('article-readTime').textContent = article.readTime || '5分钟';
            
            // 更新页面标题
            document.title = `${article.artiTitle || '文章详情'} | 宁静空间`;
            
            // 获取文章标题并生成安全的文件名
            const title = article.title || article.artiTitle || 'untitled';
            const safeFilename = getSafeFilename(title);
            
            // 2. 使用标题作为查询参数，从后端获取Markdown内容
            const mdApiUrl = `${apiBaseUrl}/api/articles?title=${encodeURIComponent(safeFilename)}`;
            
            const mdResponse = await fetch(mdApiUrl);
            
            if (!mdResponse.ok) {
                throw new Error(`无法加载文章内容: ${mdResponse.status}`);
            }
            
            const markdownContent = await mdResponse.text();
            
            // 生成目录
            const headings = generateToc(markdownContent);
            
            // 为标题添加ID
            const contentWithIds = addHeadingIds(markdownContent, headings);
            
            // 渲染Markdown
            document.getElementById('article-markdown-content').innerHTML = marked.parse(contentWithIds);
            
            // 高亮代码
            hljs.highlightAll();
            
        } catch (error) {
            showError(error.message);
        } finally {
            finishRefresh(); // 无论成功失败都结束刷新状态
        }
    };
    
    // 开始加载
    loadFromBackend();
}

// 初始化目录折叠功能
function initTocToggle() {
    const tocHeader = document.querySelector('.toc-header');
    const tocContent = document.querySelector('.toc-content');
    
    tocHeader.addEventListener('click', () => {
        tocContent.classList.toggle('active');
        const icon = tocHeader.querySelector('i');
        icon.classList.toggle('fa-chevron-down');
        icon.classList.toggle('fa-chevron-up');
    });
    
    // 默认展开目录
    tocContent.classList.add('active');
    const icon = tocHeader.querySelector('i');
    icon.classList.remove('fa-chevron-down');
    icon.classList.add('fa-chevron-up');
}

// 平滑滚动功能
function initSmoothScroll() {
    // 平滑滚动
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 76, // 考虑顶部导航栏高度
                    behavior: 'smooth'
                });
                
                // 在移动设备上点击目录后收起目录
                const tocContent = document.querySelector('.toc-content');
                if (tocContent.classList.contains('active')) {
                    tocContent.classList.remove('active');
                    const icon = document.querySelector('.toc-header i');
                    icon.classList.add('fa-chevron-down');
                    icon.classList.remove('fa-chevron-up');
                }
            }
        });
    });
}

// 初始化下拉刷新
function initPullRefresh() {
    const pullRefresh = document.querySelector('.pull-refresh');
    const refreshText = pullRefresh.querySelector('.refresh-text');
    const refreshIcon = pullRefresh.querySelector('.refresh-icon i');
    const content = document.querySelector('.page-content');
    
    // 触摸开始
    content.addEventListener('touchstart', (e) => {
        if (window.scrollY === 0 && !isRefreshing) {
            startY = e.touches[0].clientY;
            isDragging = true;
        }
    }, { passive: true });
    
    // 触摸移动
    content.addEventListener('touchmove', (e) => {
        if (isDragging && !isRefreshing) {
            moveY = e.touches[0].clientY - startY;
            
            if (moveY > 0) {
                e.preventDefault(); // 阻止页面滚动
                const pullDistance = Math.min(moveY, refreshThreshold + 20);
                const scale = pullDistance / refreshThreshold;
                
                // 更新下拉刷新UI
                pullRefresh.classList.add('active');
                pullRefresh.style.transform = `translateY(${pullDistance - 50}px)`;
                
                // 改变提示文本和图标
                if (pullDistance >= refreshThreshold) {
                    refreshText.textContent = '松开刷新';
                    refreshIcon.classList.remove('fa-arrow-down');
                    refreshIcon.classList.add('fa-refresh');
                } else {
                    refreshText.textContent = '下拉刷新';
                    refreshIcon.classList.remove('fa-refresh');
                    refreshIcon.classList.add('fa-arrow-down');
                }
            }
        }
    }, { passive: false });
    
    // 触摸结束
    content.addEventListener('touchend', () => {
        if (isDragging && !isRefreshing) {
            isDragging = false;
            
            if (moveY >= refreshThreshold) {
                // 触发刷新
                startRefresh();
            } else {
                // 未达到阈值，回弹
                pullRefresh.classList.remove('active');
                pullRefresh.style.transform = 'translateY(-100%)';
                refreshText.textContent = '下拉刷新';
                refreshIcon.classList.remove('fa-refresh');
                refreshIcon.classList.add('fa-arrow-down');
            }
            
            moveY = 0;
        }
    }, { passive: true });
}

// 开始刷新
function startRefresh() {
    if (isRefreshing) return;
    
    isRefreshing = true;
    const pullRefresh = document.querySelector('.pull-refresh');
    const refreshText = pullRefresh.querySelector('.refresh-text');
    const refreshIcon = pullRefresh.querySelector('.refresh-icon i');
    
    // 更新刷新状态UI
    pullRefresh.classList.add('active', 'refreshing');
    pullRefresh.style.transform = 'translateY(0)';
    refreshText.textContent = '正在刷新...';
    refreshIcon.classList.remove('fa-arrow-down');
    refreshIcon.classList.add('fa-refresh');
    
    // 执行刷新操作
    loadArticleDetail(true);
}

// 结束刷新
function finishRefresh() {
    if (!isRefreshing) return;
    
    const pullRefresh = document.querySelector('.pull-refresh');
    const refreshText = pullRefresh.querySelector('.refresh-text');
    const refreshIcon = pullRefresh.querySelector('.refresh-icon i');
    
    // 恢复UI状态
    refreshText.textContent = '刷新完成';
    
    // 延迟后隐藏刷新区域
    setTimeout(() => {
        isRefreshing = false;
        pullRefresh.classList.remove('active', 'refreshing');
        pullRefresh.style.transform = 'translateY(-100%)';
        refreshText.textContent = '下拉刷新';
        refreshIcon.classList.remove('fa-refresh');
        refreshIcon.classList.add('fa-arrow-down');
    }, 800);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    loadArticleDetail();
    initTocToggle();
    initSmoothScroll();
    initPullRefresh();
});