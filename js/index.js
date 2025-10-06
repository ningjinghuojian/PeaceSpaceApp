// 全局变量标记后端服务是否就绪
window.backendReady = false;

// Cordova环境就绪后启动Node服务
document.addEventListener('deviceready', function() {
    console.log('Cordova环境已就绪，准备启动Node服务...');

    // 启动Node.js后端服务
    if (typeof nodejs !== 'undefined') {
        // 启动Node服务并监听输出
        nodejs.start(function(msg) {
            console.log('Node服务输出:', msg);
            
            // 检测服务是否启动成功（根据后端服务启动日志判断）
            if (msg.includes('后端服务启动成功')) {
                window.backendReady = true;
                console.log('后端服务已就绪，可以开始请求数据');
                
                // 如果有初始化数据加载函数，在这里调用
                if (typeof loadArticles === 'function') {
                    loadArticles();
                }
            }
        });

        // 监听Node服务错误
        nodejs.channel.on('error', function(err) {
            console.error('Node服务错误:', err);
        });

        // 监听Node服务停止事件
        nodejs.channel.on('stop', function() {
            console.log('Node服务已停止');
            window.backendReady = false;
        });
    } else {
        console.warn('未检测到nodejs-mobile插件，请确保已正确安装');
        // 非Cordova环境下可以使用模拟数据或提示信息
        window.backendReady = true; // 仅用于开发环境测试
    }
}, false);

// 底部导航交互
document.addEventListener('DOMContentLoaded', function() {
    const navItems = document.querySelectorAll('.nav-item');
    
    // 导航项点击事件
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // 阻止默认跳转行为
            e.preventDefault();
            
            // 移除所有导航项的active类
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // 为当前点击的导航项添加active类（首页按钮除外）
            if (!this.classList.contains('home-btn')) {
                this.classList.add('active');
            }
            
            // 获取目标页面
            const targetPage = this.getAttribute('data-page');
            
            // 页面切换逻辑
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
    
    // 平滑滚动
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});
