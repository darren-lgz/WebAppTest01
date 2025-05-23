// 全局变量
let timer = null;
let timeLeft = 120;
let totalScore = 0;
let minNumber = 2;
let maxNumber = 5;
let currentGameType = 'quick-count';
let questionHistory = [];
let questionCount = 0;
let soundEnabled = true;
let errorCount = 0; // 记录错误次数，用于监控

// 音效对象
const sounds = {
    correct: new Audio('sounds/correct.mp3'),
    wrong: new Audio('sounds/wrong.mp3'),
    drag: new Audio('sounds/drag.mp3')
};

// 预加载所有音效
function preloadSounds() {
    for (const sound in sounds) {
        sounds[sound].load();
    }
}

// 播放音效
function playSound(soundName) {
    if (soundEnabled && sounds[soundName]) {
        // 重置音效播放位置，以便可以快速连续播放相同音效
        sounds[soundName].currentTime = 0;
        sounds[soundName].play().catch(error => {
            console.warn("音频播放失败:", error);
        });
    }
}

// 页面加载后初始化
window.onload = function() {
    // 预加载音效
    preloadSounds();
    
    // 绑定游戏类型按钮
    document.querySelectorAll('.game-type-btn').forEach(btn => {
        btn.onclick = function() {
            document.querySelectorAll('.game-type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentGameType = this.dataset.type;
            document.getElementById('decompRandomGroup').style.display = currentGameType === 'decomposition' ? 'block' : 'none';
        };
    });
    // 绑定开始游戏按钮
    document.getElementById('startBtn').onclick = startGame;
    // 绑定返回首页和重新开始
    document.getElementById('backHomeBtn').onclick = showSetupOnly;
    document.getElementById('restartBtn').onclick = startGame;
};

function showSetupOnly() {
    document.getElementById('setupSection').style.display = 'flex';
    document.getElementById('gameArea').style.display = 'none';
    clearInterval(timer);
}

function startGame() {
    minNumber = parseInt(document.getElementById('minNumber').value);
    maxNumber = parseInt(document.getElementById('maxNumber').value);
    if (isNaN(minNumber) || isNaN(maxNumber) || minNumber < 1 || maxNumber < minNumber) {
        alert('请输入有效的最小数和最大数！');
        return;
    }
    totalScore = 0;
    questionCount = 0;
    timeLeft = 120;
    questionHistory = [];
    document.getElementById('setupSection').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';
    updateScore();
    updateTimer();
    clearInterval(timer);
    startTimer();
    renderQuestion();
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
    document.getElementById('timeLeft').textContent = timeLeft;
}

function updateScore() {
    document.getElementById('totalScore').textContent = totalScore;
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
        
        const gameContent = document.getElementById('gameContent');
        if (!gameContent) return;
        
        gameContent.innerHTML = '';
        switch (currentGameType) {
            case 'quick-count':
                genQuickCount();
                break;
            case 'decomposition':
                genDecomposition();
                break;
            case 'composition':
                genComposition();
                break;
            case 'arithmetic':
                genArithmetic();
                break;
        }
        document.getElementById('feedback').textContent = '';
        
        // 在渲染完成后设置拖拽事件
        setTimeout(setupDragEvents, 100);
    } catch (error) {
        console.error("渲染题目时出错:", error);
        // 如果出错，提供一个简单的恢复选项
        const gameContent = document.getElementById('gameContent');
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
    let count;
    let tryCount = 0;
    do {
        count = getRandomNumber(minNumber, maxNumber);
        tryCount++;
        if (tryCount > 20) break;
    } while (isQuestionRepeated(count));
    addToHistory(count);
    const gameContent = document.getElementById('gameContent');
    gameContent.innerHTML = `
        <div class="circle-container">
            ${Array(count).fill().map(() => '<div class="circle"></div>').join('')}
        </div>
        <div class="options-container">
            ${generateOptions(count, 4).map(num => 
                `<button class="option-button" onclick="checkAnswer(${num}, ${count})">${num}</button>`
            ).join('')}
        </div>
    `;
}

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
    
    // 设置最小目标数
    let minTarget = Math.max(minNumber+1, 5);
    if (maxNumber - minTarget < 0) minTarget = maxNumber;
    
    let tryCount = 0;
    do {
        if (decompRandom) {
            target = getRandomNumber(minTarget, maxNumber);
        } else {
            target = maxNumber;
        }
        
        // 确保可分解性
        let knownMin = minNumber;
        let knownMax = target-1;
        if (knownMax < knownMin) knownMax = knownMin;
        
        knownNum = getRandomNumber(knownMin, knownMax);
        answer = target - knownNum;
        
        // 生成选项
        options = new Set([answer]);
        let optionAttempts = 0;
        while (options.size < 4 && optionAttempts < 20) {
            let opt = getRandomNumber(knownMin, knownMax);
            if (opt !== answer && opt !== knownNum) options.add(opt);
            if (options.size >= (knownMax-knownMin+1)) break;
            optionAttempts++;
        }
        
        // 确保有足够的选项
        if (options.size < 2) {
            options.add(knownMin);
        }
        
        options = Array.from(options).sort(() => Math.random() - 0.5);
        tryCount++;
    } while (isQuestionRepeated({target, knownNum}) && tryCount < 10);
    
    // 记录到历史
    addToHistory({target, knownNum});
    
    // 渲染到界面
    try {
        const gameContent = document.getElementById('gameContent');
        if (!gameContent) return;
        
        gameContent.innerHTML = `
            <div class="decomp-container">
                <div class="target-number">${target}</div>
                <div class="decomp-triangle">
                    <svg width="200" height="100" viewBox="0 0 200 100">
                        <line x1="100" y1="10" x2="50" y2="90" stroke="#4ecdc4" stroke-width="3"/>
                        <line x1="100" y1="10" x2="150" y2="90" stroke="#4ecdc4" stroke-width="3"/>
                    </svg>
                    <div class="decomp-numbers">
                        <div class="decomp-known">${knownNum}</div>
                        <div class="decomp-blank" id="decompBlank" ondragover="event.preventDefault()" ondrop="dropDecomp(event)">
                            <span class="placeholder">?</span>
                        </div>
                    </div>
                </div>
                <div class="decomp-options">
                    ${options.map(num => `
                        <div class="number-option" draggable="true" ondragstart="dragDecomp(event,${num})">${num}</div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // 保存答案数据
        window._decompAnswer = answer;
        window._decompKnown = knownNum;
        window._decompTarget = target;
        window._decompFilled = false;
    } catch (error) {
        console.error("生成分解题目错误:", error);
        // 如果生成题目出错，提供一个备用的简单题目
        const gameContent = document.getElementById('gameContent');
        if (gameContent) {
            gameContent.innerHTML = `<div class="error-message">加载题目时出错，请重新开始游戏</div>`;
        }
    }
}

