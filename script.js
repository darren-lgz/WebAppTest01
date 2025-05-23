// 全局变量
let currentGame = null;
let timer = null;
let timeLeft = 120;
let totalScore = 0;
let currentProgress = 0;

// 游戏配置
const GAME_CONFIG = {
    'quick-count': {
        maxBalls: 20,
        options: 4
    },
    'decomposition': {
        maxNumber: 20
    },
    'composition': {
        maxNumber: 20
    },
    'arithmetic': {
        maxNumber: 20
    }
};

// 显示/隐藏游戏区域
function showSection(sectionId) {
    // 停止当前游戏
    if (currentGame) {
        clearInterval(timer);
        timer = null;
    }
    
    // 隐藏所有游戏区域
    document.querySelectorAll('.game-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // 显示选中的游戏区域
    document.getElementById(sectionId).classList.add('active');
    
    // 重置游戏状态
    timeLeft = 120;
    currentProgress = 0;
    updateTimer();
    updateProgress(sectionId);
    
    // 初始化新游戏
    currentGame = sectionId;
    initGame(sectionId);
    
    // 启动计时器
    startTimer();
}

// 计时器功能
function startTimer() {
    timer = setInterval(() => {
        timeLeft--;
        updateTimer();
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            endGame();
        }
    }, 1000);
}

function updateTimer() {
    document.getElementById('timeLeft').textContent = timeLeft;
}

function updateProgress(gameId) {
    const progressBar = document.getElementById(gameId + 'Progress');
    if (progressBar) {
        progressBar.style.width = (currentProgress * 100) + '%';
    }
}

// 一眼识数游戏
function initQuickCount() {
    const container = document.getElementById('ballsContainer');
    const optionsContainer = document.getElementById('numberOptions');
    
    // 清空容器
    container.innerHTML = '';
    optionsContainer.innerHTML = '';
    
    // 生成随机数量的球
    const ballCount = getRandomNumber(1, GAME_CONFIG['quick-count'].maxBalls);
    
    // 创建球
    for (let i = 0; i < ballCount; i++) {
        const ball = document.createElement('div');
        ball.className = 'ball';
        container.appendChild(ball);
    }
    
    // 生成选项
    const options = new Set([ballCount]);
    while (options.size < GAME_CONFIG['quick-count'].options) {
        options.add(getRandomNumber(1, GAME_CONFIG['quick-count'].maxBalls));
    }
    
    // 创建选项按钮
    Array.from(options).sort(() => Math.random() - 0.5).forEach(num => {
        const option = document.createElement('div');
        option.className = 'number-option';
        option.textContent = num;
        option.onclick = () => checkQuickCount(num, ballCount);
        optionsContainer.appendChild(option);
    });
}

// 数的分解游戏
function initDecomposition() {
    const target = getRandomNumber(5, GAME_CONFIG.decomposition.maxNumber);
    document.getElementById('decompTarget').textContent = target;
    document.getElementById('decomp1').value = '';
    document.getElementById('decomp2').value = '';
}

// 数的组合游戏
function initComposition() {
    const num1 = getRandomNumber(1, 10);
    const num2 = getRandomNumber(1, 10);
    document.getElementById('comp1').value = num1;
    document.getElementById('comp2').value = num2;
    document.getElementById('compTarget').textContent = '?';
}

// 加减法游戏
function initArithmetic() {
    const operation = Math.random() < 0.5 ? '+' : '-';
    let num1, num2;
    
    if (operation === '+') {
        num1 = getRandomNumber(1, 10);
        num2 = getRandomNumber(1, 10);
    } else {
        num1 = getRandomNumber(5, 20);
        num2 = getRandomNumber(1, num1);
    }
    
    document.getElementById('num1').textContent = num1;
    document.getElementById('operator').textContent = operation;
    document.getElementById('num2').textContent = num2;
    document.getElementById('arithmeticAnswer').value = '';
}

// 检查答案
function checkQuickCount(selected, correct) {
    const feedback = document.getElementById('feedback');
    
    if (selected === correct) {
        feedback.textContent = '太棒了！答对了！';
        feedback.className = 'feedback correct';
        totalScore++;
        document.getElementById('totalScore').textContent = totalScore;
        currentProgress += 0.1;
        updateProgress('quick-count');
        
        setTimeout(() => {
            initQuickCount();
            feedback.textContent = '';
        }, 1000);
    } else {
        feedback.textContent = '再试一次吧！';
        feedback.className = 'feedback incorrect';
    }
}

function checkDecomposition() {
    const target = parseInt(document.getElementById('decompTarget').textContent);
    const num1 = parseInt(document.getElementById('decomp1').value);
    const num2 = parseInt(document.getElementById('decomp2').value);
    const feedback = document.getElementById('feedback');
    
    if (num1 + num2 === target) {
        feedback.textContent = '太棒了！答对了！';
        feedback.className = 'feedback correct';
        totalScore++;
        document.getElementById('totalScore').textContent = totalScore;
        currentProgress += 0.1;
        updateProgress('decomposition');
        
        setTimeout(() => {
            initDecomposition();
            feedback.textContent = '';
        }, 1000);
    } else {
        feedback.textContent = '再试一次吧！';
        feedback.className = 'feedback incorrect';
    }
}

function checkComposition() {
    const num1 = parseInt(document.getElementById('comp1').value);
    const num2 = parseInt(document.getElementById('comp2').value);
    const answer = parseInt(document.getElementById('compTarget').value);
    const feedback = document.getElementById('feedback');
    
    if (num1 + num2 === answer) {
        feedback.textContent = '太棒了！答对了！';
        feedback.className = 'feedback correct';
        totalScore++;
        document.getElementById('totalScore').textContent = totalScore;
        currentProgress += 0.1;
        updateProgress('composition');
        
        setTimeout(() => {
            initComposition();
            feedback.textContent = '';
        }, 1000);
    } else {
        feedback.textContent = '再试一次吧！';
        feedback.className = 'feedback incorrect';
    }
}

function checkArithmetic() {
    const num1 = parseInt(document.getElementById('num1').textContent);
    const num2 = parseInt(document.getElementById('num2').textContent);
    const operator = document.getElementById('operator').textContent;
    const answer = parseInt(document.getElementById('arithmeticAnswer').value);
    const feedback = document.getElementById('feedback');
    
    let correctAnswer;
    if (operator === '+') {
        correctAnswer = num1 + num2;
    } else {
        correctAnswer = num1 - num2;
    }
    
    if (answer === correctAnswer) {
        feedback.textContent = '太棒了！答对了！';
        feedback.className = 'feedback correct';
        totalScore++;
        document.getElementById('totalScore').textContent = totalScore;
        currentProgress += 0.1;
        updateProgress('arithmetic');
        
        setTimeout(() => {
            initArithmetic();
            feedback.textContent = '';
        }, 1000);
    } else {
        feedback.textContent = '再试一次吧！';
        feedback.className = 'feedback incorrect';
    }
}

// 辅助函数
function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function initGame(gameId) {
    switch (gameId) {
        case 'quick-count':
            initQuickCount();
            break;
        case 'decomposition':
            initDecomposition();
            break;
        case 'composition':
            initComposition();
            break;
        case 'arithmetic':
            initArithmetic();
            break;
    }
}

function endGame() {
    const feedback = document.getElementById('feedback');
    feedback.textContent = `游戏结束！你的得分是：${totalScore}`;
    feedback.className = 'feedback';
}

// 页面加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    showSection('quick-count');
}); 