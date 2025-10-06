document.addEventListener('DOMContentLoaded', function() {
    // Codeforces用户名
    const handle = 'PeaceRocket';
    let allSubmissions = []; // 存储所有提交记录
    
    // 底部导航交互
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            if (!this.classList.contains('home-btn')) {
                e.preventDefault();
                
                // 移除所有导航项的active类
                navItems.forEach(nav => nav.classList.remove('active'));
                
                // 为当前点击的导航项添加active类
                this.classList.add('active');
                
                // 获取目标页面
                const targetPage = this.getAttribute('data-page');
                
                if (targetPage) {
                    console.log(`切换到${targetPage}页面`);
                    const isInPagesDir = window.location.pathname.includes('pages/');
                    const targetPath = isInPagesDir 
                        ? `${targetPage}.html` 
                        : `pages/${targetPage}.html`;
                    window.location.href = targetPath;
                }
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
    
    // 获取用户基本信息
    function getUserInfo() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `https://codeforces.com/api/user.info?handles=${handle}&jsonp=userInfoCallback`;
            window.userInfoCallback = (data) => {
                if (data.status === 'OK') {
                    resolve(data.result[0]);
                } else {
                    reject(new Error(data.comment || '获取用户信息失败'));
                }
                document.head.removeChild(script);
                delete window.userInfoCallback;
            };
            script.onerror = () => reject(new Error('用户信息请求失败'));
            document.head.appendChild(script);
        });
    }
    
    // 获取用户Rating历史
    function getUserRating() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `https://codeforces.com/api/user.rating?handle=${handle}&jsonp=userRatingCallback`;
            window.userRatingCallback = (data) => {
                if (data.status === 'OK') {
                    resolve(data.result);
                } else {
                    reject(new Error(data.comment || '获取Rating历史失败'));
                }
                document.head.removeChild(script);
                delete window.userRatingCallback;
            };
            script.onerror = () => reject(new Error('Rating历史请求失败'));
            document.head.appendChild(script);
        });
    }
    
    // 获取用户提交记录
    function getUserStatus() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `https://codeforces.com/api/user.status?handle=${handle}&jsonp=userStatusCallback`;
            window.userStatusCallback = (data) => {
                if (data.status === 'OK') {
                    allSubmissions = data.result; // 保存所有提交记录
                    resolve(data.result);
                } else {
                    reject(new Error(data.comment || '获取提交记录失败'));
                }
                document.head.removeChild(script);
                delete window.userStatusCallback;
            };
            script.onerror = () => reject(new Error('提交记录请求失败'));
            document.head.appendChild(script);
        });
    }
    
    // 获取已解决题目数量
    function getSolvedProblems() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `https://codeforces.com/api/user.status?handle=${handle}&from=1&count=1&jsonp=solvedCallback`;
            window.solvedCallback = (data) => {
                if (data.status === 'OK' && data.result.length > 0) {
                    resolve(data.result[0].userSolvedCount || 0);
                } else {
                    reject(new Error('获取已解决题目数量失败'));
                }
                document.head.removeChild(script);
                delete window.solvedCallback;
            };
            script.onerror = () => reject(new Error('已解决题目数量请求失败'));
            document.head.appendChild(script);
        });
    }
    
    // 更新用户信息显示
    function updateUserInfo(user) {
        document.getElementById('currentRating').textContent = user.rating || '未参与比赛';
        
        // 设置评级头衔颜色
        const ratingTitle = document.getElementById('ratingTitle');
        if (user.rank) {
            ratingTitle.textContent = user.rank;
            // 根据不同评级设置不同颜色
            if (user.rank.includes('Expert')) {
                ratingTitle.style.backgroundColor = '#008000';
                ratingTitle.style.color = '#FFFFFF';
            } else if (user.rank.includes('Candidate Master')) {
                ratingTitle.style.backgroundColor = '#808000';
                ratingTitle.style.color = '#FFFFFF';
            } else if (user.rank.includes('Master')) {
                ratingTitle.style.backgroundColor = '#FFA500';
                ratingTitle.style.color = '#000000';
            } else if (user.rank.includes('Grandmaster')) {
                ratingTitle.style.backgroundColor = '#FF0000';
                ratingTitle.style.color = '#FFFFFF';
            } else if (user.rank.includes('International Grandmaster')) {
                ratingTitle.style.backgroundColor = '#FF0000';
                ratingTitle.style.color = '#FFFFFF';
                ratingTitle.style.fontWeight = 'bold';
            } else if (user.rank.includes('Pupil')) {
                ratingTitle.style.backgroundColor = '#7CFC00';
                ratingTitle.style.color = '#000000';
            } else if (user.rank.includes('Newbie')) {
                ratingTitle.style.backgroundColor = '#808080';
                ratingTitle.style.color = '#FFFFFF';
            }
        }
    }
    
    // 绘制评级趋势图表
    function createRatingChart(ratingHistory) {
        const ctx = document.getElementById('ratingChart').getContext('2d');
        
        // 提取比赛名称和Rating数据
        const contests = ratingHistory.map(entry => {
            const date = new Date(entry.ratingUpdateTimeSeconds * 1000);
            return `${date.getMonth() + 1}月${date.getDate()}日`;
        });
        const ratings = ratingHistory.map(entry => entry.newRating);
        const ratingChanges = ratingHistory.map(entry => entry.newRating - entry.oldRating);
        
        // 确定颜色：绿色表示上升，红色表示下降
        const pointBackgroundColors = ratingChanges.map(change => 
            change >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'
        );
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: contests,
                datasets: [{
                    label: 'Rating',
                    data: ratings,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    pointBackgroundColor: pointBackgroundColors,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        min: Math.min(...ratings) - 200,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
        
        // 更新参与比赛数量
        document.getElementById('contestCount').textContent = ratingHistory.length;
    }
    
    // 渲染提交记录
    function renderSubmissions(submissions) {
        const submissionsContainer = document.getElementById('submissionsContainer');
        submissionsContainer.innerHTML = '';
        
        // 只显示最近的10条提交
        const recentSubmissions = submissions.slice(0, 10);
        
        recentSubmissions.forEach(submission => {
            // 格式化时间
            const submissionDate = new Date(submission.creationTimeSeconds * 1000);
            let timeText = '';
            const now = new Date();
            const diffMs = now - submissionDate;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) {
                // 今天
                const hours = submissionDate.getHours().toString().padStart(2, '0');
                const minutes = submissionDate.getMinutes().toString().padStart(2, '0');
                timeText = `今天 ${hours}:${minutes}`;
            } else if (diffDays === 1) {
                // 昨天
                const hours = submissionDate.getHours().toString().padStart(2, '0');
                const minutes = submissionDate.getMinutes().toString().padStart(2, '0');
                timeText = `昨天 ${hours}:${minutes}`;
            } else if (diffDays < 7) {
                // 本周
                const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                timeText = `${weekdays[submissionDate.getDay()]} ${submissionDate.getHours()}:${submissionDate.getMinutes().toString().padStart(2, '0')}`;
            } else {
                // 更早
                timeText = `${submissionDate.getFullYear()}-${(submissionDate.getMonth() + 1).toString().padStart(2, '0')}-${submissionDate.getDate().toString().padStart(2, '0')}`;
            }
            
            // 确定提交状态
            let status = '';
            if (submission.verdict === 'OK') {
                status = 'accepted';
            } else if (submission.verdict === 'WRONG_ANSWER') {
                status = 'wrong';
            } else if (submission.verdict === 'TESTING') {
                status = 'pending';
            } else {
                status = 'wrong';
            }
            
            const statusText = status === 'accepted' ? '通过' : 
                              status === 'wrong' ? '错误' : '等待';
            
            const submissionEl = document.createElement('div');
            submissionEl.className = 'submission-item';
            
            submissionEl.innerHTML = `
                <div class="submission-info">
                    <div class="submission-problem">${submission.problem.contestId}. ${submission.problem.name}</div>
                    <div class="submission-time">${timeText}</div>
                </div>
                <div class="submission-status status-${status}">
                    ${statusText}
                </div>
            `;
            
            submissionsContainer.appendChild(submissionEl);
        });
    }
    
    // 创建月度提交日历
    function createMonthlyCalendar(year, month) {
        const calendar = document.getElementById('calendar');
        const currentMonthDisplay = document.getElementById('currentMonthDisplay');
        
        // 更新显示的月份
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', 
                           '7月', '8月', '9月', '10月', '11月', '12月'];
        currentMonthDisplay.textContent = `${year}年 ${monthNames[month]}`;
        
        // 清空日历
        calendar.innerHTML = '';
        
        // 获取当月第一天和最后一天
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // 当月第一天是星期几 (0-6, 0是星期日)
        const firstDayOfWeek = firstDay.getDay();
        
        // 当月的天数
        const daysInMonth = lastDay.getDate();
        
        // 上个月的最后几天
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevMonthYear = month === 0 ? year - 1 : year;
        const prevMonthLastDay = new Date(prevMonthYear, prevMonth + 1, 0).getDate();
        
        // 计算需要显示的上个月的天数
        const daysFromPrevMonth = firstDayOfWeek;
        
        // 按日期统计当月提交次数
        const submissionsByDate = {};
        allSubmissions.forEach(submission => {
            const submissionDate = new Date(submission.creationTimeSeconds * 1000);
            if (submissionDate.getFullYear() === year && submissionDate.getMonth() === month) {
                const date = submissionDate.getDate();
                submissionsByDate[date] = (submissionsByDate[date] || 0) + 1;
            }
        });
        
        // 获取今天的日期
        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
        
        // 添加上个月的日期
        for (let i = 0; i < daysFromPrevMonth; i++) {
            const day = prevMonthLastDay - daysFromPrevMonth + i + 1;
            const dayEl = document.createElement('div');
            dayEl.className = 'day other-month';
            dayEl.textContent = day;
            calendar.appendChild(dayEl);
        }
        
        // 找出当月的最大提交次数，用于颜色分级
        const submissionCounts = Object.values(submissionsByDate);
        const maxSubmissions = submissionCounts.length > 0 ? Math.max(...submissionCounts) : 0;
        
        // 添加当月的日期
        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'day current-month';
            
            // 如果是今天，添加特殊类
            if (isCurrentMonth && today.getDate() === day) {
                dayEl.classList.add('today');
            }
            
            dayEl.textContent = day;
            
            // 添加提交次数提示框
            const count = submissionsByDate[day] || 0;
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = `${month + 1}月${day}日: ${count}次提交`;
            dayEl.appendChild(tooltip);
            
            // 根据提交次数设置颜色
            if (count > 0) {
                // 计算提交次数级别 (1-4)
                let level;
                if (maxSubmissions <= 3) {
                    level = Math.ceil((count / maxSubmissions) * 4);
                } else if (count <= 3) {
                    level = 1;
                } else if (count <= 6) {
                    level = 2;
                } else if (count <= 9) {
                    level = 3;
                } else {
                    level = 4;
                }
                
                // 应用颜色级别
                if (level === 1) dayEl.style.backgroundColor = '#9be9a8';
                else if (level === 2) dayEl.style.backgroundColor = '#40c463';
                else if (level === 3) dayEl.style.backgroundColor = '#30a14e';
                else if (level === 4) dayEl.style.backgroundColor = '#216e39';
            } else {
                dayEl.style.backgroundColor = '#ebedf0';
            }
            
            calendar.appendChild(dayEl);
        }
        
        // 计算需要显示的下个月的天数，确保日历是完整的6行
        const totalDaysDisplayed = daysFromPrevMonth + daysInMonth;
        const daysToNextMonth = totalDaysDisplayed % 7 === 0 ? 0 : 7 - (totalDaysDisplayed % 7);
        
        // 添加下个月的日期
        for (let day = 1; day <= daysToNextMonth; day++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'day other-month';
            dayEl.textContent = day;
            calendar.appendChild(dayEl);
        }
    }
    
    // 初始化日历
    function initCalendar() {
        const yearSelect = document.getElementById('yearSelect');
        const monthSelect = document.getElementById('monthSelect');
        
        // 获取当前日期
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        // 添加年份选项（最近5年）
        for (let year = currentYear; year >= currentYear - 4; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) {
                option.selected = true;
            }
            yearSelect.appendChild(option);
        }
        
        // 设置当前月份为选中状态
        monthSelect.value = currentMonth;
        
        // 初始生成当前月份的日历
        createMonthlyCalendar(currentYear, currentMonth);
        
        // 年份或月份变更事件
        function handleDateChange() {
            const selectedYear = parseInt(yearSelect.value);
            const selectedMonth = parseInt(monthSelect.value);
            createMonthlyCalendar(selectedYear, selectedMonth);
        }
        
        yearSelect.addEventListener('change', handleDateChange);
        monthSelect.addEventListener('change', handleDateChange);
    }
    
    // 加载所有数据
    Promise.all([
        getUserInfo(),
        getUserRating(),
        getUserStatus(),
        getSolvedProblems()
    ]).then(([userInfo, ratingHistory, submissions, solvedCount]) => {
        // 更新用户信息
        updateUserInfo(userInfo);
        
        // 更新已解决题目数量
        document.getElementById('solvedProblems').textContent = solvedCount;
        
        // 创建评级趋势图表
        createRatingChart(ratingHistory);
        
        // 渲染提交记录
        renderSubmissions(submissions);
        
        // 初始化月度日历
        initCalendar();
    }).catch(error => {
        console.error('数据加载失败:', error);
        document.getElementById('submissionsContainer').innerHTML = '<div class="error">数据加载失败，请稍后再试</div>';
    });
});