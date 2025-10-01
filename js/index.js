// 底部导航交互
document.addEventListener('DOMContentLoaded', function() {
    const navItems = document.querySelectorAll('.nav-item');
    
    // 导航项点击事件
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // 阻止默认跳转行为，实际应用中可根据需要修改
            e.preventDefault();
            
            // 移除所有导航项的active类
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // 为当前点击的导航项添加active类（首页按钮除外）
            if (!this.classList.contains('home-btn')) {
                this.classList.add('active');
            }
            
            // 获取目标页面
            const targetPage = this.getAttribute('data-page');
            
            // 在实际应用中，这里可以添加页面切换逻辑
            if (targetPage) {
                console.log(`切换到${targetPage}页面`);
                // 判断当前页面是否在 pages 目录下
                const isInPagesDir = window.location.pathname.includes('pages/');
                // 动态生成路径：根目录页面跳 pages/xxx.html，子目录页面直接跳 xxx.html
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
                window.scrollTo({
                    top: targetElement.offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
});