// 全局变量
let timer = null;
let timeLeft = 60;
let totalScore = 0;
let minNumber = 2;
let maxNumber = 5;
let currentGameType = 'quick-count'; // 默认为一眼识数
let questionHistory = [];
let questionCount = 0;
let soundEnabled = false; // 默认关闭声音
let errorCount = 0; // 记录错误次数，用于监控
let isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let isLowEndDevice = false; // 低性能设备标志
let cachedElements = {}; // 缓存常用DOM元素

// 检测设备类型和性能
function detectDevice() {
    // 性能检测
    const startTime = performance.now();
    let result = 0;
    // 简单的性能测试
    for (let i = 0; i < 1000000; i++) {
        result += Math.random();
    }
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // 如果性能测试耗时超过100ms，认为是低性能设备
    isLowEndDevice = duration > 100 || isMobileDevice;
    
    console.log(`设备检测: 移动设备=${isMobileDevice}, 低性能设备=${isLowEndDevice}, 性能测试耗时=${duration.toFixed(2)}ms`);
    
    // 根据设备类型调整设置
    if (isMobileDevice || isLowEndDevice) {
        // 移动设备优化设置
        soundEnabled = false; // 默认关闭声音，减少资源占用
    }
}

// 缓存常用DOM元素
function cacheElements() {
    cachedElements = {
        gameArea: document.getElementById('gameArea'),
        gameContent: document.getElementById('gameContent'),
        feedback: document.getElementById('feedback'),
        totalScore: document.getElementById('totalScore'),
        setupSection: document.getElementById('setupSection'),
        minNumber: document.getElementById('minNumber'),
        maxNumber: document.getElementById('maxNumber'),
        startBtn: document.getElementById('startBtn'),
        backHomeBtn: document.getElementById('backHomeBtn'),
        restartBtn: document.getElementById('restartBtn'),
        timeLeft: document.getElementById('timeLeft')
    };
}

// 添加全局样式，防止文本选择
document.addEventListener('DOMContentLoaded', function() {
    // 创建样式元素
    const style = document.createElement('style');
    style.textContent = `
        * {
            user-select: none !important;
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            cursor: default !important;
            -webkit-tap-highlight-color: transparent;
        }
        input, textarea {
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            cursor: text !important;
        }
        .container {
            overscroll-behavior: contain;
        }
    `;
    document.head.appendChild(style);
    
    // 设备检测
    detectDevice();
    
    // 缓存DOM元素
    cacheElements();
});

// 音效对象 - 延迟创建，减少初始加载时间
const sounds = {};

// 按需加载音效
function loadSound(soundName) {
    if (!soundEnabled) return null;
    
    if (!sounds[soundName]) {
        sounds[soundName] = new Audio(`sounds/${soundName}.mp3`);
        sounds[soundName].addEventListener('error', () => {
            soundEnabled = false;
        });
    }
    return sounds[soundName];
}

// 播放音效
function playSound(soundName) {
    if (!soundEnabled) return;
    
    const sound = loadSound(soundName);
    if (sound) {
        try {
            sound.currentTime = 0;
            sound.play().catch(() => {
                soundEnabled = false;
            });
        } catch (e) {
            soundEnabled = false;
        }
    }
}

// 页面加载后初始化
window.addEventListener('DOMContentLoaded', function() {
    // 缓存DOM元素
    cacheElements();
    
    // 防止移动端页面滚动
    document.body.addEventListener('touchmove', function(e) {
        if (e.target.tagName !== 'INPUT') {
            e.preventDefault();
        }
    }, { passive: false });
    
    // 绑定事件处理
    cachedElements.startBtn.addEventListener('click', startGame);
    cachedElements.backHomeBtn.addEventListener('click', showSetupOnly);
    cachedElements.restartBtn.addEventListener('click', startGame);
    
    // 添加全局样式
    const style = document.createElement('style');
    style.textContent = `
        * {
            user-select: none !important;
            -webkit-user-select: none !important;
            -webkit-tap-highlight-color: transparent;
        }
        input {
            user-select: text !important;
            -webkit-user-select: text !important;
        }
    `;
    document.head.appendChild(style);
});

function showSetupOnly() {
    // 停止计时器
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    
    // 重置游戏状态
    resetGameState();
    
    // 显示设置区域，隐藏游戏区域
    cachedElements.setupSection.style.display = 'block';
    cachedElements.gameArea.style.display = 'none';
    
    // 显示标题（如果之前被隐藏）
    const titleElement = document.getElementById('game-title') || document.querySelector('h1, .title, header h1, .game-title');
    if (titleElement) {
        titleElement.style.display = '';
    }
    
    // 恢复顶部空白横杠区域的显示
    const headerElements = document.querySelectorAll('header, .header-container, .top-bar, .app-header');
    headerElements.forEach(el => {
        el.style.display = '';
    });
    
    // 恢复已标记的顶部横杠
    const topBar = document.getElementById('top-bar');
    if (topBar) {
        topBar.style.display = '';
    } else {
        // 如果没有找到已标记的元素，尝试恢复顶部容器的显示
        const topContainers = document.querySelectorAll('.container, .card, .panel, .box');
        for (let i = 0; i < topContainers.length; i++) {
            const rect = topContainers[i].getBoundingClientRect();
            if (rect.top < 50 && rect.width > window.innerWidth * 0.8) {
                topContainers[i].style.display = '';
                break;
            }
        }
    }
    
    // 清空游戏区域内容，让下次进入游戏时重新生成
    const gameArea = document.getElementById('gameArea');
    gameArea.innerHTML = '';
}

