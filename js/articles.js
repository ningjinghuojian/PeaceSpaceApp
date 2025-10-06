// 存储所有文章数据
let allArticles = [];
// 存储所有分类数据
let allCategories = {
    level1: new Set(),
    level2: new Map(),
    level3: new Map()
};

// 缓存配置
const CACHE_KEY = 'articles_cache';
const CACHE_EXPIRE_TIME = 7 * 24 * 60 * 60 * 1000; // 7天过期时间

// 下拉刷新相关变量
let startY = 0;
let moveY = 0;
let currentY = 0;
let isDragging = false;
let isRefreshing = false;
const REFRESH_THRESHOLD = 60; // 触发刷新的阈值

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

// 初始化分类数据
function initCategories(articles) {
    // 重置分类数据
    allCategories = {
        level1: new Set(),
        level2: new Map(),
        level3: new Map()
    };

    articles.forEach(article => {
        const [level1, level2, level3] = article.categories || ['', '', ''];
        
        if (level1) {
            allCategories.level1.add(level1);
            
            if (!allCategories.level2.has(level1)) {
                allCategories.level2.set(level1, new Set());
            }
            
            if (level2) {
                allCategories.level2.get(level1).add(level2);
                const key = `${level1}|${level2}`;
                
                if (!allCategories.level3.has(key)) {
                    allCategories.level3.set(key, new Set());
                }
                
                if (level3) {
                    allCategories.level3.get(key).add(level3);
                }
            }
        }
    });
    
    // 填充一级分类下拉框
    const level1Select = document.getElementById('category-level-1');
    // 清空现有选项（保留默认选项）
    while (level1Select.options.length > 1) {
        level1Select.remove(1);
    }
    
    allCategories.level1.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        level1Select.appendChild(option);
    });
    
    // 绑定事件监听器（确保只绑定一次）
    if (!level1Select.dataset.listener) {
        level1Select.addEventListener('change', updateLevel2Categories);
        document.getElementById('category-level-2').addEventListener('change', updateLevel3Categories);
        document.getElementById('reset-filter').addEventListener('click', resetFilters);
        document.getElementById('search-btn').addEventListener('click', performSearch);
        
        // 回车触发搜索
        document.getElementById('article-search').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
        level1Select.dataset.listener = 'true';
    }
}

// 更新二级分类下拉框
function updateLevel2Categories() {
    const level1 = document.getElementById('category-level-1').value;
    const level2Select = document.getElementById('category-level-2');
    const level3Select = document.getElementById('category-level-3');
    
    level2Select.innerHTML = '<option value="">二级分类</option>';
    level3Select.innerHTML = '<option value="">三级分类</option>';
    
    if (level1 && allCategories.level2.has(level1)) {
        allCategories.level2.get(level1).forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            level2Select.appendChild(option);
        });
    }
    
    filterArticles();
}

// 更新三级分类下拉框
function updateLevel3Categories() {
    const level1 = document.getElementById('category-level-1').value;
    const level2 = document.getElementById('category-level-2').value;
    const level3Select = document.getElementById('category-level-3');
    
    level3Select.innerHTML = '<option value="">三级分类</option>';
    
    if (level1 && level2) {
        const key = `${level1}|${level2}`;
        if (allCategories.level3.has(key)) {
            allCategories.level3.get(key).forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                level3Select.appendChild(option);
            });
        }
    }
    
    filterArticles();
}

// 执行搜索
function performSearch() {
    filterArticles();
}

// 重置筛选条件
function resetFilters() {
    document.getElementById('article-search').value = '';
    document.getElementById('category-level-1').value = '';
    document.getElementById('category-level-2').innerHTML = '<option value="">二级分类</option>';
    document.getElementById('category-level-3').innerHTML = '<option value="">三级分类</option>';
    filterArticles();
}

