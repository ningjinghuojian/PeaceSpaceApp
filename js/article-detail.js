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

// 加载文章详情 - 迁移到Gitee并使用代理
function loadArticleDetail() {
    // 重置状态
    document.querySelector('.loading').style.display = 'block';
    document.getElementById('article-content').style.display = 'none';
    document.querySelector('.error').style.display = 'none';
    
    const articleId = getArticleId();
    if (!articleId) {
        showError('未找到文章ID参数');
        return;
    }
    
    // Gitee仓库中的文章数据JSON路径（迁移修改）
    const giteeArticlesUrl = 'https://gitee.com/peacerocket/PeaceSpace/raw/main/data/articles.json';
    
    // CORS代理服务列表（与videos.js保持一致）
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
            const proxyUrl = proxyServices[proxyIndex] + encodeURIComponent(giteeArticlesUrl);
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
            
            // 生成安全的文件名
            const safeFilename = getSafeFilename(article.title || article.artiTitle || 'untitled');
            // Gitee仓库中的Markdown文件路径（迁移修改）
            const mdFileUrl = `https://gitee.com/peacerocket/PeaceSpace/raw/main/articles/${safeFilename}.md`;
            
            // 加载Markdown内容
            const mdProxyUrl = proxyServices[proxyIndex] + encodeURIComponent(mdFileUrl);
            const mdResponse = await fetch(mdProxyUrl);
            
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
            console.warn(`代理 ${proxyIndex + 1} 失败:`, error);
            
            // 尝试下一个代理
            if (proxyIndex < proxyServices.length - 1) {
                console.log('尝试下一个代理...');
                setTimeout(() => tryWithProxy(proxyIndex + 1), 1000);
            } else {
                // 所有代理都失败
                showError(error.message);
            }
        }
    };
    
    // 开始尝试第一个代理
    tryWithProxy(0);
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

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    loadArticleDetail();
    initTocToggle();
    initSmoothScroll();
});