function startGame() {
    // 获取游戏设置
    minNumber = parseInt(cachedElements.minNumber.value);
    maxNumber = parseInt(cachedElements.maxNumber.value);
    
    // 确保最小值不大于最大值
    if (minNumber > maxNumber) {
        const temp = minNumber;
        minNumber = maxNumber;
        maxNumber = temp;
        cachedElements.minNumber.value = minNumber;
        cachedElements.maxNumber.value = maxNumber;
    }
    
    // 重置游戏状态
    resetGameState();
    
    // 隐藏设置区域，显示游戏区域
    cachedElements.setupSection.style.display = 'none';
    cachedElements.gameArea.style.display = 'block';
    
    // 渲染第一个问题
    renderQuestion();
    
    // 启动计时器
    startTimer();
}

function startTimer() {
    timer = setInterval(() => {
        timeLeft--;
        updateTimer();
        if (timeLeft <= 0) {
            clearInterval(timer);
            showResult();
        }
    }, 1000);
}

function updateTimer() {
    // 查找所有可能显示时间的元素
    const timeElements = document.querySelectorAll('span[style*="color: #ff6b6b"]');
    if (timeElements.length > 0) {
        // 更新所有找到的时间元素
        timeElements.forEach(el => {
            el.textContent = timeLeft;
        });
    }
}

function updateScore() {
    const totalScoreElement = document.getElementById('totalScore');
    if (totalScoreElement) {
        totalScoreElement.textContent = totalScore;
    }
}

// 添加全局错误处理
window.addEventListener('error', function(event) {
    console.error('全局错误捕获:', event.error || event.message);
    errorCount++;
    
    // 如果短时间内出现多次错误，尝试重置游戏状态
    if (errorCount > 3) {
        errorCount = 0;
        try {
            // 显示错误提示
            const feedback = document.getElementById('feedback');
            if (feedback) {
                feedback.textContent = '游戏出现问题，正在尝试恢复...';
                feedback.className = 'feedback incorrect';
            }
            
            // 延迟后重置游戏
            setTimeout(() => {
                resetGameState();
                renderQuestion();
            }, 1500);
        } catch (e) {
            console.error('恢复游戏状态时出错:', e);
            // 如果恢复失败，尝试回到设置页面
            setTimeout(showSetupOnly, 2000);
        }
    }
});

// 重置游戏状态函数
function resetGameState() {
    // 重置拖拽相关状态
    window._decompFilled = false;
    window._decompTarget = null;
    window._decompKnown = null;
    window._decompAnswer = null;
    window._lastDecompTarget = null; // 清除上一次的目标数记录
    
    window._compFilled = [null, null];
    window._compTarget = null;
    window._compAnswer = null;
    
    // 移除所有拖拽样式
    document.querySelectorAll('.dragging').forEach(el => {
        el.classList.remove('dragging');
    });
    document.querySelectorAll('.dragover').forEach(el => {
        el.classList.remove('dragover');
    });
    document.querySelectorAll('.used').forEach(el => {
        el.classList.remove('used');
    });
    
    // 清空反馈
    const feedback = document.getElementById('feedback');
    if (feedback) {
        feedback.textContent = '';
        feedback.className = 'feedback';
    }
}

// 改进renderQuestion函数
function renderQuestion() {
    try {
        resetGameState(); // 每次渲染前重置状态
        
        const gameContent = cachedElements.gameContent || document.getElementById('gameContent');
        if (!gameContent) return;
        
        // 使用DocumentFragment减少DOM操作
        const fragment = document.createDocumentFragment();
        let contentHTML = '';
        
        switch (currentGameType) {
            case 'quick-count':
                contentHTML = genQuickCount();
                break;
            case 'decomposition':
                contentHTML = genDecomposition();
                break;
            default:
                // 默认使用一眼识数
                currentGameType = 'quick-count';
                contentHTML = genQuickCount();
                break;
        }
        
        // 一次性更新DOM
        gameContent.innerHTML = contentHTML;
        
        const feedback = cachedElements.feedback || document.getElementById('feedback');
        if (feedback) feedback.textContent = '';
        
        // 在渲染完成后设置拖拽事件
        // 使用requestIdleCallback或setTimeout来延迟非关键任务
        if (window.requestIdleCallback) {
            requestIdleCallback(() => {
                setupDragEvents();
            });
        } else {
            setTimeout(setupDragEvents, 50);
        }
    } catch (error) {
        console.error("渲染题目时出错:", error);
        // 如果出错，提供一个简单的恢复选项
        const gameContent = cachedElements.gameContent || document.getElementById('gameContent');
        if (gameContent) {
            gameContent.innerHTML = `
                <div class="error-recovery">
                    <p>加载题目时出现问题</p>
                    <button onclick="renderQuestion()">重试</button>
                    <button onclick="showSetupOnly()">返回设置</button>
                </div>
            `;
        }
    }
}

