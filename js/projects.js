// 基础API地址
const BASE_API_URL = 'https://frp-boy.com:52171';

// 存储所有项目数据
let allProjects = [];

// 缓存配置
const CACHE_KEY = 'projects_cache';
const CACHE_EXPIRE_TIME = 7 * 24 * 60 * 60 * 1000; // 7天过期时间

// 下拉刷新相关变量
let startY = 0;
let currentY = 0;
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

// 初始化下拉刷新事件
function initPullToRefresh() {
    const container = document.getElementById('page-content');
    const indicator = document.getElementById('refresh-indicator');
    const refreshText = document.getElementById('refresh-text');
    
    if (!container || !indicator || !refreshText) {
        console.error('下拉刷新所需元素不存在');
        return;
    }
    
    // 触摸事件监听
    container.addEventListener('touchstart', handleTouchStart, false);
    container.addEventListener('touchmove', handleTouchMove, false);
    container.addEventListener('touchend', handleTouchEnd, false);
    
    // 鼠标事件监听（用于桌面设备调试）
    container.addEventListener('mousedown', handleMouseDown, false);
    document.addEventListener('mousemove', handleMouseMove, false);
    document.addEventListener('mouseup', handleMouseUp, false);
    
    function handleTouchStart(e) {
        if (isRefreshing) return;
        
        // 只在页面顶部时才允许下拉刷新
        if (window.scrollY <= 0) {
            startY = e.touches[0].clientY;
            isDragging = true;
        }
    }
    
    function handleTouchMove(e) {
        if (!isDragging || isRefreshing) return;
        
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        
        if (diff > 0) {
            // 阻止页面滚动
            e.preventDefault();
            
            // 限制最大下拉距离
            const pullDistance = Math.min(diff, 120);
            
            // 计算下拉比例，用于动画效果
            const ratio = Math.min(pullDistance / REFRESH_THRESHOLD, 1);
            
            // 更新UI
            container.style.transform = `translateY(${pullDistance}px)`;
            indicator.style.transform = `translateY(0)`;
            
            // 当达到刷新阈值时改变提示文本
            if (pullDistance >= REFRESH_THRESHOLD) {
                refreshText.textContent = '松开刷新';
                indicator.classList.add('pulling');
            } else {
                refreshText.textContent = '下拉刷新';
                indicator.classList.remove('pulling');
            }
        }
    }
    
    function handleTouchEnd() {
        if (!isDragging || isRefreshing) {
            isDragging = false;
            return;
        }
        
        const diff = currentY - startY;
        isDragging = false;
        
        // 检查是否达到刷新阈值
        if (diff >= REFRESH_THRESHOLD) {
            // 触发刷新
            startRefresh();
        } else {
            // 未达到阈值，回弹
            resetPullState();
        }
    }
    
    // 鼠标事件处理（用于桌面调试）
    function handleMouseDown(e) {
        if (isRefreshing) return;
        
        if (window.scrollY <= 0) {
            startY = e.clientY;
            isDragging = true;
        }
    }
    
    function handleMouseMove(e) {
        if (!isDragging || isRefreshing) return;
        
        currentY = e.clientY;
        const diff = currentY - startY;
        
        if (diff > 0) {
            e.preventDefault();
            
            const pullDistance = Math.min(diff, 120);
            const ratio = Math.min(pullDistance / REFRESH_THRESHOLD, 1);
            
            container.style.transform = `translateY(${pullDistance}px)`;
            indicator.style.transform = `translateY(0)`;
            
            if (pullDistance >= REFRESH_THRESHOLD) {
                refreshText.textContent = '松开刷新';
                indicator.classList.add('pulling');
            } else {
                refreshText.textContent = '下拉刷新';
                indicator.classList.remove('pulling');
            }
        }
    }
    
    function handleMouseUp() {
        if (!isDragging || isRefreshing) {
            isDragging = false;
            return;
        }
        
        const diff = currentY - startY;
        isDragging = false;
        
        if (diff >= REFRESH_THRESHOLD) {
            startRefresh();
        } else {
            resetPullState();
        }
    }
    
    // 开始刷新
    function startRefresh() {
        isRefreshing = true;
        indicator.classList.add('refreshing');
        indicator.classList.remove('pulling');
        refreshText.textContent = '刷新中...';
        container.style.transform = `translateY(50px)`;
        
        // 强制刷新数据
        loadProjects(true).then(() => {
            // 刷新完成后重置状态
            setTimeout(() => {
                resetPullState();
                isRefreshing = false;
                indicator.classList.remove('refreshing');
                refreshText.textContent = '下拉刷新';
            }, 800);
        }).catch(() => {
            // 刷新失败也重置状态
            setTimeout(() => {
                resetPullState();
                isRefreshing = false;
                indicator.classList.remove('refreshing');
                refreshText.textContent = '下拉刷新';
            }, 800);
        });
    }
    
    // 重置下拉状态
    function resetPullState() {
        container.style.transform = '';
        indicator.style.transform = 'translateY(-100%)';
        refreshText.textContent = '下拉刷新';
        indicator.classList.remove('pulling', 'refreshing');
    }
}