// 筛选文章
function filterArticles() {
    const searchTerm = document.getElementById('article-search').value.toLowerCase().trim();
    const level1 = document.getElementById('category-level-1').value;
    const level2 = document.getElementById('category-level-2').value;
    const level3 = document.getElementById('category-level-3').value;
    
    const filteredArticles = allArticles.filter(article => {
        const [artLevel1, artLevel2, artLevel3] = article.categories || ['', '', ''];
        
        const matchCategory = 
            (level1 === '' || artLevel1 === level1) &&
            (level2 === '' || artLevel2 === level2) &&
            (level3 === '' || artLevel3 === level3);
        
        const matchSearch = searchTerm === '' || 
            (article.artiTitle && article.artiTitle.toLowerCase().includes(searchTerm)) ||
            (article.excerpt && article.excerpt.toLowerCase().includes(searchTerm)) ||
            (article.tag && article.tag.toLowerCase().includes(searchTerm));
        
        return matchCategory && matchSearch;
    });
    
    renderArticles(filteredArticles);
}

// 渲染文章列表
function renderArticles(articles) {
    const articlesContainer = document.getElementById('all-articles');
    articlesContainer.innerHTML = '';
    
    if (articles.length === 0) {
        articlesContainer.innerHTML = `
            <div class="error">
                <i class="fa fa-search"></i>
                <p>没有找到匹配的文章</p>
                <p style="font-size: 0.8rem; margin-top: 1rem;">
                    <button onclick="loadArticles(true)" style="padding: 5px 10px; margin: 5px;">刷新内容</button>
                </p>
            </div>
        `;
        return;
    }
    
    articles.forEach(article => {
        const articleElement = document.createElement('article');
        articleElement.className = 'full-article-card';
        
        const title = article.artiTitle || '未命名文章';
        const date = article.date || '未知日期';
        const tag = article.tag || '未分类';
        const readTime = article.readTime || '5分钟';
        const excerpt = article.excerpt || '暂无摘要...';
        const id = article.id || article._id || Math.random().toString(36).substr(2, 9);
        
        const detailUrl = `article-detail.html?id=${encodeURIComponent(id)}`;
        
        articleElement.innerHTML = `
            <h2><a href="${detailUrl}">${title}</a></h2>
            <p class="article-meta">
                <span><i class="fa fa-calendar"></i> ${date}</span>
                <span><i class="fa fa-tag"></i> ${tag}</span>
                <span><i class="fa fa-clock-o"></i> ${readTime}</span>
            </p>
            <p>${excerpt}</p>
            <a href="${detailUrl}" class="read-more">继续阅读 <i class="fa fa-angle-right"></i></a>
        `;
        articlesContainer.appendChild(articleElement);
    });
}

// 完成下拉刷新
function finishRefresh() {
    const refreshEl = document.getElementById('pull-refresh');
    refreshEl.classList.remove('refreshing', 'success');
    refreshEl.classList.add('active');
    
    // 短暂显示成功状态后收起
    setTimeout(() => {
        refreshEl.style.transform = 'scaleY(0)';
        isRefreshing = false;
    }, 500);
}