function genQuickCount() {
    // 检查是否有正在进行的题目
    let count;
    if (window._currentQuickCountQuestion) {
        // 如果有，直接使用当前题目的值
        count = window._currentQuickCountQuestion;
    } else {
        // 生成新题目
        let tryCount = 0;
        do {
            count = getRandomNumber(minNumber, maxNumber);
            tryCount++;
            if (tryCount > 20) break;
        } while (isQuestionRepeated(count));
        
        // 保存当前题目
        window._currentQuickCountQuestion = count;
        addToHistory(count);
    }
    
    // 返回HTML字符串而不是直接修改DOM
    return `
        <div class="circle-container" style="position: relative; width: 300px; height: 300px; margin: 0 auto;">
            ${generateRandomCircles(count)}
        </div>
        <div class="options-container">
            ${generateOptions(count, 4).map(num => 
                `<button class="option-button" onclick="checkAnswer(${num}, ${count})">${num}</button>`
            ).join('')}
        </div>
    `;
}

// 生成随机位置、颜色和大小的小球 - 优化版本
function generateRandomCircles(count) {
    const fragment = document.createDocumentFragment();
    const container = document.createElement('div');
    container.className = 'circle-container';
    
    // 预定义颜色数组
    const colors = [
        '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2', 
        '#073B4C', '#EF476F', '#FFC43D', '#1B9AAA', '#6A4C93'
    ];
    
    // 计算合适的容器尺寸
    const containerSize = isMobileDevice ? 280 : 320;
    const baseSize = 36; // 基础圆圈大小
    const sizeVariation = 4; // 大小变化范围
    const minDistance = baseSize * 0.8; // 最小距离要求
    
    container.style.width = containerSize + 'px';
    container.style.height = containerSize + 'px';
    
    // 创建圆圈位置数组
    const circles = [];
    
    // 生成所有圆圈
    for (let i = 0; i < count; i++) {
        // 简化的圆圈位置生成算法
        let x, y, size, overlapping;
        let attempts = 0;
        const maxAttempts = 20; // 最大尝试次数
        
        do {
            size = baseSize + Math.floor(Math.random() * (sizeVariation * 2 + 1)) - sizeVariation;
            x = Math.floor(Math.random() * (containerSize - size));
            y = Math.floor(Math.random() * (containerSize - size));
            
            // 检查是否与现有圆圈重叠
            overlapping = false;
            for (let j = 0; j < circles.length; j++) {
                const dx = circles[j].x - x;
                const dy = circles[j].y - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < minDistance) {
                    overlapping = true;
                    break;
                }
            }
            
            attempts++;
            // 如果尝试次数过多，放宽要求
            if (attempts > maxAttempts) {
                break;
            }
        } while (overlapping);
        
        // 创建圆圈元素
        const circle = document.createElement('div');
        circle.className = 'circle';
        circle.style.width = size + 'px';
        circle.style.height = size + 'px';
        circle.style.left = x + 'px';
        circle.style.top = y + 'px';
        circle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        // 添加到数组和容器
        circles.push({ x, y, size });
        container.appendChild(circle);
    }
    
    fragment.appendChild(container);
    return fragment;
}

