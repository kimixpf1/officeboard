/**
 * 工具面板模块（mixin 模式）
 * 含工具列表、计算器、倒计时器
 * 通过 Object.assign(OfficeDashboard.prototype, ToolsPanel) 混入
 */
const ToolsPanel = {

    initToolsPanel() {
        const panel = document.getElementById('toolsPanel');
        const toggle = document.getElementById('toolsToggle');
        const close = document.getElementById('toolsClose');

        if (!panel || !toggle) return;

        // 加载并渲染工具
        this.loadTools();

        toggle.addEventListener('click', () => {
            panel.classList.toggle('expanded');
        });

        if (close) {
            close.addEventListener('click', () => {
                panel.classList.remove('expanded');
            });
        }
    },

    /**
     * 获取默认工具列表
     */
    getDefaultTools() {
        return [
            { id: 'kimi', name: 'Kimi', icon: 'K', type: 'link', url: 'https://kimi.moonshot.cn/', iconClass: 'ai' },
            { id: 'deepseek', name: 'DeepSeek', icon: 'D', type: 'link', url: 'https://chat.deepseek.com/', iconClass: 'ai' },
            { id: 'doubao', name: '豆包', icon: '豆', type: 'link', url: 'https://www.doubao.com/chat/', iconClass: 'ai' },
            { id: 'calculator', name: '计算器', icon: '计', type: 'tool', iconClass: 'calc' },
            { id: 'weather', name: '天气', icon: '天', type: 'tool', iconClass: 'weather' },
            { id: 'timer', name: '倒计时', icon: '时', type: 'tool', iconClass: 'timer' }
        ];
    },

    /**
     * 加载工具列表
     */
    loadTools() {
        const saved = SecurityUtils.safeGetStorage('office_tools');
        let tools = saved ? safeJsonParse(saved, null) : null;
        if (!Array.isArray(tools) || tools.length === 0) {
            tools = this.getDefaultTools();
        }
        SecurityUtils.safeSetStorage('office_tools', JSON.stringify(tools));
        this.renderTools(tools);
    },

    /**
     * 渲染工具列表
     */
    renderTools(tools) {
        const grid = document.getElementById('toolsGrid');
        if (!grid) return;

        const fragment = document.createDocumentFragment();

        tools.forEach((tool, index) => {
            const isLink = tool.type === 'link';
            const item = document.createElement(isLink ? 'a' : 'div');
            item.className = 'tool-item';
            item.dataset.index = String(index);
            item.draggable = true;

            if (isLink) {
                if (SecurityUtils.isValidUrl(tool.url)) {
                    item.href = tool.url;
                }
                item.target = '_blank';
                item.rel = 'noopener noreferrer';
            } else {
                item.dataset.tool = tool.id;
            }

            const dragHandle = document.createElement('span');
            dragHandle.className = 'tool-drag';
            dragHandle.title = '拖动排序';
            dragHandle.textContent = '⋮⋮';

            const icon = document.createElement('div');
            icon.className = `tool-icon ${tool.iconClass}`;
            icon.textContent = tool.icon;

            const name = document.createElement('span');
            name.textContent = tool.name;

            item.append(dragHandle, icon, name);
            fragment.appendChild(item);
        });

        grid.replaceChildren(fragment);

        grid.querySelectorAll('.tool-item[data-tool]').forEach(item => {
            item.addEventListener('click', () => {
                const toolId = item.dataset.tool;
                this.openTool(toolId);
            });
        });

        this.initToolsDragSort(grid);
    },

    /**
     * 初始化工具拖动排序
     */
    initToolsDragSort(container) {
        let draggedItem = null;
        let currentTools = []; // 缓存当前工具列表

        const saved = SecurityUtils.safeGetStorage('office_tools');
        currentTools = saved ? safeJsonParse(saved, []) : [];
        if (!Array.isArray(currentTools) || currentTools.length === 0) {
            currentTools = this.getDefaultTools();
        }

        container.querySelectorAll('.tool-item').forEach(item => {
            // <a>标签需要设置draggable属性
            if (item.tagName === 'A') {
                item.setAttribute('draggable', 'true');
            }

            item.addEventListener('dragstart', (e) => {
                draggedItem = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                // 阻止<a>标签的默认点击行为
                e.stopPropagation();
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                container.querySelectorAll('.tool-item').forEach(i => {
                    i.classList.remove('drag-over');
                });
                draggedItem = null;
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';

                const draggingItem = container.querySelector('.dragging');
                if (draggingItem && draggingItem !== item) {
                    const rect = item.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;

                    if (e.clientY < midY) {
                        item.parentNode.insertBefore(draggingItem, item);
                    } else {
                        item.parentNode.insertBefore(draggingItem, item.nextSibling);
                    }
                }
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();

                // 根据当前DOM顺序重新构建工具列表
                const newOrder = [];
                const items = container.querySelectorAll('.tool-item');

                items.forEach((el, newIdx) => {
                    const oldIdx = parseInt(el.dataset.index);
                    if (currentTools[oldIdx]) {
                        newOrder.push(currentTools[oldIdx]);
                    }
                    // 更新索引
                    el.dataset.index = newIdx;
                });

                // 更新缓存和localStorage
                currentTools = newOrder;
                SecurityUtils.safeSetStorage('office_tools', JSON.stringify(newOrder));
            });
        });
    },

    /**
     * 初始化工具弹窗
     */
    initToolModals() {
        // 关闭弹窗按钮
        document.querySelectorAll('.tool-modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.dataset.close;
                if (modalId) {
                    document.getElementById(modalId).classList.remove('active');
                }
            });
        });

        // 点击遮罩关闭
        document.querySelectorAll('.tool-modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // 工具项点击
        document.querySelectorAll('.tool-item[data-tool]').forEach(item => {
            item.addEventListener('click', () => {
                const tool = item.dataset.tool;
                this.openTool(tool);
            });
        });

        // 计算器按钮
        document.querySelectorAll('.calc-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = btn.dataset.calc;
                this.calcInput(val);
            });
        });

        // 计算器键盘支持
        document.addEventListener('keydown', (e) => {
            const calculatorModal = document.getElementById('calculatorModal');
            if (!calculatorModal || !calculatorModal.classList.contains('active')) return;

            const key = e.key;
            const keyMap = {
                '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
                '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
                '+': '+', '-': '-', '*': '*', '/': '/', '.': '.',
                'Enter': '=', '=': '=', 'Escape': 'C', 'c': 'C', 'C': 'C',
                'Backspace': 'backspace', '%': '%'
            };

            if (keyMap[key]) {
                e.preventDefault();
                if (keyMap[key] === 'backspace') {
                    // 退格删除最后一个字符
                    const display = document.getElementById('calcDisplay');
                    if (display) display.value = display.value.slice(0, -1);
                } else {
                    this.calcInput(keyMap[key]);
                }
            }
        });

        // 倒计时
        this.initTimer();
    },

    /**
     * 打开工具
     */
    openTool(tool) {
        const modal = document.getElementById(tool + 'Modal');
        if (modal) {
            modal.classList.add('active');

            if (tool === 'weather') {
                this.loadWeather();
            }
        }
    },

    /**
     * 计算器输入
     */
    safeMathEval(expr) {
        const sanitized = expr.replace(/\s/g, '');
        if (!/^[0-9+\-*/.()%]+$/.test(sanitized)) {
            throw new Error('非法字符');
        }
        const fn = new Function('return (' + sanitized + ')');
        const result = fn();
        if (typeof result !== 'number' || !isFinite(result)) {
            throw new Error('计算错误');
        }
        return result;
    },

    calcInput(val) {
        const display = document.getElementById('calcDisplay');
        if (!display) return;

        let current = display.value;

        if (val === 'C') {
            display.value = '';
        } else if (val === '±') {
            if (current.startsWith('-')) {
                display.value = current.substring(1);
            } else if (current) {
                display.value = '-' + current;
            }
        } else if (val === '%') {
            try {
                display.value = this.safeMathEval(current) / 100;
            } catch (e) {
                console.warn('计算器百分比运算失败:', e.message);
            }
        } else if (val === '=') {
            try {
                display.value = this.safeMathEval(current);
            } catch (e) {
                display.value = 'Error';
            }
        } else {
            display.value = current + val;
        }
    },

    /**
     * 初始化倒计时
     */
    initTimer() {
        const display = document.getElementById('timerDisplay');
        const startBtn = document.getElementById('timerStart');
        const pauseBtn = document.getElementById('timerPause');
        const resetBtn = document.getElementById('timerReset');
        const hoursInput = document.getElementById('timerHours');
        const minutesInput = document.getElementById('timerMinutes');
        const secondsInput = document.getElementById('timerSeconds');

        if (!display || !startBtn) return;

        let timer = null;
        let remaining = 0;

        const updateDisplay = () => {
            const h = Math.floor(remaining / 3600);
            const m = Math.floor((remaining % 3600) / 60);
            const s = remaining % 60;
            display.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        };

        startBtn.addEventListener('click', () => {
            if (timer) return;

            if (remaining === 0) {
                const h = parseInt(hoursInput.value) || 0;
                const m = parseInt(minutesInput.value) || 0;
                const s = parseInt(secondsInput.value) || 0;
                remaining = h * 3600 + m * 60 + s;
            }

            if (remaining <= 0) return;

            startBtn.disabled = true;
            pauseBtn.disabled = false;

            timer = setInterval(() => {
                remaining--;
                updateDisplay();

                if (remaining <= 0) {
                    clearInterval(timer);
                    timer = null;
                    startBtn.disabled = false;
                    pauseBtn.disabled = true;
                    alert('时间到！');
                }
            }, 1000);
        });

        pauseBtn.addEventListener('click', () => {
            if (timer) {
                clearInterval(timer);
                timer = null;
                startBtn.disabled = false;
                pauseBtn.disabled = true;
            }
        });

        resetBtn.addEventListener('click', () => {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
            remaining = 0;
            updateDisplay();
            startBtn.disabled = false;
            pauseBtn.disabled = true;
        });
    }

};