// 加载文章数据 - 直接使用Gitee仓库
function loadArticles(forceRefresh = false, fromPullRefresh = false) {
    // 显示加载状态
    const articlesContainer = document.getElementById('all-articles');
    articlesContainer.innerHTML = `
        <div class="loading">
            <i class="fa fa-circle-o-notch fa-spin fa-3x"></i>
            <p>正在加载文章...</p>
        </div>
    `;

    // 如果不是强制刷新，先检查缓存
    if (!forceRefresh) {
        const cachedData = getFromCache();
        if (cachedData) {
            console.log('使用缓存数据加载文章');
            allArticles = cachedData;
            initCategories(allArticles);
            filterArticles();
            
            // 如果是下拉刷新触发的，需要完成刷新流程
            if (fromPullRefresh) {
                finishRefresh();
            }
            return;
        }
    } else {
        // 强制刷新时清除缓存
        clearCache();
    }

    // Gitee仓库中data目录下的articles.json路径
    const giteeRawUrl = 'https://frp-boy.com:52171/api/data/articles';
    
    // 直接使用Gitee原始文件URL获取数据
    fetch(giteeRawUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }
            return response.json();
        })
        .then(articles => {
            if (!Array.isArray(articles)) {
                throw new Error('文章数据格式错误，预期为数组');
            }
            
            allArticles = articles;
            // 保存到缓存
            saveToCache(articles);
            initCategories(allArticles);
            filterArticles();
            
            // 如果是下拉刷新触发的，完成刷新流程
            if (fromPullRefresh) {
                finishRefresh();
            }
        })
        .catch(error => {
            console.error('加载文章失败:', error);
            articlesContainer.innerHTML = `
                <div class="error">
                    <i class="fa fa-exclamation-triangle"></i>
                    <p>加载文章失败: ${error.message}</p>
                    <p style="font-size: 0.8rem; margin-top: 1rem;">
                        <button onclick="loadArticles(true)" style="padding: 5px 10px; margin: 5px;">重试</button>
                    </p>
                </div>
            `;
            
            // 如果是下拉刷新触发的，即使失败也完成刷新流程
            if (fromPullRefresh) {
                finishRefresh();
            }
        });
}

// 初始化下拉刷新
function initPullRefresh() {
    const refreshEl = document.getElementById('pull-refresh');
    const container = document.querySelector('.page-content');
    
    // 触摸开始
    container.addEventListener('touchstart', (e) => {
        // 只有在页面顶部且不在刷新中时才允许下拉
        if (window.scrollY <= 0 && !isRefreshing) {
            startY = e.touches[0].clientY;
            isDragging = true;
        }
    }, { passive: true });
    
    // 触摸移动
    container.addEventListener('touchmove', (e) => {
        if (isDragging && !isRefreshing) {
            moveY = e.touches[0].clientY;
            currentY = moveY - startY;
            
            // 只处理下拉动作
            if (currentY > 0) {
                e.preventDefault();
                
                // 限制最大下拉距离
                const pullDistance = Math.min(currentY, 100);
                // 计算缩放比例，增强视觉效果
                const scale = Math.min(pullDistance / REFRESH_THRESHOLD, 1.2);
                
                // 更新刷新区域样式
                refreshEl.style.transform = `scaleY(${scale})`;
                refreshEl.classList.add('active');
                
                // 达到刷新阈值时改变提示文本
                if (pullDistance >= REFRESH_THRESHOLD) {
                    refreshEl.querySelector('.refresh-text').textContent = '松开立即刷新';
                    refreshEl.querySelector('.refresh-icon i').className = 'fa fa-refresh';
                } else {
                    refreshEl.querySelector('.refresh-text').textContent = '下拉可以刷新';
                    refreshEl.querySelector('.refresh-icon i').className = 'fa fa-arrow-down';
                }
            }
        }
    }, { passive: false });
    
    // 触摸结束
    container.addEventListener('touchend', () => {
        if (isDragging && !isRefreshing) {
            isDragging = false;
            
            // 检查是否达到刷新阈值
            if (currentY >= REFRESH_THRESHOLD) {
                // 触发刷新
                isRefreshing = true;
                refreshEl.classList.add('refreshing');
                refreshEl.querySelector('.refresh-text').textContent = '正在刷新...';
                refreshEl.querySelector('.refresh-icon i').className = 'fa fa-circle-o-notch fa-spin';
                
                // 强制刷新数据，不使用缓存
                loadArticles(true, true);
            } else {
                // 未达到阈值，收起刷新区域
                refreshEl.style.transform = 'scaleY(0)';
                setTimeout(() => {
                    refreshEl.classList.remove('active');
                }, 300);
            }
            
            currentY = 0;
        }
    }, { passive: true });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化下拉刷新
    initPullRefresh();
    
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
    
    // 加载文章数据
    loadArticles();
});