// 修改genDecomposition函数，返回HTML字符串而不是直接操作DOM
function genDecomposition() {
    // 重置全局变量，防止旧数据干扰
    window._decompTarget = null;
    window._decompKnown = null;
    window._decompAnswer = null;
    window._decompFilled = false;
    
    let target, knownNum, answer, options;
    // 安全获取复选框状态
    const decompRandomEl = document.getElementById('decompRandom');
    const decompRandom = decompRandomEl ? decompRandomEl.checked : true;
    
    // 根据是否随机选择目标数
    if (decompRandom) {
        // 设置最小目标数
        let minTarget = Math.max(minNumber+1, 3);
        if (maxNumber - minTarget < 0) minTarget = maxNumber;
        
        // 确保每次都能获取新的随机目标数
        let newTarget;
        let attempts = 0;
        do {
            newTarget = getRandomNumber(minTarget, maxNumber);
            attempts++;
        } while (newTarget === window._lastDecompTarget && attempts < 5);
        
        target = newTarget;
        // 记录本次目标数，以便下次比较
        window._lastDecompTarget = target;
    } else {
        // 固定目标数 - 使用分解值输入框的值
        const decompValueEl = document.getElementById('decompValue');
        target = decompValueEl ? parseInt(decompValueEl.value) : 5;
        
        // 确保目标数有效
        if (isNaN(target) || target < 2) {
            target = 5; // 默认值
        }
    }
    
    // 确保可分解性
    let knownMin = 1;  // 非随机模式下，允许从1开始
    let knownMax = target-1;
    if (knownMax < knownMin) knownMax = knownMin;
    
    let tryCount = 0;
    let currentQuestion;
    do {
        knownNum = getRandomNumber(knownMin, knownMax);
        answer = target - knownNum;
        
        currentQuestion = {target, knownNum};
        tryCount++;
    } while (isQuestionRepeated(currentQuestion) && tryCount < 10);
    
    // 记录到历史
    addToHistory(currentQuestion);
    
    // 生成选项
    options = new Set([answer]);
    let optionAttempts = 0;
    while (options.size < 4 && optionAttempts < 20) {
        let opt = getRandomNumber(knownMin, knownMax);
        if (opt !== answer && opt !== knownNum) options.add(opt);
        if (options.size >= (knownMax-knownMin+1)) break;
        optionAttempts++;
    }
    // 如果最终选项数量仍然少于3，直接用[1,2,3]
    if (options.size < 3) {
        options = [1, 2, 3];
    } else {
        options = Array.from(options).sort(() => Math.random() - 0.5);
    }
    
    // 保存答案数据
    window._decompAnswer = answer;
    window._decompKnown = knownNum;
    window._decompTarget = target;
    window._decompFilled = false;
    
    console.log(`生成分解题目: ${target} = ${knownNum} + ${answer}`);
    
    // 返回HTML字符串
    const html = `
        <div class="decomp-container">
            <div class="target-number" style="font-size: 3.2em; background-color: #f0f9ff; padding: 10px 40px; box-shadow: 0 4px 10px rgba(76,205,196,0.2); margin-bottom: 20px; user-select: none;">${target}</div>
            <div class="decomp-triangle" style="position: relative; width: 260px; height: 200px; margin: 0;">
                <svg width="260" height="130" viewBox="0 0 260 130" style="position: absolute; top: 0;">
                    <line x1="130" y1="10" x2="40" y2="80" stroke="#4ecdc4" stroke-width="3"/>
                    <line x1="130" y1="10" x2="220" y2="80" stroke="#4ecdc4" stroke-width="3"/>
                </svg>
                <div class="decomp-numbers" style="display: flex; justify-content: space-between; padding: 0; position: absolute; bottom: 0; left: 0; right: 0; width: 260px;">
                    <div class="decomp-known" style="margin-left: 10px; width: 70px; height: 70px; background-color: #f0f9ff; border: 2px solid #4ecdc4; font-size: 2.2em; display: flex; align-items: center; justify-content: center; border-radius: 12px; user-select: none;">${knownNum}</div>
                    <div class="decomp-blank" id="decompBlank" ondragover="event.preventDefault()" ondrop="dropDecomp(event)" style="margin-right: 10px; width: 70px; height: 70px; background-color: #f0f9ff; border: 2px dashed #4ecdc4; font-size: 2.2em; display: flex; align-items: center; justify-content: center; border-radius: 12px; position: relative; user-select: none;">
                        <span class="placeholder" style="user-select: none; font-size: 0.8em; color: #888;">?</span>
                    </div>
                </div>
            </div>
            <div class="decomp-options" style="margin-top: 30px;">
                ${options.map(num => `
                    <div class="number-option" draggable="true" ondragstart="dragDecomp(event,${num})" style="background-color: #4ecdc4; color: white; width: 70px; height: 70px; font-size: 2.2em; display: flex; align-items: center; justify-content: center; border-radius: 12px; user-select: none;">${num}</div>
                `).join('')}
            </div>
        </div>
    `;
    
    // 在下一帧设置触摸拖拽支持
    setTimeout(() => {
        if(window.afterRenderDecomp) window.afterRenderDecomp();
    }, 0);
    
    return html;
}

window.dragDecomp = function(event, num) {
    event.dataTransfer.setData('text/plain', num);
    // 移除其他元素可能存在的dragging类
    document.querySelectorAll('.number-option.dragging').forEach(el => {
        el.classList.remove('dragging');
    });
    event.target.classList.add('dragging');
    
    // 不播放拖拽音效
};

