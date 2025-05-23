// 全局变量
let currentGame = null;
let timer = null;
let timeLeft = 120;
let totalScore = 0;
let currentProgress = 0;
let minNumber = 1;
let maxNumber = 20;
let currentGameType = 'quick-count';
let lastQuestion = null;
let questionCount = 0;
const maxQuestions = 10;

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

// 音效加载
const audioCorrect = new Audio('sounds/correct.mp3');
const audioWrong = new Audio('sounds/wrong.mp3');
const audioDrag = new Audio('sounds/drag.mp3');
function playCorrect() { try { audioCorrect.currentTime = 0; audioCorrect.play(); } catch(e){} }
function playWrong() { try { audioWrong.currentTime = 0; audioWrong.play(); } catch(e){} }
function playDrag() { try { audioDrag.currentTime = 0; audioDrag.play(); } catch(e){} }

// 页面加载后只显示设置区
function showSetupOnly() {
    document.getElementById('setupSection').style.display = 'flex';
    document.getElementById('gameArea').style.display = 'none';
    document.querySelector('.timer').style.display = 'none';
    document.querySelector('.total-score').style.display = 'none';
    document.querySelector('nav').style.display = 'none';
    document.querySelectorAll('.game-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById('feedback').textContent = '';
    clearInterval(timer);
}

// 点击开始游戏
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
    currentProgress = 0;
    lastQuestion = null;
    document.getElementById('setupSection').style.display = 'none';
    document.getElementById('gameArea').style.display = '';
    document.getElementById('totalScore').textContent = totalScore;
    updateTimer();
    updateProgress();
    clearInterval(timer);
    startTimer();
    renderQuestion();
    addBackHomeBtn();
}