// 项目数据加载和渲染
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM内容加载完成，初始化项目页面...');
    
    // 初始化下拉刷新
    initPullToRefresh();
    
    // 底部导航交互
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // 首页按钮直接跳转，不添加active状态
            if (this.classList.contains('home-btn')) {
                return;
            }
            
            e.preventDefault();
            
            // 移除所有导航项的active类
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // 为当前点击的导航项添加active类
            this.classList.add('active');
            
            // 获取目标页面并跳转
            const targetPage = this.getAttribute('data-page');
            if (targetPage) {
                console.log(`切换到${targetPage}页面`);
                // 判断当前页面是否在 pages 目录下
                const isInPagesDir = window.location.pathname.includes('pages/');
                // 动态生成路径
                const targetPath = isInPagesDir 
                    ? `${targetPage}.html` 
                    : `pages/${targetPage}.html`;
                window.location.href = targetPath;
            }
        });
    });

    // 加载项目数据
    loadProjects();
    
    // 初始化筛选事件监听
    initFilterListeners();
});

// 初始化筛选事件监听
function initFilterListeners() {
    console.log('初始化筛选事件监听...');
    
    // 搜索按钮点击事件
    const searchBtn = document.getElementById('search-btn');
    const projectSearch = document.getElementById('project-search');
    const categoryFilter = document.getElementById('category-filter');
    const statusFilter = document.getElementById('status-filter');
    const resetFilter = document.getElementById('reset-filter');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', filterProjects);
    }
    
    // 搜索框回车事件
    if (projectSearch) {
        projectSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') filterProjects();
        });
    }
    
    // 分类筛选事件
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterProjects);
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', filterProjects);
    }
    
    // 重置筛选事件
    if (resetFilter) {
        resetFilter.addEventListener('click', resetFilters);
    }
}

// 加载项目数据 - 返回Promise以便下拉刷新使用
function loadProjects(forceRefresh = false) {
    console.log('开始加载项目数据...');
    
    const projectsContainer = document.getElementById('projects-container');
    if (projectsContainer) {
        projectsContainer.innerHTML = `
            <div class="loading">
                <i class="fa fa-circle-o-notch fa-spin fa-3x"></i>
                <p>加载中...</p>
            </div>
        `;
    }

    // 如果不是强制刷新，先检查缓存
    if (!forceRefresh) {
        const cachedData = getFromCache();
        if (cachedData) {
            console.log('使用缓存数据加载项目');
            window.allProjects = cachedData;
            renderProjects(cachedData);
            return Promise.resolve();
        }
    } else {
        // 强制刷新时清除缓存
        clearCache();
    }
    
    // 后端项目数据接口
    const projectsApiUrl = `${BASE_API_URL}/api/data/projects`;
    console.log('请求项目数据接口:', projectsApiUrl);
    
    // 返回Promise以便下拉刷新处理
    return fetch(projectsApiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }
            return response.json();
        })
        .then(projects => {
            console.log('成功加载项目数据:', projects);
            
            if (!Array.isArray(projects)) {
                throw new Error('项目数据格式错误，预期为数组');
            }
            
            // 保存到缓存
            saveToCache(projects);
            
            // 保存项目数据到全局变量
            window.allProjects = projects;
            renderProjects(projects);
            return Promise.resolve();
        })
        .catch(error => {
            console.error('加载项目数据失败:', error);
            const projectsContainer = document.getElementById('projects-container');
            if (projectsContainer) {
                projectsContainer.innerHTML = 
                    '<div class="error"><i class="fa fa-exclamation-circle"></i><p>加载项目数据失败</p><p>错误信息: ' + error.message + '</p><p>请检查网络连接或稍后重试</p><button onclick="loadProjects(true)" style="margin-top:10px;padding:5px 10px;">重试</button></div>';
            }
            return Promise.reject(error);
        });
}