window.dropDecomp = function(event) {
    event.preventDefault();
    
    // 移除dragover样式
    event.currentTarget.classList.remove('dragover');
    
    // 如果已经填充，不再处理
    if (window._decompFilled) return;
    
    try {
        const num = parseInt(event.dataTransfer.getData('text/plain'));
        if (isNaN(num)) return; // 如果无法获取有效数字，直接返回
        
        const blank = document.getElementById('decompBlank');
        if (!blank) return; // 安全检查
        
        // 不播放拖拽音效
        
        // 填入数字，保持原始拖拽块的样式
        blank.innerHTML = `<span class='filled' style="color: white; font-size: 1.2em; user-select: none;">${num}</span>`;
        blank.style.backgroundColor = '#4ecdc4';
        blank.style.border = '2px solid #4ecdc4';
        window._decompFilled = true;
        
        // 标记已使用的选项
        document.querySelectorAll('.decomp-options .number-option').forEach(opt => {
            if (parseInt(opt.textContent) === num) {
                opt.classList.add('used');
            }
        });
        
        // 移除所有dragging类
        document.querySelectorAll('.dragging').forEach(el => {
            el.classList.remove('dragging');
        });
        
        // 答案检查
        setTimeout(() => {
            if (!window._decompTarget || !window._decompKnown) return; // 安全检查
            
            const target = window._decompTarget;
            const known = window._decompKnown;
            if (known + num === target) {
                // 答案正确
                totalScore++;
                questionCount++;
                updateScore();
            
                                 // 确保 blank 是 decomp-blank，且 position 相对
                 blank.style.position = blank.style.position === 'static' ? 'relative' : blank.style.position;
 
                 const checkmark = document.createElement('div');
                 checkmark.className = 'checkmark';
 
                 const style = checkmark.style;
                 style.position = 'absolute';
                 style.right = '-12px';
                 style.bottom = '-12px';
                 style.width = '18px';
                 style.height = '18px';
                 style.background = '#fff';
                 style.borderRadius = '50%';
                 style.display = 'flex';
                 style.alignItems = 'center';
                 style.justifyContent = 'center';
                 style.boxShadow = '0 2px 6px rgba(76,205,196,0.2)';
                 style.zIndex = '3';
 
                 const svgNS = 'http://www.w3.org/2000/svg';
                 const svg = document.createElementNS(svgNS, 'svg');
                 svg.setAttribute('width', '22');
                 svg.setAttribute('height', '22');
                 svg.setAttribute('viewBox', '0 0 16 16');
                 svg.setAttribute('fill', 'none');
                 svg.setAttribute('stroke', '#4ecdc4');
                 svg.setAttribute('stroke-width', '2.5');
                 svg.setAttribute('stroke-linecap', 'round');
                 svg.setAttribute('stroke-linejoin', 'round');
                 svg.style.display = 'block'; // 防止对齐偏差
                 svg.style.margin = '0';

                const polyline = document.createElementNS(svgNS, 'polyline');
                polyline.setAttribute('points', '4 8 7 11 12 6');

                svg.appendChild(polyline);
                checkmark.appendChild(svg);
                blank.appendChild(checkmark);
            
                // 添加闪烁效果，1秒后移除
                blank.classList.add('flash');
                setTimeout(() => blank.classList.remove('flash'), 1000);
            
                // 显示反馈信息
                const feedback = document.getElementById('feedback');
                feedback.textContent = '太棒了！答对了！';
                feedback.className = 'feedback correct';
            
                playSound('correct');
            
                // 延迟后渲染新问题
                setTimeout(() => {
                    window._decompFilled = false;
                    window._decompTarget = null; // 清空旧值
                    window._decompKnown = null;
                    window._decompAnswer = null;
                    renderQuestion();
                }, 400);
            } else {
                // 答案错误
                document.getElementById('feedback').textContent = '再试一次吧！';
                document.getElementById('feedback').className = 'feedback incorrect';
                // 错误时不播放声音
                
                // 添加抖动效果
                blank.classList.add('shake');
                
                // 延迟后重置
                setTimeout(() => {
                    // 恢复问号占位符
                    if (blank) {
                        blank.innerHTML = `<span class='placeholder' style='user-select:none; font-size: 0.8em; color: #888;'>?</span>`;
                        blank.style.backgroundColor = '#f0f9ff';
                        blank.style.border = '2px dashed #4ecdc4';
                        blank.classList.remove('shake');
                    }
                    window._decompFilled = false;
                    document.querySelectorAll('.decomp-options .number-option').forEach(opt => {
                        opt.classList.remove('used');
                    });
                    document.getElementById('feedback').textContent = '';
                    document.getElementById('feedback').className = 'feedback';
                }, 800);
            }
        }, 300);
    } catch (error) {
        console.error("拖拽处理错误:", error);
        // 发生错误时重置状态
        window._decompFilled = false;
        document.getElementById('decompBlank').innerHTML = `<span class='placeholder'>?</span>`;
        document.querySelectorAll('.decomp-options .number-option').forEach(opt => {
            opt.classList.remove('used');
        });
    }
};

function genComposition() {
    const target = getRandomNumber(Math.max(minNumber+1, 5), maxNumber);
    let num1 = getRandomNumber(minNumber, target-1);
    let num2 = target - num1;
    if (num2 < minNumber || num2 > maxNumber) {
        num2 = minNumber;
        num1 = target - num2;
    }
    let options = new Set([num1, num2]);
    while (options.size < 6) options.add(getRandomNumber(minNumber, maxNumber));
    options = Array.from(options).sort(() => Math.random() - 0.5);
    
    const gameContent = document.getElementById('gameContent');
    gameContent.innerHTML = `
        <div class='composition-layout' style='margin-bottom:30px;'>
            <div class='composition-problem' style='font-size:2em;display:flex;align-items:center;justify-content:center;gap:20px;'>
                <div class='comp-blank' id='compBlank1' ondragover='event.preventDefault()' ondrop='dropComp(event,1)' style='user-select:none;'><span class='placeholder' style='user-select:none; font-size: 0.8em; color: #888;'>?</span></div>
                <span style='user-select:none;'>+</span>
                <div class='comp-blank' id='compBlank2' ondragover='event.preventDefault()' ondrop='dropComp(event,2)' style='user-select:none;'><span class='placeholder' style='user-select:none; font-size: 0.8em; color: #888;'>?</span></div>
                <span style='user-select:none;'>=</span>
                <span class='target-number' style='user-select:none;'>${target}</span>
            </div>
            <div class='comp-options' style='display:flex;justify-content:center;gap:20px;margin-top:30px;'>
                ${options.map(num => `<div class='number-option' draggable='true' ondragstart='dragComp(event,${num})' style='user-select:none;'>${num}</div>`).join('')}
            </div>
        </div>
    `;
    
    window._compTarget = target;
    window._compFilled = [null, null];
    window._compAnswer = [num1, num2];
}