window.dragDecomp = function(event, num) {
    event.dataTransfer.setData('text/plain', num);
    // 移除其他元素可能存在的dragging类
    document.querySelectorAll('.number-option.dragging').forEach(el => {
        el.classList.remove('dragging');
    });
    event.target.classList.add('dragging');
    playSound('drag');
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
        
        blank.innerHTML = `<span class='filled'>${num}</span>`;
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
                totalScore++;
                questionCount++;
                updateScore();
                document.getElementById('feedback').textContent = '太棒了！答对了！';
                document.getElementById('feedback').className = 'feedback correct';
                playSound('correct');
                
                // 延迟后渲染新问题
                setTimeout(() => {
                    window._decompFilled = false;
                    window._decompTarget = null; // 清空旧值
                    window._decompKnown = null; // 清空旧值
                    window._decompAnswer = null; // 清空旧值
                    renderQuestion();
                }, 800);
            } else {
                document.getElementById('feedback').textContent = '再试一次吧！';
                document.getElementById('feedback').className = 'feedback incorrect';
                playSound('wrong');
                
                // 延迟后重置
                setTimeout(() => {
                    if (blank) blank.innerHTML = `<span class='placeholder'>?</span>`;
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
                <div class='comp-blank' id='compBlank1' ondragover='event.preventDefault()' ondrop='dropComp(event,1)'><span class='placeholder'>?</span></div>
                <span>+</span>
                <div class='comp-blank' id='compBlank2' ondragover='event.preventDefault()' ondrop='dropComp(event,2)'><span class='placeholder'>?</span></div>
                <span>=</span>
                <span class='target-number'>${target}</span>
            </div>
            <div class='comp-options' style='display:flex;justify-content:center;gap:20px;margin-top:30px;'>
                ${options.map(num => `<div class='number-option' draggable='true' ondragstart='dragComp(event,${num})'>${num}</div>`).join('')}
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
            <div class='arithmetic-problem' style='font-size:2em;margin:20px 0;'>
                <span>${num1}</span> <span>${op}</span> <span>${num2}</span> = ?
            </div>
            <div class='number-options'>
                ${options.map(num => `<div class='number-option' onclick='checkArithmetic(${num1},${num2},\'${op}\',${num})'>${num}</div>`).join('')}
            </div>
        </div>
    `;
}

function checkAnswer(selected, correct) {
    if (selected === correct) {
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
    setTimeout(renderQuestion, 1000);
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
    const gameArea = document.getElementById('gameArea');
    const accuracy = ((totalScore / questionCount) * 100).toFixed(1);
    
    gameArea.innerHTML = `
        <div class="result-container">
            <h2>时间到！游戏结束！</h2>
            <div class="result-stats">
                <div class="score-display">
                    <span class="final-score">${totalScore}</span>
                    <span class="max-score">分</span>
                </div>
                <p>总题数：${questionCount}题</p>
                <p>正确率：${accuracy}%</p>
                <p>用时：120秒</p>
            </div>
            <div class="result-message">
                ${getResultMessage(accuracy)}
            </div>
            <div class="result-buttons">
                <button onclick="startGame()" class="restart-btn">再玩一次</button>
                <button onclick="showSetupOnly()" class="home-btn">返回首页</button>
            </div>
        </div>
    `;
}

function getResultMessage(accuracy) {
    if (accuracy >= 90) {
        return '<p class="result-excellent">太棒了！你是最棒的！</p>';
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
    playSound('drag');
};

window.dropComp = function(event, slotIndex) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    if (window._compFilled[slotIndex-1] !== null) return;
    
    const num = parseInt(event.dataTransfer.getData('text/plain'));
    const blank = document.getElementById(`compBlank${slotIndex}`);
    blank.innerHTML = `<span class='filled'>${num}</span>`;
    
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
                }, 800);
            } else {
                document.getElementById('feedback').textContent = '再试一次吧！';
                document.getElementById('feedback').className = 'feedback incorrect';
                playSound('wrong');
                setTimeout(() => {
                    // 重置填充状态
                    document.getElementById('compBlank1').innerHTML = `<span class='placeholder'>?</span>`;
                    document.getElementById('compBlank2').innerHTML = `<span class='placeholder'>?</span>`;
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
    setTimeout(renderQuestion, 1000);
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