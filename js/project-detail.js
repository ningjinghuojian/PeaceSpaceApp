// 下拉刷新相关变量
let startY = 0;
let moveY = 0;
let currentY = 0;
let isPulling = false;
let isRefreshing = false;
const pullThreshold = 60; // 触发刷新的阈值

// 返回上一页功能
function goBack() {
    // 尝试返回历史记录
    if (window.history.length > 1) {
        window.history.back();
    } else {
        // 如果没有历史记录，默认返回项目列表页
        const isInPagesDir = window.location.pathname.includes('pages/');
        const targetPath = isInPagesDir ? 'projects.html' : 'pages/projects.html';
        window.location.href = targetPath;
    }
}

// 获取URL中的项目ID参数
function getProjectId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// 显示错误信息
function showError(message) {
    console.error('加载失败:', message);
    document.querySelector('.loading').style.display = 'none';
    document.getElementById('project-content').style.display = 'none';
    document.querySelector('.error').style.display = 'block';
    document.getElementById('error-message').textContent = message;
}

// 生成技术栈标签
function generateTechStack(techStack) {
    const container = document.getElementById('project-tech-stack');
    container.innerHTML = '';
    techStack.forEach(tech => {
        const tag = document.createElement('span');
        tag.className = 'tech-tag';
        tag.textContent = tech;
        container.appendChild(tag);
    });
}

// 生成项目链接
function generateProjectLinks(project) {
    const container = document.getElementById('project-links');
    container.innerHTML = '';
    
    // 项目详情链接
    if (project.link) {
        const detailLink = document.createElement('a');
        detailLink.href = project.link;
        detailLink.className = 'project-link-btn';
        detailLink.innerHTML = '<i class="fa fa-external-link"></i> 项目地址';
        container.appendChild(detailLink);
    }
    
    // GitHub链接
    if (project.github) {
        const githubLink = document.createElement('a');
        githubLink.href = project.github;
        githubLink.target = '_blank';
        githubLink.className = 'project-link-btn secondary';
        githubLink.innerHTML = '<i class="fa fa-github"></i> 源码仓库';
        container.appendChild(githubLink);
    }
}

// 生成图片画廊
function generateGallery(images) {
    const mainImage = document.getElementById('main-gallery-image');
    const thumbContainer = document.getElementById('gallery-thumbs');
    
    // 设置主图
    if (images && images.length > 0) {
        mainImage.src = images[0];
        mainImage.alt = '项目图片';
        
        // 生成缩略图
        images.forEach((img, index) => {
            const thumb = document.createElement('img');
            thumb.src = img;
            thumb.alt = `项目图片 ${index + 1}`;
            thumb.className = `gallery-thumb ${index === 0 ? 'active' : ''}`;
            thumb.addEventListener('click', () => {
                mainImage.src = img;
                // 更新激活状态
                document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            });
            thumbContainer.appendChild(thumb);
        });
    } else {
        // 如果没有图片，隐藏画廊
        document.querySelector('.project-gallery').style.display = 'none';
    }
}

// 生成功能模块
function generateFeatures(features) {
    const container = document.getElementById('project-features');
    container.innerHTML = '';
    
    if (!features || features.length === 0) {
        container.innerHTML = '<p>暂无功能模块信息</p>';
        return;
    }
    
    features.forEach(feature => {
        const card = document.createElement('div');
        card.className = 'feature-card';
        card.innerHTML = `
            <i class="fa fa-cube"></i>
            <h3>${feature}</h3>
        `;
        container.appendChild(card);
    });
}