function genArithmetic() {
    const op = Math.random() < 0.5 ? '+' : '-';
    let num1, num2, answer;
    if (op === '+') {
        num1 = getRandomNumber(minNumber, maxNumber);
        num2 = getRandomNumber(minNumber, maxNumber);
        answer = num1 + num2;
    } else {
        num1 = getRandomNumber(Math.max(minNumber+1, minNumber), maxNumber);
        num2 = getRandomNumber(minNumber, num1);
        answer = num1 - num2;
    }
    let options = new Set([answer]);
    while (options.size < 4) options.add(getRandomNumber(answer-5, answer+5));
    options = Array.from(options).filter(n => n >= minNumber && n <= maxNumber).sort(() => Math.random() - 0.5);
    
    const gameContent = document.getElementById('gameContent');
    gameContent.innerHTML = `
        <div class='arithmetic-layout'>
            <div class='arithmetic-problem' style='font-size:2em;margin:20px 0;user-select:none;'>
                <span style='user-select:none;'>${num1}</span> <span style='user-select:none;'>${op}</span> <span style='user-select:none;'>${num2}</span> <span style='user-select:none;'>=</span> <span style='user-select:none;'>?</span>
            </div>
            <div class='number-options'>
                ${options.map(num => `<div class='number-option' onclick='checkArithmetic(${num1},${num2},\'${op}\',${num})' style='user-select:none;'>${num}</div>`).join('')}
            </div>
        </div>
    `;
}

function checkAnswer(selected, correct) {
    const isCorrect = selected === correct;
    
    // 更新反馈区域
    cachedElements.feedback.textContent = isCorrect ? '✓ 正确!' : '✗ 错误!';
    cachedElements.feedback.className = 'feedback ' + (isCorrect ? 'correct' : 'wrong');
    
    // 更新分数
    if (isCorrect) {
        totalScore++;
        cachedElements.totalScore.textContent = totalScore;
        playSound('correct');
    } else {
        playSound('wrong');
    }
    
    // 短暂延迟后显示下一题
    setTimeout(() => {
        cachedElements.feedback.textContent = '';
        cachedElements.feedback.className = 'feedback';
        renderQuestion();
    }, isCorrect ? 500 : 800); // 正确时更短的延迟
}

function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateOptions(correctAnswer, numOptions) {
    const options = [correctAnswer];
    while (options.length < numOptions) {
        const option = getRandomNumber(Math.max(minNumber, correctAnswer - 3), Math.min(maxNumber, correctAnswer + 3));
        if (!options.includes(option)) {
            options.push(option);
        }
    }
    return options.sort(() => Math.random() - 0.5);
}

function isQuestionRepeated(question) {
    return questionHistory.some(q => JSON.stringify(q) === JSON.stringify(question));
}

function addToHistory(question) {
    questionHistory.push(question);
    if (questionHistory.length > 3) questionHistory.shift();
}

function showResult() {
    clearInterval(timer);
    
    // 确保至少有一道题目被回答
    if (questionCount === 0) {
        questionCount = 1; // 防止除以零错误
    }
    
    const gameArea = document.getElementById('gameArea');
    const accuracy = ((totalScore / questionCount) * 100).toFixed(1);
    
    // 保存当前游戏类型，以便重新开始时使用
    // 确保游戏类型只能是一眼识数或数的分解
    const savedGameType = (currentGameType === 'quick-count' || currentGameType === 'decomposition') ? 
                          currentGameType : 'quick-count';
    
    // 创建一个全局函数，用于重新开始游戏
    window.restartGameFromResults = function() {
        console.log('再玩一次按钮被点击');
        currentGameType = savedGameType;
        
        // 清空游戏区域，确保重新开始时完全重建界面
        const gameArea = document.getElementById('gameArea');
        gameArea.innerHTML = '';
        
        startGame();
        return false;
    };
    
    // 创建一个全局函数，用于返回首页
    window.backToHomeFromResults = function() {
        console.log('返回首页按钮被点击');
        showSetupOnly();
        return false;
    };
    
    gameArea.innerHTML = `
        <div class="result-container">
            <h2>时间到，游戏结束！</h2>
            <div class="result-stats">
                <div class="score-display">
                    <span class="final-score">${totalScore}</span>
                    <span class="max-score">分</span>
                </div>
                <p>总题数：${questionCount}题</p>
                <p>正确率：${accuracy}%</p>
                <p>用时： 60秒</p>
            </div>
            <div class="result-message">
                ${getResultMessage(accuracy)}
            </div>
            <div class="result-buttons">
                <button onclick="window.restartGameFromResults(); return false;" class="restart-btn">再玩一次</button>
                <button onclick="window.backToHomeFromResults(); return false;" class="home-btn">返回首页</button>
            </div>
        </div>
    `;
    
    // 额外的安全措施，确保按钮可点击
    setTimeout(() => {
        try {
            const restartBtn = document.querySelector('.restart-btn');
            const homeBtn = document.querySelector('.home-btn');
            
            if (restartBtn && !restartBtn.onclick) {
                restartBtn.onclick = window.restartGameFromResults;
            }
            
            if (homeBtn && !homeBtn.onclick) {
                homeBtn.onclick = window.backToHomeFromResults;
            }
            
            console.log('结果页面按钮事件检查完成');
        } catch (error) {
            console.error('检查按钮事件时出错:', error);
        }
    }, 300);
}