// 修改 showSection 只切换游戏，不重置设置
function showSection(sectionId) {
    if (currentGame) {
        clearInterval(timer);
        timer = null;
    }
    document.querySelectorAll('.game-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
    timeLeft = 120;
    currentProgress = 0;
    updateTimer();
    updateProgress(sectionId);
    currentGame = sectionId;
    initGame(sectionId);
    startTimer();
}

// 计时器功能
function startTimer() {
    document.querySelector('.timer').style.display = '';
    document.querySelector('.total-score').style.display = '';
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

function updateProgress(gameId) {
    const progressBar = document.getElementById(gameId + 'Progress');
    if (progressBar) {
        progressBar.style.width = (currentProgress * 100) + '%';
    }
}

// 修改所有题目生成逻辑，使用 minNumber/maxNumber
function getRandomNumber(min, max) {
    min = Math.max(min, minNumber);
    max = Math.min(max, maxNumber);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 解绑旧事件，防止重复绑定
function unbindGlobalEvents() {
    document.removeEventListener('dragover', dragOverHandler);
    document.removeEventListener('dragleave', dragLeaveHandler);
    document.removeEventListener('drop', dropHandler);
    document.removeEventListener('touchstart', touchStartHandler);
    document.removeEventListener('touchend', touchEndHandler);
    document.removeEventListener('touchmove', touchMoveHandler);
}
function dragOverHandler(e) {
    if (e.target.classList.contains('decomp-blank') || e.target.classList.contains('comp-blank')) {
        e.preventDefault();
        e.target.classList.add('dragover');
    }
}
function dragLeaveHandler(e) {
    if (e.target.classList.contains('decomp-blank') || e.target.classList.contains('comp-blank')) {
        e.target.classList.remove('dragover');
    }
}
function dropHandler(e) {
    if (e.target.classList.contains('decomp-blank') || e.target.classList.contains('comp-blank')) {
        e.target.classList.remove('dragover');
    }
}
function touchStartHandler(e) {
    const target = e.target;
    if (target.classList.contains('number-option') && target.getAttribute('draggable') === 'true') {
        target.classList.add('dragging');
        window._touchDragNum = parseInt(target.textContent);
        playDrag();
        e.preventDefault();
    }
    // 触摸空格时填入数字
    const blank = e.target.closest('.decomp-blank, .comp-blank');
    if (blank && window._touchDragNum != null) {
        if (blank.classList.contains('decomp-blank')) {
            if (!window._decompFilled) {
                blank.innerHTML = `<span class='filled'>${window._touchDragNum}</span>`;
                window._decompFilled = true;
                document.querySelectorAll('.decomp-options .number-option').forEach(opt => {
                    if (parseInt(opt.textContent) === window._touchDragNum) opt.classList.add('used');
                });
                setTimeout(() => {
                    if (window._decompKnown + window._touchDragNum === window._decompTarget) {
                        playCorrect();
                        totalScore++;
                        questionCount++;
                        document.getElementById('totalScore').textContent = totalScore;
                        updateProgress();
                        document.getElementById('feedback').textContent = '太棒了！答对了！';
                        document.getElementById('feedback').className = 'feedback correct';
                        setTimeout(renderQuestion, 800);
                    } else {
                        playWrong();
                        document.getElementById('feedback').textContent = '再试一次吧！';
                        document.getElementById('feedback').className = 'feedback incorrect';
                        setTimeout(() => {
                            blank.innerHTML = `<span class='placeholder'>?</span>`;
                            window._decompFilled = false;
                            document.querySelectorAll('.decomp-options .number-option').forEach(opt => opt.classList.remove('used'));
                            document.getElementById('feedback').textContent = '';
                            document.getElementById('feedback').className = 'feedback';
                        }, 800);
                    }
                }, 300);
            }
        } else if (blank.classList.contains('comp-blank')) {
            const idx = blank.id === 'compBlank1' ? 1 : 2;
            blank.innerHTML = `<span class='filled'>${window._touchDragNum}</span>`;
            window._compFilled[idx-1] = window._touchDragNum;
            document.querySelectorAll('.comp-options .number-option').forEach(opt => {
                if (parseInt(opt.textContent) === window._touchDragNum) opt.classList.add('used');
            });
            if (window._compFilled[0] !== null && window._compFilled[1] !== null) {
                setTimeout(() => {
                    const sum = window._compFilled[0] + window._compFilled[1];
                    if (sum === window._compTarget) {
                        playCorrect();
                        totalScore++;
                        questionCount++;
                        document.getElementById('totalScore').textContent = totalScore;
                        updateProgress();
                        document.getElementById('feedback').textContent = '太棒了！答对了！';
                        document.getElementById('feedback').className = 'feedback correct';
                        setTimeout(renderQuestion, 800);
                    } else {
                        playWrong();
                        document.getElementById('feedback').textContent = '再试一次吧！';
                        document.getElementById('feedback').className = 'feedback incorrect';
                        setTimeout(() => {
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
        }
        window._touchDragNum = null;
    }
}
function touchEndHandler(e) {
    const dragging = document.querySelector('.number-option.dragging');
    if (dragging) dragging.classList.remove('dragging');
    window._touchDragNum = null;
}
function touchMoveHandler(e) {
    // 可扩展为拖动跟随手指动画
}

// 渲染题目时先解绑事件再清空再渲染
function renderQuestion() {
    if (questionCount >= maxQuestions) {
        clearInterval(timer);
        showResult();
        return;
    }
    unbindGlobalEvents();
    let q;
    do {
        if (currentGameType === 'quick-count') q = genQuickCount();
        if (currentGameType === 'decomposition') q = genDecomposition();
        if (currentGameType === 'composition') q = genComposition();
        if (currentGameType === 'arithmetic') q = genArithmetic();
    } while (lastQuestion && JSON.stringify(q.data) === JSON.stringify(lastQuestion.data));
    lastQuestion = q;
    // 先清空再渲染
    const gameContent = document.getElementById('gameContent');
    gameContent.innerHTML = '';
    gameContent.innerHTML = q.html;
    document.getElementById('feedback').textContent = '';
    addBackHomeBtn();
    // 重新绑定全局事件
    document.addEventListener('dragover', dragOverHandler);
    document.addEventListener('dragleave', dragLeaveHandler);
    document.addEventListener('drop', dropHandler);
    document.addEventListener('touchstart', touchStartHandler, {passive: false});
    document.addEventListener('touchend', touchEndHandler);
    document.addEventListener('touchmove', touchMoveHandler);
}

// 首页按钮选择游戏类型，数的分解时显示乱序选项
function setupGameTypeBtns() {
    const btns = document.querySelectorAll('.game-type-btn');
    btns.forEach(btn => {
        btn.onclick = function() {
            btns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentGameType = this.getAttribute('data-type');
            // 只在数的分解时显示乱序选项
            const decompGroup = document.getElementById('decompRandomGroup');
            if (currentGameType === 'decomposition') {
                decompGroup.style.display = '';
            } else {
                decompGroup.style.display = 'none';
            }
        };
    });
}

// 游戏区右上角返回首页按钮
function addBackHomeBtn() {
    let header = document.querySelector('.game-header');
    if (!document.getElementById('backHomeBtn')) {
        const btn = document.createElement('button');
        btn.id = 'backHomeBtn';
        btn.textContent = '返回首页';
        btn.style.cssText = 'position:absolute;right:10px;top:10px;background:#ff6b6b;color:#fff;border:none;border-radius:15px;padding:8px 18px;font-size:1em;cursor:pointer;z-index:10;';
        btn.onclick = () => {
            clearInterval(timer);
            showSetupOnly();
        };
        header.style.position = 'relative';
        header.appendChild(btn);
    }
}

// 一眼识数
function genQuickCount() {
    const ballCount = getRandomNumber(minNumber, maxNumber);
    let options = new Set([ballCount]);
    while (options.size < 4) options.add(getRandomNumber(minNumber, maxNumber));
    options = Array.from(options).sort(() => Math.random() - 0.5);
    let html = `<div class='balls-container' style='position:relative;height:220px;'>`;
    const areaW = 320, areaH = 200, r = 20;
    let positions = [];
    for (let i = 0; i < ballCount; i++) {
        let x, y, tryCount = 0;
        do {
            x = Math.random() * (areaW - 2*r);
            y = Math.random() * (areaH - 2*r);
            tryCount++;
        } while (positions.some(p => Math.hypot(p.x-x, p.y-y) < 2.2*r) && tryCount < 50);
        positions.push({x, y});
        html += `<div class='ball' style='position:absolute;left:${x}px;top:${y}px;'></div>`;
    }
    html += `</div><div class='number-options'>`;
    options.forEach(num => {
        html += `<div class='number-option' onclick='checkQuickCount(${num},${ballCount})'>${num}</div>`;
    });
    html += `</div>`;
    return {html, data: {ballCount, options}};
}
window.checkQuickCount = function(selected, correct) {
    if (selected === correct) {
        playCorrect();
        totalScore++;
        questionCount++;
        document.getElementById('totalScore').textContent = totalScore;
        updateProgress('quick-count');
        document.getElementById('feedback').textContent = '太棒了！答对了！';
        setTimeout(renderQuestion, 800);
    } else {
        playWrong();
        document.getElementById('feedback').textContent = '再试一次吧！';
    }
}

// 数的分解（拖拽版）
function genDecomposition() {
    let target;
    const decompRandom = document.getElementById('decompRandom')?.checked;
    if (decompRandom) {
        target = getRandomNumber(Math.max(minNumber+1, 5), maxNumber);
    } else {
        target = maxNumber;
    }
    const knownNum = getRandomNumber(minNumber, target-1);
    const answer = target - knownNum;
    let options = new Set([answer]);
    while (options.size < 4) options.add(getRandomNumber(minNumber, target-1));
    options = Array.from(options).sort(() => Math.random() - 0.5);
    let html = `<div class='triangle-layout' style='margin-bottom:30px;position:relative;'>
        <div class='target-number' style='z-index:2;position:relative;'>${target}</div>
        <svg width='120' height='80' style='position:absolute;left:50%;top:60px;transform:translateX(-50%);z-index:1;pointer-events:none;'>
            <line x1='60' y1='10' x2='20' y2='70' stroke='#4ecdc4' stroke-width='3'/>
            <line x1='60' y1='10' x2='100' y2='70' stroke='#4ecdc4' stroke-width='3'/>
        </svg>
        <div class='decomposition-inputs' style='position:relative;z-index:2;gap:60px;margin-top:40px;'>
            <div class='known-number'>${knownNum}</div>
            <div class='decomp-blank' id='decompBlank' ondragover='event.preventDefault()' ondrop='dropDecomp(event,${answer})'>
                <span class='placeholder' style='font-size:inherit;'>?</span>
            </div>
        </div>
    </div>
    <div class='decomp-options' style='display:flex;justify-content:center;gap:20px;margin-top:30px;'>
        ${options.map(num => `<div class='number-option' draggable='true' ondragstart='dragDecomp(event,${num})'>${num}</div>`).join('')}
    </div>`;
    window._decompAnswer = answer;
    window._decompKnown = knownNum;
    window._decompTarget = target;
    window._decompFilled = false;
    return {html, data: {target, knownNum, answer, options}};
}
window.dragDecomp = function(event, num) {
    event.dataTransfer.setData('text/plain', num);
    event.target.classList.add('dragging');
    playDrag();
};
window.dropDecomp = function(event, answer) {
    if (window._decompFilled) return;
    const num = parseInt(event.dataTransfer.getData('text/plain'));
    const blank = document.getElementById('decompBlank');
    blank.innerHTML = `<span class='filled' style='font-size:inherit;'>${num}</span>`;
    window._decompFilled = true;
    document.querySelectorAll('.decomp-options .number-option').forEach(opt => {
        if (parseInt(opt.textContent) === num) opt.classList.add('used');
    });
    blank.classList.remove('dragover');
    setTimeout(() => {
        if (window._decompKnown + num === window._decompTarget) {
            playCorrect();
            totalScore++;
            questionCount++;
            document.getElementById('totalScore').textContent = totalScore;
            updateProgress();
            document.getElementById('feedback').textContent = '太棒了！答对了！';
            document.getElementById('feedback').className = 'feedback correct';
            setTimeout(renderQuestion, 800);
        } else {
            playWrong(); // 答错音效立即播放
            document.getElementById('feedback').textContent = '再试一次吧！';
            document.getElementById('feedback').className = 'feedback incorrect';
            setTimeout(() => {
                blank.innerHTML = `<span class='placeholder' style='font-size:inherit;'>?</span>`;
                window._decompFilled = false;
                document.querySelectorAll('.decomp-options .number-option').forEach(opt => opt.classList.remove('used'));
                document.getElementById('feedback').textContent = '';
                document.getElementById('feedback').className = 'feedback';
            }, 800);
        }
    }, 100); // 答错音效提前
};

// 数的组合（拖拽版）
function genComposition() {
    const target = getRandomNumber(Math.max(minNumber+1, 5), maxNumber);
    // 生成一组分解（保证两个数都在范围内）
    let num1 = getRandomNumber(minNumber, target-1);
    let num2 = target - num1;
    if (num2 < minNumber || num2 > maxNumber) {
        num2 = minNumber;
        num1 = target - num2;
    }
    // 生成选项
    let options = new Set([num1, num2]);
    while (options.size < 6) options.add(getRandomNumber(minNumber, maxNumber));
    options = Array.from(options).sort(() => Math.random() - 0.5);
    let html = `<div class='composition-layout' style='margin-bottom:30px;'>
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
    </div>`;
    window._compTarget = target;
    window._compFilled = [null, null];
    window._compAnswer = [num1, num2];
    return {html, data: {target, num1, num2, options}};
}
window.dragComp = function(event, num) {
    event.dataTransfer.setData('text/plain', num);
    event.target.classList.add('dragging');
    playDrag();
};
window.dropComp = function(event, idx) {
    const num = parseInt(event.dataTransfer.getData('text/plain'));
    const blank = document.getElementById('compBlank'+idx);
    blank.innerHTML = `<span class='filled'>${num}</span>`;
    window._compFilled[idx-1] = num;
    document.querySelectorAll('.comp-options .number-option').forEach(opt => {
        if (parseInt(opt.textContent) === num) opt.classList.add('used');
    });
    blank.classList.remove('dragover');
    if (window._compFilled[0] !== null && window._compFilled[1] !== null) {
        setTimeout(() => {
            const sum = window._compFilled[0] + window._compFilled[1];
            if (sum === window._compTarget) {
                playCorrect();
                totalScore++;
                questionCount++;
                document.getElementById('totalScore').textContent = totalScore;
                updateProgress();
                document.getElementById('feedback').textContent = '太棒了！答对了！';
                document.getElementById('feedback').className = 'feedback correct';
                setTimeout(renderQuestion, 800);
            } else {
                playWrong();
                document.getElementById('feedback').textContent = '再试一次吧！';
                document.getElementById('feedback').className = 'feedback incorrect';
                setTimeout(() => {
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

// 加减法
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
    let html = `<div class='arithmetic-layout'>
        <div class='arithmetic-problem'><span>${num1}</span> <span>${op}</span> <span>${num2}</span> = ?</div>
        <div class='number-options'>
            ${options.map(num => `<div class='number-option' onclick='checkArithmetic(${num1},${num2},\'${op}\',${num})'>${num}</div>`).join('')}
        </div>
    </div>`;
    return {html, data: {num1, num2, op, answer, options}};
}
window.checkArithmetic = function(num1, num2, op, selected) {
    let correct = op === '+' ? num1 + num2 : num1 - num2;
    if (selected === correct) {
        playCorrect();
        totalScore++;
        questionCount++;
        document.getElementById('totalScore').textContent = totalScore;
        updateProgress('arithmetic');
        document.getElementById('feedback').textContent = '太棒了！答对了！';
        setTimeout(renderQuestion, 800);
    } else {
        playWrong();
        document.getElementById('feedback').textContent = '再试一次吧！';
    }
}

// 辅助函数
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

function showResult() {
    setTimeout(() => {
        alert(`时间到！你的得分是：${totalScore} / ${questionCount}`);
        showSetupOnly();
    }, 100);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    setupGameTypeBtns();
    showSetupOnly();
    document.getElementById('startBtn').onclick = startGame;
}); 