// 生成项目贡献图 - 根据每天发布的日志数量判断贡献等级
function generateContributionChart(project, developmentLogs) {
    // 基于开发日志日期生成贡献数据
    const baseDate = new Date(project.date || new Date());
    const year = baseDate.getFullYear();
    
    // 添加年份选择器
    const yearSelect = document.getElementById('projectYearSelect');
    yearSelect.innerHTML = '';
    // 添加当前年份和前后各一年
    for (let y = year - 1; y <= year + 1; y++) {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y;
        if (y === year) {
            option.selected = true;
        }
        yearSelect.appendChild(option);
    }
    
    // 月份选择器
    const monthSelect = document.getElementById('projectMonthSelect');
    
    // 当选择年份或月份变化时重新渲染
    function handleFilterChange() {
        renderCalendar(parseInt(yearSelect.value), monthSelect.value !== 'all' ? parseInt(monthSelect.value) : null);
    }
    
    yearSelect.addEventListener('change', handleFilterChange);
    monthSelect.addEventListener('change', handleFilterChange);
    
    // 生成贡献数据 - 核心修改：根据每天的日志数量计算贡献等级
    function generateContributions(selectedYear, selectedMonth) {
        const contributions = {};
        
        // 处理开发日志的日期，统计每天的发布数量
        if (!developmentLogs || developmentLogs.length === 0) {
            return contributions;
        }
        
        developmentLogs.forEach(log => {
            if (!log.date) return;
            
            const logDate = new Date(log.date);
            // 检查日志是否在选定的年月范围内
            if (logDate.getFullYear() === selectedYear && 
                (!selectedMonth || logDate.getMonth() === selectedMonth)) {
                // 使用年月日作为唯一标识
                const dateStr = logDate.toISOString().split('T')[0];
                // 累加同一天的日志数量
                contributions[dateStr] = (contributions[dateStr] || 0) + 1;
            }
        });
        
        // 根据每天的日志数量确定贡献等级
        // 等级规则：0=0篇, 1=1篇, 2=2篇, 3=3篇, 4=4篇及以上
        Object.keys(contributions).forEach(date => {
            contributions[date] = Math.min(4, contributions[date]);
        });
        
        return contributions;
    }
    
    // 渲染日历（周横向排列）
    function renderCalendar(year, month = null) {
        const contributions = generateContributions(year, month);
        const calendar = document.getElementById('projectCalendar');
        const monthLabels = document.getElementById('projectMonthLabels');
        const stats = document.getElementById('projectStats');
        
        // 清空容器
        calendar.innerHTML = '';
        monthLabels.innerHTML = '';
        
        // 创建星期标签（只显示一、三、五）
        const weekdays = document.createElement('div');
        weekdays.className = 'weekdays-header';
        const weekdayLabels = ['一', '', '三', '', '五', '', '日'];
        weekdayLabels.forEach(day => {
            const weekday = document.createElement('div');
            weekday.className = 'weekday-header';
            weekday.textContent = day;
            weekdays.appendChild(weekday);
        });
        calendar.appendChild(weekdays);
        
        // 创建周容器（横向排列）
        const weeksContainer = document.createElement('div');
        weeksContainer.className = 'weeks-horizontal';
        
        // 计算开始和结束日期
        let startDate, endDate;
        
        if (month !== null) {
            // 如果指定了月份，只显示该月
            startDate = new Date(year, month, 1);
            endDate = new Date(year, month + 1, 0);
        } else {
            // 否则显示全年
            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 11, 31);
        }
        
        // 计算第一天是星期几（周一为0）
        let firstDayOfWeek = startDate.getDay();
        firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
        
        // 计算总天数
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const totalWeeks = Math.ceil((firstDayOfWeek + totalDays) / 7);
        
        // 记录月份位置用于标签显示
        const monthPositions = {};
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', 
                           '7月', '8月', '9月', '10月', '11月', '12月'];
        
        // 计算总贡献次数和总贡献天数
        let totalContributions = 0;
        const contributionDays = Object.keys(contributions).length;
        Object.values(contributions).forEach(count => {
            totalContributions += count;
        });
        
        // 更新统计信息，显示每天的日志数量
        stats.innerHTML = `
            <p>总日志数量: ${totalContributions}</p>
            <p>有贡献的天数: ${contributionDays}</p>
            <div class="legend">
                <div class="legend-item">
                    <div class="legend-color level-0"></div>
                    <span>0篇日志</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color level-1"></div>
                    <span>1篇日志</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color level-2"></div>
                    <span>2篇日志</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color level-3"></div>
                    <span>3篇日志</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color level-4"></div>
                    <span>4篇及以上</span>
                </div>
            </div>
        `;
        
        // 生成日历格子（周横向排列）
        let dayCounter = 0;
        for (let week = 0; week < totalWeeks; week++) {
            const weekColumn = document.createElement('div');
            weekColumn.className = 'week-column';
            
            for (let day = 0; day < 7; day++) {
                // 计算当前是月中的第几天
                const currentDayIndex = week * 7 + day - firstDayOfWeek;
                
                // 只处理在范围内的日期
                if (currentDayIndex >= 0 && currentDayIndex < totalDays) {
                    const currentDate = new Date(startDate);
                    currentDate.setDate(startDate.getDate() + currentDayIndex);
                    const dateStr = currentDate.toISOString().split('T')[0];
                    const logCount = contributions[dateStr] || 0;
                    const level = logCount; // 等级直接对应日志数量（已在generateContributions中限制为0-4）
                    
                    // 记录每月第一天所在的周位置
                    if (currentDate.getDate() === 1) {
                        const month = currentDate.getMonth();
                        monthPositions[month] = week;
                    }
                    
                    const dayCell = document.createElement('div');
                    dayCell.className = `day-cell level-${level}`;
                    dayCell.title = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}: ${logCount}篇日志`;
                    weekColumn.appendChild(dayCell);
                    
                    dayCounter++;
                } else {
                    // 空白格子（月份前后的填充）
                    const emptyCell = document.createElement('div');
                    emptyCell.className = 'day-cell empty';
                    weekColumn.appendChild(emptyCell);
                }
            }
            
            weeksContainer.appendChild(weekColumn);
        }
        
        calendar.appendChild(weeksContainer);
        
        // 添加月份标签
        if (month === null) { // 全年视图才显示月份标签
            const monthLabelContainer = document.createElement('div');
            monthLabelContainer.className = 'month-label-container';
            
            Object.keys(monthPositions).forEach(month => {
                const label = document.createElement('div');
                label.className = 'month-label';
                label.style.left = `${(monthPositions[month] * (10 + 8)) + 5}px`; // 10是格子宽度，8是间距
                label.textContent = monthNames[month];
                monthLabelContainer.appendChild(label);
            });
            
            monthLabels.appendChild(monthLabelContainer);
        }
    }
    
    // 初始渲染
    renderCalendar(year);
}

// 从Gitee获取项目数据
async function fetchProjectsFromGitee() {
    try {
        // 使用Gitee的raw文件链接
        const response = await fetch('https://frp-boy.com:52171/api/data/projects');
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('从Gitee获取项目数据失败:', error);
        throw error;
    }
}

// 从Gitee获取文章数据
async function fetchArticlesFromGitee() {
    try {
        // 使用Gitee的raw文件链接
        const response = await fetch('https://frp-boy.com:52171/api/data/articles');
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('从Gitee获取文章数据失败:', error);
        throw error;
    }
}

// 加载并显示开发日志
async function loadDevelopmentLogs(projectTag) {
    const logsContainer = document.getElementById('logs-container');
    
    try {
        // 从Gitee获取文章数据
        const articles = await fetchArticlesFromGitee();
        
        // 筛选与项目tag匹配的文章
        const matchedLogs = articles.filter(article => 
            article.tag && article.tag.toLowerCase() === projectTag.toLowerCase()
        );
        
        // 按日期排序，最新的在前
        const sortedLogs = matchedLogs.sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        // 清空加载提示
        logsContainer.innerHTML = '';
        
        if (sortedLogs.length === 0) {
            logsContainer.innerHTML = '<div class="no-logs">暂无相关开发日志</div>';
            return;
        }
        
        // 创建日志列表
        const logsList = document.createElement('div');
        logsList.className = 'logs-list';
        
        sortedLogs.forEach(log => {
            const logItem = document.createElement('div');
            logItem.className = 'log-item';
            // 使用Font Awesome 4.7.0兼容的图标类
            logItem.innerHTML = `
                <h3><a href="${log.link}" target="_blank">${log.artiTitle}</a></h3>
                <p class="log-date"><i class="fa fa-calendar"></i> ${log.date}</p>
                <p class="log-excerpt">${log.excerpt}</p>
                <a href="${log.link}" class="read-more" target="_blank">阅读全文 <i class="fa fa-arrow-right"></i></a>
            `;
            logsList.appendChild(logItem);
        });
        
        logsContainer.appendChild(logsList);
        
    } catch (error) {
        console.error('加载开发日志出错:', error);
        logsContainer.innerHTML = '<div class="error">加载日志失败，请稍后重试</div>';
    }
}

// 获取相关文章数据
async function getRelatedArticles(projectTag) {
    try {
        // 从Gitee获取文章数据
        const articles = await fetchArticlesFromGitee();
        // 筛选与项目标签相关的文章
        return articles.filter(article => article.tag && article.tag.includes(projectTag));
    } catch (error) {
        console.error('加载相关文章出错:', error);
        return [];
    }
}

// 加载项目详情
async function loadProjectDetail(forceRefresh = false) {
    const projectId = getProjectId();
    if (!projectId) {
        showError('未找到项目ID');
        return;
    }
    
    try {
        // 显示加载状态
        document.querySelector('.loading').style.display = 'block';
        document.getElementById('project-content').style.display = 'none';
        document.querySelector('.error').style.display = 'none';
        
        // 从Gitee获取项目数据
        const projects = await fetchProjectsFromGitee();
        const project = projects.find(p => p.id.toString() === projectId.toString());
        
        if (!project) {
            showError('未找到对应的项目');
            return;
        }
        
        // 隐藏加载状态，显示项目内容
        document.querySelector('.loading').style.display = 'none';
        document.getElementById('project-content').style.display = 'block';
        
        // 填充项目数据
        document.getElementById('project-title').textContent = project.title || '未命名项目';
        document.getElementById('project-category').textContent = project.category || '未分类';
        document.getElementById('project-duration').textContent = project.duration || '未知周期';
        document.getElementById('project-status').textContent = project.status || '未知状态';
        document.getElementById('project-description').textContent = project.description || '暂无描述';
        document.getElementById('project-challenges').textContent = project.challenges || '暂无挑战与解决方案信息';
        
        // 生成技术栈标签
        generateTechStack(project.techStack || []);
        
        // 生成项目链接
        generateProjectLinks(project);
        
        // 生成图片画廊
        generateGallery(project.images || []);
        
        // 生成功能模块
        generateFeatures(project.features || []);
        
        // 加载开发日志
        const relatedLogs = await getRelatedArticles(project.tag || '');
        loadDevelopmentLogs(project.tag || '');
        
        // 生成贡献图（基于每天的日志数量）
        generateContributionChart(project, relatedLogs);
        
    } catch (error) {
        showError(error.message || '加载项目时发生未知错误');
    } finally {
        // 刷新完成后重置下拉刷新状态
        finishRefresh();
    }
}

// 初始化下拉刷新
function initPullRefresh() {
    const pullRefreshEl = document.querySelector('.pull-refresh');
    const contentEl = document.getElementById('page-content');
    const refreshIcon = pullRefreshEl.querySelector('.refresh-icon');
    const refreshText = pullRefreshEl.querySelector('.refresh-text');
    const loadingRefresh = pullRefreshEl.querySelector('.loading-refresh');
    
    // 触摸开始
    contentEl.addEventListener('touchstart', (e) => {
        if (isRefreshing) return;
        
        // 只有在页面顶部时才允许下拉刷新
        if (window.scrollY <= 0) {
            startY = e.touches[0].clientY;
            isPulling = true;
        }
    }, { passive: true });
    
    // 触摸移动
    contentEl.addEventListener('touchmove', (e) => {
        if (!isPulling || isRefreshing) return;
        
        moveY = e.touches[0].clientY;
        currentY = moveY - startY;
        
        // 只处理向下拉的情况
        if (currentY > 0) {
            e.preventDefault();
            
            // 更新UI
            const pullRatio = Math.min(currentY / pullThreshold, 1.5);
            pullRefreshEl.classList.add('active');
            contentEl.classList.add('pulled');
            
            // 根据下拉距离更新样式
            if (currentY >= pullThreshold) {
                pullRefreshEl.classList.add('pulling');
                refreshText.textContent = '释放刷新';
            } else {
                pullRefreshEl.classList.remove('pulling');
                refreshText.textContent = '下拉刷新';
            }
            
            // 下拉动画效果
            pullRefreshEl.style.transform = `translateY(0)`;
            contentEl.style.transform = `translateY(${currentY}px)`;
        }
    }, { passive: false });
    
    // 触摸结束
    contentEl.addEventListener('touchend', () => {
        if (!isPulling || isRefreshing) {
            resetPullState();
            return;
        }
        
        // 判断是否达到刷新阈值
        if (currentY >= pullThreshold) {
            startRefresh();
        } else {
            resetPullState();
        }
        
        isPulling = false;
    });
    
    // 鼠标事件支持（桌面端）
    contentEl.addEventListener('mousedown', (e) => {
        if (isRefreshing) return;
        
        if (window.scrollY <= 0) {
            startY = e.clientY;
            isPulling = true;
        }
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isPulling || isRefreshing) return;
        
        moveY = e.clientY;
        currentY = moveY - startY;
        
        if (currentY > 0) {
            // 更新UI
            const pullRatio = Math.min(currentY / pullThreshold, 1.5);
            pullRefreshEl.classList.add('active');
            contentEl.classList.add('pulled');
            
            if (currentY >= pullThreshold) {
                pullRefreshEl.classList.add('pulling');
                refreshText.textContent = '释放刷新';
            } else {
                pullRefreshEl.classList.remove('pulling');
                refreshText.textContent = '下拉刷新';
            }
            
            pullRefreshEl.style.transform = `translateY(0)`;
            contentEl.style.transform = `translateY(${currentY}px)`;
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (!isPulling || isRefreshing) {
            resetPullState();
            return;
        }
        
        if (currentY >= pullThreshold) {
            startRefresh();
        } else {
            resetPullState();
        }
        
        isPulling = false;
    });
    
    // 重置下拉状态
    function resetPullState() {
        pullRefreshEl.classList.remove('active', 'pulling');
        contentEl.classList.remove('pulled');
        refreshText.textContent = '下拉刷新';
        pullRefreshEl.style.transform = `translateY(-100%)`;
        contentEl.style.transform = `translateY(0)`;
        currentY = 0;
    }
    
    // 开始刷新
    function startRefresh() {
        isRefreshing = true;
        pullRefreshEl.classList.add('active');
        contentEl.classList.add('pulled');
        refreshIcon.style.display = 'none';
        refreshText.style.display = 'none';
        loadingRefresh.style.display = 'flex';
        contentEl.style.transform = `translateY(50px)`;
        
        // 执行刷新操作
        loadProjectDetail(true);
    }
    
    // 完成刷新
    window.finishRefresh = function() {
        isRefreshing = false;
        refreshIcon.style.display = 'block';
        refreshText.style.display = 'block';
        loadingRefresh.style.display = 'none';
        
        // 延迟重置UI，让用户看到刷新完成的状态
        setTimeout(() => {
            resetPullState();
        }, 500);
    };
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    loadProjectDetail();
    initPullRefresh();
});