function getResultMessage(accuracy) {
    if (accuracy >= 90) {
        return '<p class="result-excellent">太棒了，再创高分！</p>';
    } else if (accuracy >= 70) {
        return '<p class="result-good">做得很好！继续加油！</p>';
    } else {
        return '<p class="result-encourage">认真练习，你一定会做得更好！</p>';
    }
}

// 组合游戏拖拽功能
window.dragComp = function(event, num) {
    event.dataTransfer.setData('text/plain', num);
    event.target.classList.add('dragging');
    // 不播放拖拽音效
};

window.dropComp = function(event, slotIndex) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    if (window._compFilled[slotIndex-1] !== null) return;
    
    const num = parseInt(event.dataTransfer.getData('text/plain'));
    const blank = document.getElementById(`compBlank${slotIndex}`);
    blank.innerHTML = `<span class='filled' style="user-select:none;">${num}</span>`;
    
    window._compFilled[slotIndex-1] = num;
    
    document.querySelectorAll('.comp-options .number-option').forEach(opt => {
        if (parseInt(opt.textContent) === num) opt.classList.add('used');
    });
    
    // 检查如果两个空都已填，则验证答案
    if (window._compFilled[0] !== null && window._compFilled[1] !== null) {
        setTimeout(() => {
            const sum = window._compFilled[0] + window._compFilled[1];
            if (sum === window._compTarget) {
                totalScore++;
                questionCount++;
                updateScore();
                document.getElementById('feedback').textContent = '太棒了！答对了！';
                document.getElementById('feedback').className = 'feedback correct';
                playSound('correct');
                setTimeout(() => {
                    renderQuestion();
                }, 500);
            } else {
                document.getElementById('feedback').textContent = '再试一次吧！';
                document.getElementById('feedback').className = 'feedback incorrect';
                playSound('wrong');
                setTimeout(() => {
                    // 重置填充状态
                    document.getElementById('compBlank1').innerHTML = `<span class='placeholder' style='user-select:none; font-size: 0.8em; color: #888;'>?</span>`;
                    document.getElementById('compBlank2').innerHTML = `<span class='placeholder' style='user-select:none; font-size: 0.8em; color: #888;'>?</span>`;
                    window._compFilled = [null, null];
                    document.querySelectorAll('.comp-options .number-option').forEach(opt => opt.classList.remove('used'));
                    document.getElementById('feedback').textContent = '';
                    document.getElementById('feedback').className = 'feedback';
                }, 800);
            }
        }, 300);
    }
};

// 加减法检查函数
window.checkArithmetic = function(num1, num2, op, answer) {
    let correct;
    if (op === '+') {
        correct = num1 + num2;
    } else {
        correct = num1 - num2;
    }
    
    if (answer === correct) {
        totalScore++;
        document.getElementById('feedback').textContent = '太棒了！答对了！';
        document.getElementById('feedback').className = 'feedback correct';
        playSound('correct');
    } else {
        document.getElementById('feedback').textContent = '再试一次吧！';
        document.getElementById('feedback').className = 'feedback incorrect';
        playSound('wrong');
    }
    questionCount++;
    updateScore();
    setTimeout(renderQuestion, 500);
};

// 拖拽事件监听器设置
function setupDragEvents() {
    try {
        // 移除所有现有的拖拽事件监听器，防止重复绑定
        document.querySelectorAll('.comp-blank, .decomp-blank').forEach(el => {
            el.removeEventListener('dragover', handleDragOver);
            el.removeEventListener('dragleave', handleDragLeave);
            el.removeEventListener('dragenter', handleDragEnter);
        });
        
        // 重新添加事件监听器
        document.querySelectorAll('.comp-blank, .decomp-blank').forEach(el => {
            el.addEventListener('dragover', handleDragOver);
            el.addEventListener('dragleave', handleDragLeave);
            el.addEventListener('dragenter', handleDragEnter);
        });
        
        // 确保所有拖拽项都有正确的属性
        document.querySelectorAll('[draggable="true"]').forEach(el => {
            el.addEventListener('dragend', handleDragEnd);
        });
    } catch (error) {
        console.error("设置拖拽事件时出错:", error);
    }
}

// 处理拖拽结束事件
function handleDragEnd(e) {
    document.querySelectorAll('.dragging').forEach(el => {
        el.classList.remove('dragging');
    });
}

// 处理拖拽进入事件
function handleDragEnter(e) {
    e.preventDefault();
}

// 处理拖拽经过事件
function handleDragOver(e) {
    e.preventDefault();
    if (!this.classList.contains('dragover')) {
        this.classList.add('dragover');
    }
}

