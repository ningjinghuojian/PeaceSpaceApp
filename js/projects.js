// 存储所有项目数据
let allProjects = [];

// 缓存配置
const CACHE_KEY = 'projects_cache';
const CACHE_EXPIRE_TIME = 7 * 24 * 60 * 60 * 1000; // 7天过期时间

// 从缓存获取数据
function getFromCache() {
    const cacheData = localStorage.getItem(CACHE_KEY);
    if (!cacheData) return null;
    
    try {
        const parsedData = JSON.parse(cacheData);
        // 检查缓存是否过期（如果需要永久缓存可移除时间检查）
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

// 项目数据加载和渲染
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM内容加载完成，初始化项目页面...');
    
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

// 加载项目数据 - 添加缓存和代理支持
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
            return;
        }
    } else {
        // 强制刷新时清除缓存
        clearCache();
    }
    
    // Gitee仓库数据路径
    const giteeRawUrl = 'https://gitee.com/peacerocket/PeaceSpace/raw/main/data/projects.json';
    console.log('请求Gitee数据路径:', giteeRawUrl);
    
    // CORS代理服务列表
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
            
            const projects = await response.json();
            console.log('成功加载项目数据:', projects);
            
            // 保存到缓存
            saveToCache(projects);
            
            // 保存项目数据到全局变量
            window.allProjects = projects;
            renderProjects(projects);
            
        } catch (error) {
            console.warn(`代理 ${proxyIndex + 1} 失败:`, error);
            
            // 尝试下一个代理
            if (proxyIndex < proxyServices.length - 1) {
                console.log('尝试下一个代理...');
                setTimeout(() => tryWithProxy(proxyIndex + 1), 1000);
            } else {
                // 所有代理都失败
                const projectsContainer = document.getElementById('projects-container');
                if (projectsContainer) {
                    projectsContainer.innerHTML = 
                        '<div class="error"><i class="fa fa-exclamation-circle"></i><p>从Gitee加载项目失败</p><p>错误信息: ' + error.message + '</p><p>请检查网络连接或稍后重试</p><button onclick="loadProjects(true)" style="margin-top:10px;padding:5px 10px;">重试</button></div>';
                }
            }
        }
    };
    
    // 开始尝试第一个代理
    tryWithProxy(0);
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

// 创建项目卡片
function createProjectCard(project, index) {
    const projectCard = document.createElement('div');
    projectCard.className = 'project-card';
    projectCard.setAttribute('data-category', project.category || '');
    projectCard.setAttribute('data-status', project.status || '');
    projectCard.setAttribute('data-tag', project.tag || '');
    
    // 安全地处理所有属性
    const safeProject = {
        id: project.id || index + 1,
        title: project.title || '未命名项目',
        category: project.category || '未分类',
        status: project.status || '未知状态',
        tag: project.tag || '',
        date: project.date || '未知日期',
        duration: project.duration || '未知周期',
        image: project.image || 'https://picsum.photos/seed/project/600/400',
        description: project.description || '暂无描述',
        techStack: Array.isArray(project.techStack) ? project.techStack : [],
        features: Array.isArray(project.features) ? project.features : [],
        link: 'project-detail.html?id=' + (project.id || index + 1), // 修改为同级页面并传递ID参数
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
    
    // 设置图片错误处理
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