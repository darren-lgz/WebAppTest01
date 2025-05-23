// 全局变量
let currentNumber = 1;
let scores = {
    addition: 0,
    subtraction: 0,
    composition: 0
};

// 显示/隐藏游戏区域
function showSection(sectionId) {
    // 隐藏所有游戏区域
    document.querySelectorAll('.game-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // 显示选中的游戏区域
    document.getElementById(sectionId).classList.add('active');
    
    // 如果是数字认识区域，重置当前数字
    if (sectionId === 'numbers') {
        currentNumber = 1;
        updateNumberDisplay();
    }
}

// 数字认识游戏
function updateNumberDisplay() {
    document.querySelector('.current-number').textContent = currentNumber;
}

function previousNumber() {
    if (currentNumber > 1) {
        currentNumber--;
        updateNumberDisplay();
    }
}

function nextNumber() {
    if (currentNumber < 20) {
        currentNumber++;
        updateNumberDisplay();
    }
}

// 生成随机数
function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 加法练习
function generateAdditionProblem() {
    const num1 = getRandomNumber(1, 10);
    const num2 = getRandomNumber(1, 10);
    document.getElementById('num1').textContent = num1;
    document.getElementById('num2').textContent = num2;
    document.getElementById('answer').value = '';
}

// 减法练习
function generateSubtractionProblem() {
    const num1 = getRandomNumber(5, 20);
    const num2 = getRandomNumber(1, num1);
    document.getElementById('subNum1').textContent = num1;
    document.getElementById('subNum2').textContent = num2;
    document.getElementById('subAnswer').value = '';
}

// 数字组合游戏
function generateCompositionProblem() {
    const target = getRandomNumber(5, 20);
    document.getElementById('targetNumber').textContent = target;
    document.getElementById('comp1').value = '';
    document.getElementById('comp2').value = '';
}

// 检查答案
function checkAnswer(type) {
    let userAnswer, correctAnswer, num1, num2;
    const feedback = document.getElementById('feedback');
    
    if (type === 'addition') {
        num1 = parseInt(document.getElementById('num1').textContent);
        num2 = parseInt(document.getElementById('num2').textContent);
        userAnswer = parseInt(document.getElementById('answer').value);
        correctAnswer = num1 + num2;
    } else if (type === 'subtraction') {
        num1 = parseInt(document.getElementById('subNum1').textContent);
        num2 = parseInt(document.getElementById('subNum2').textContent);
        userAnswer = parseInt(document.getElementById('subAnswer').value);
        correctAnswer = num1 - num2;
    }
    
    if (userAnswer === correctAnswer) {
        feedback.textContent = '太棒了！答对了！';
        feedback.className = 'feedback correct';
        scores[type]++;
        document.getElementById(type + 'Score').textContent = scores[type];
        
        // 生成新题目
        setTimeout(() => {
            if (type === 'addition') {
                generateAdditionProblem();
            } else {
                generateSubtractionProblem();
            }
            feedback.textContent = '';
        }, 1500);
    } else {
        feedback.textContent = '再试一次吧！';
        feedback.className = 'feedback incorrect';
    }
}

// 检查数字组合
function checkComposition() {
    const target = parseInt(document.getElementById('targetNumber').textContent);
    const num1 = parseInt(document.getElementById('comp1').value);
    const num2 = parseInt(document.getElementById('comp2').value);
    const feedback = document.getElementById('feedback');
    
    if (num1 + num2 === target) {
        feedback.textContent = '太棒了！答对了！';
        feedback.className = 'feedback correct';
        scores.composition++;
        document.getElementById('compositionScore').textContent = scores.composition;
        
        // 生成新题目
        setTimeout(() => {
            generateCompositionProblem();
            feedback.textContent = '';
        }, 1500);
    } else {
        feedback.textContent = '再试一次吧！';
        feedback.className = 'feedback incorrect';
    }
}

// 初始化游戏
function initGame() {
    // 生成初始题目
    generateAdditionProblem();
    generateSubtractionProblem();
    generateCompositionProblem();
    
    // 显示第一个游戏区域
    showSection('numbers');
}

// 页面加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', initGame); 