// 处理拖拽离开事件
function handleDragLeave(e) {
    if (e.target === this) {
        this.classList.remove('dragover');
    }
}

// 移动端touch拖拽支持
function enableTouchDragForDecomp() {
    const options = document.querySelectorAll('.decomp-options .number-option');
    const blank = document.getElementById('decompBlank');
    if (!blank) return;
    options.forEach(opt => {
        opt.ontouchstart = function(e) {
            e.preventDefault();
            const num = parseInt(this.textContent);
            this.classList.add('dragging');
            let moveHandler, endHandler;
            // 创建跟随手指的影子
            let shadow = this.cloneNode(true);
            shadow.style.position = 'fixed';
            shadow.style.zIndex = 9999;
            shadow.style.opacity = 0.8;
            shadow.style.pointerEvents = 'none';
            shadow.style.left = e.touches[0].clientX - 22 + 'px';
            shadow.style.top = e.touches[0].clientY - 22 + 'px';
            document.body.appendChild(shadow);
            // 不播放拖拽音效
            moveHandler = function(ev) {
                shadow.style.left = ev.touches[0].clientX - 22 + 'px';
                shadow.style.top = ev.touches[0].clientY - 22 + 'px';
                // 判断是否进入blank区域
                const rect = blank.getBoundingClientRect();
                if (
                    ev.touches[0].clientX > rect.left &&
                    ev.touches[0].clientX < rect.right &&
                    ev.touches[0].clientY > rect.top &&
                    ev.touches[0].clientY < rect.bottom
                ) {
                    blank.classList.add('dragover');
                } else {
                    blank.classList.remove('dragover');
                }
            };
            endHandler = function(ev) {
                document.removeEventListener('touchmove', moveHandler);
                document.removeEventListener('touchend', endHandler);
                shadow.remove();
                blank.classList.remove('dragover');
                this.classList.remove('dragging');
                // 判断是否松手在blank上
                const touch = ev.changedTouches[0];
                const rect = blank.getBoundingClientRect();
                if (
                    touch.clientX > rect.left &&
                    touch.clientX < rect.right &&
                    touch.clientY > rect.top &&
                    touch.clientY < rect.bottom
                ) {
                    // 触发drop逻辑
                    window._touchDropNum = num;
                    dropDecompTouch();
                }
            }.bind(this);
            document.addEventListener('touchmove', moveHandler, {passive: false});
            document.addEventListener('touchend', endHandler, {passive: false});
        };
    });
}
// 移动端专用drop逻辑
function dropDecompTouch() {
    if (window._decompFilled) return;
    const num = window._touchDropNum;
    const blank = document.getElementById('decompBlank');
    if (!blank) return;
    // 填入数字，保持样式
    blank.innerHTML = `<span class='filled' style="color: white; font-size: 1.8em;">${num}</span>`;
    blank.style.backgroundColor = '#4ecdc4';
    blank.style.border = '2px solid #4ecdc4';
    window._decompFilled = true;
    // 标记已使用的选项
    document.querySelectorAll('.decomp-options .number-option').forEach(opt => {
        if (parseInt(opt.textContent) === num) {
            opt.classList.add('used');
        }
    });
    // 答案检查（与PC端一致）
    setTimeout(() => {
        if (!window._decompTarget || !window._decompKnown) return;
        const target = window._decompTarget;
        const known = window._decompKnown;
        if (known + num === target) {
            totalScore++;
            questionCount++;
            updateScore();
            blank.innerHTML += `
                <div class=\"checkmark\" style=\"position: absolute; right: -12px; bottom: -12px; width: 30px; height: 30px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(76,205,196,0.3); z-index: 10;\">
                    <svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"#4ecdc4\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"margin-left: -1px; margin-top: -1px;\"><polyline points=\"12 6 7 11 4 8\"></polyline></svg>
                </div>
            `;
            blank.classList.add('flash');
            document.getElementById('feedback').textContent = '太棒了！答对了！';
            document.getElementById('feedback').className = 'feedback correct';
            playSound('correct');
            setTimeout(() => {
                window._decompFilled = false;
                window._decompTarget = null;
                window._decompKnown = null;
                window._decompAnswer = null;
                renderQuestion();
            }, 500); // 保持500毫秒延时
        } else {
            // 答案错误
            document.getElementById('feedback').textContent = '再试一次吧！';
            document.getElementById('feedback').className = 'feedback incorrect';
            // 错误时不播放声音
            blank.classList.add('shake');
            setTimeout(() => {
                blank.innerHTML = `<span class='placeholder'>?</span>`;
                blank.style.backgroundColor = '#f0f9ff';
                blank.style.border = '2px dashed #4ecdc4';
                blank.classList.remove('shake');
                window._decompFilled = false;
                document.querySelectorAll('.decomp-options .number-option').forEach(opt => {
                    opt.classList.remove('used');
                });
                document.getElementById('feedback').textContent = '';
                document.getElementById('feedback').className = 'feedback';
            }, 800);
        }
    }, 300);
}
// 在renderQuestion中调用
afterRenderDecomp = function() { enableTouchDragForDecomp(); }; 