// 筛选项目
function filterProjects() {
    if (!window.allProjects || !Array.isArray(window.allProjects)) {
        console.error('项目数据未加载或格式错误');
        return;
    }
    
    const searchTerm = document.getElementById('project-search').value.toLowerCase().trim();
    const category = document.getElementById('category-filter').value;
    const status = document.getElementById('status-filter').value;
    
    const filtered = window.allProjects.filter(project => {
        // 搜索词筛选
        const matchesSearch = searchTerm === '' || 
            (project.title && project.title.toLowerCase().includes(searchTerm)) ||
            (project.description && project.description.toLowerCase().includes(searchTerm)) ||
            (project.tag && project.tag.toLowerCase().includes(searchTerm));
        
        // 分类筛选
        const matchesCategory = category === '' || (project.category && project.category === category);
        
        // 状态筛选
        const matchesStatus = status === '' || (project.status && project.status === status);
        
        return matchesSearch && matchesCategory && matchesStatus;
    });
    
    renderProjects(filtered);
}

// 重置筛选条件
function resetFilters() {
    document.getElementById('project-search').value = '';
    document.getElementById('category-filter').value = '';
    document.getElementById('status-filter').value = '';
    filterProjects();
}

// 渲染项目列表
function renderProjects(projects) {
    const projectsContainer = document.getElementById('projects-container');
    
    // 安全检查
    if (!projectsContainer) {
        console.error('projects-container 元素未找到');
        return;
    }
    
    projectsContainer.innerHTML = '';
    
    // 检查项目数据
    if (!projects || !Array.isArray(projects)) {
        console.error('项目数据格式错误:', projects);
        projectsContainer.innerHTML = '<div class="error"><i class="fa fa-exclamation-circle"></i><p>项目数据格式错误</p><button onclick="loadProjects(true)" style="margin-top:10px;padding:5px 10px;">刷新</button></div>';
        return;
    }
    
    if (projects.length === 0) {
        projectsContainer.innerHTML = '<div class="error"><i class="fa fa-search"></i><p>没有找到匹配的项目</p><button onclick="resetFilters()" style="margin-top:10px;padding:5px 10px;">重置筛选</button></div>';
        return;
    }
    
    console.log('开始渲染项目，数量:', projects.length);
    
    // 安全地渲染每个项目
    projects.forEach((project, index) => {
        try {
            const projectCard = createProjectCard(project, index);
            if (projectCard) {
                projectsContainer.appendChild(projectCard);
            }
        } catch (error) {
            console.error(`渲染项目 ${index} 时出错:`, error);
        }
    });
}

// 解析图片路径获取API参数
function parseImagePath(imagePath) {
    // 默认参数
    const defaultParams = {
        imagesType: 'projects',
        id: `${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2,'0')}${new Date().getDate().toString().padStart(2,'0')}01`,
        title: '默认图片'
    };
    
    // 检查路径是否有效
    if (!imagePath || typeof imagePath !== 'string' || !imagePath.startsWith('/images/')) {
        console.warn('无效的图片路径，使用默认参数:', imagePath);
        return defaultParams;
    }
    
    try {
        // 移除开头的/images/
        const pathWithoutRoot = imagePath.replace(/^\/images\//, '');
        // 分割路径部分
        const pathParts = pathWithoutRoot.split('/');
        
        // 路径格式应为: [imagesType]/[id]/[title].webp
        if (pathParts.length >= 3) {
            const imagesType = pathParts[0];
            const id = pathParts[1];
            // 拼接剩余部分作为标题（处理可能包含/的标题）
            const fileNameWithExt = pathParts.slice(2).join('/');
            // 移除.webp扩展名
            const title = fileNameWithExt.replace(/\.webp$/i, '');
            
            // 验证imagesType是否有效
            if (!['projects', 'articles'].includes(imagesType)) {
                console.warn('无效的imagesType:', imagesType);
                return defaultParams;
            }
            
            return { imagesType, id, title };
        } else {
            console.warn('图片路径格式不正确:', imagePath);
            return defaultParams;
        }
    } catch (error) {
        console.error('解析图片路径出错:', error);
        return defaultParams;
    }
}

// 创建项目卡片
function createProjectCard(project, index) {
    const projectCard = document.createElement('div');
    projectCard.className = 'project-card';
    projectCard.setAttribute('data-category', project.category || '');
    projectCard.setAttribute('data-status', project.status || '');
    projectCard.setAttribute('data-tag', project.tag || '');
    
    // 解析图片路径获取API参数（核心修改）
    const { imagesType, id, title: imageTitle } = parseImagePath(project.image);
    
    // 构造图片API请求URL
    const imageApiUrl = `${BASE_API_URL}/api/images/${imagesType}/${id}?title=${encodeURIComponent(imageTitle)}`;
    console.log('构造的图片请求URL:', imageApiUrl);
    
    // 安全地处理所有属性
    const safeProject = {
        id: project.id || id, // 使用解析出的id作为项目id
        title: project.title || '未命名项目',
        category: project.category || '未分类',
        status: project.status || '未知状态',
        tag: project.tag || '',
        date: project.date || '未知日期',
        duration: project.duration || '未知周期',
        image: imageApiUrl, // 使用API URL作为图片源
        description: project.description || '暂无描述',
        techStack: Array.isArray(project.techStack) ? project.techStack : [],
        features: Array.isArray(project.features) ? project.features : [],
        link: `project-detail.html?id=${encodeURIComponent(project.id || id)}`,
        github: project.github || '',
        challenges: project.challenges || ''
    };
    
    // 处理GitHub链接（为空时不显示）
    const githubLink = safeProject.github 
        ? `<a href="${safeProject.github}" target="_blank" class="github-link" aria-label="GitHub仓库">
            <i class="fa fa-github"></i> 源码
        </a>` 
        : '';
    
    // 处理技术栈标签
    const techStackTags = safeProject.techStack.length > 0 
        ? safeProject.techStack.map(tech => 
            `<span class="tech-tag">${tech}</span>`
        ).join('')
        : '<span class="tech-tag">暂无技术栈信息</span>';
    
    // 处理项目特点
    const featuresList = safeProject.features.length > 0
        ? safeProject.features.map(feature => 
            `<div class="feature-item"><i class="fa fa-check"></i>${feature}</div>`
        ).join('')
        : '<div class="feature-item">暂无特点描述</div>';
    
    // 图片加载失败兜底
    const imgOnError = `this.onerror=null;this.src='https://picsum.photos/seed/project/600/400';`;
    
    projectCard.innerHTML = `
        <div class="project-img-container">
            <img src="${safeProject.image}" alt="${safeProject.title}" class="project-img" onerror="${imgOnError}">
            <span class="project-status">${safeProject.status}</span>
            ${safeProject.tag ? `<span class="project-tag">${safeProject.tag}</span>` : ''}
        </div>
        <div class="project-content">
            <h3><a href="${safeProject.link}">${safeProject.title}</a></h3>
            <div class="project-meta">
                <span><i class="fa fa-calendar"></i> ${safeProject.date}</span>
                <span><i class="fa fa-folder"></i> ${safeProject.category}</span>
                <span><i class="fa fa-clock-o"></i> ${safeProject.duration}</span>
            </div>
            <div class="tech-stack">
                ${techStackTags}
            </div>
            <p>${safeProject.description}</p>
            <div class="project-features">
                <h4>项目特点：</h4>
                <div class="features-list">
                    ${featuresList}
                </div>
            </div>
            <div class="project-actions">
                <a href="${safeProject.link}" class="detail-link">查看详情 <i class="fa fa-arrow-right"></i></a>
                ${githubLink}
            </div>
        </div>
    `;
    
    return projectCard;
}

// 获取Markdown文件内容
function getMarkdownContent(markdownPath) {
    if (!markdownPath) return Promise.reject(new Error('Markdown路径不能为空'));
    
    // 通过后端API获取Markdown内容
    const mdApiUrl = `${BASE_API_URL}/api/articles?title=${encodeURIComponent(markdownPath)}`;
    console.log('获取Markdown内容，API路径:', mdApiUrl);
    
    return fetch(mdApiUrl)
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
