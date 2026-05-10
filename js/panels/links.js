/**
 * 链接收藏面板模块（mixin 模式）
 * 通过 Object.assign(OfficeDashboard.prototype, LinksPanel) 混入
 */
const LinksPanel = {

    /**
     * 初始化网站面板
     */
    initLinksPanel() {
        const panel = document.getElementById('linksPanel');
        const toggle = document.getElementById('linksToggle');
        const close = document.getElementById('linksClose');
        const linksList = document.getElementById('linksList');
        const addBtn = document.getElementById('addLinkBtn');
        const nameInput = document.getElementById('newLinkName');
        const urlInput = document.getElementById('newLinkUrl');

        if (!panel || !toggle) return;

        // 加载保存的网站
        this.loadLinks();

        // 切换面板
        toggle.addEventListener('click', () => {
            panel.classList.toggle('expanded');
        });

        if (close) {
            close.addEventListener('click', () => {
                panel.classList.remove('expanded');
            });
        }

        // 添加网站的处理函数
        const handleAddLink = () => {
            const name = nameInput ? nameInput.value.trim() : '';
            let url = urlInput ? urlInput.value.trim() : '';

            if (!name || !url) {
                this.showError('请输入网站名称和网址');
                return;
            }

            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }

            this.addLink(name, url);
            if (nameInput) nameInput.value = '';
            if (urlInput) urlInput.value = '';
            if (nameInput) nameInput.focus();
        };

        // 点击按钮添加
        if (addBtn) {
            addBtn.addEventListener('click', handleAddLink);
        }

        // 回车键添加
        if (urlInput) {
            urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLink();
                }
            });
        }
        if (nameInput) {
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (urlInput && !urlInput.value.trim()) {
                        urlInput.focus();
                    } else {
                        handleAddLink();
                    }
                }
            });
        }

        // 监听网站同步事件
        document.addEventListener('linksSynced', (e) => {
            this.renderLinks(e.detail.links);
        });
    },

    /**
     * 加载网站列表
     */
    loadLinks() {
        let links;
        const saved = SecurityUtils.safeGetStorage('office_links');

        const needsUpdate = this.checkLinksNeedUpdate(saved);

        if (saved && !needsUpdate) {
            links = safeJsonParse(saved, null);
            if (!Array.isArray(links) || links.length === 0) {
                links = this.getDefaultLinks();
            }
        } else if (saved && needsUpdate) {
            links = safeJsonParse(saved, null);
            if (!Array.isArray(links)) {
                links = this.getDefaultLinks();
            } else {
                const defaultLinks = this.getDefaultLinks();
                defaultLinks.forEach(defaultLink => {
                    const existingIndex = links.findIndex(l => l.url === defaultLink.url);
                    if (existingIndex >= 0) {
                        links[existingIndex].icon = defaultLink.icon;
                        links[existingIndex].name = defaultLink.name;
                    } else {
                        links.push(defaultLink);
                    }
                });
                links = links.filter(l => !l.url || (!l.url.includes('weread.qq.com') && !l.url.includes('tjj.suzhou.gov.cn')));
            }
        } else {
            links = this.getDefaultLinks();
        }

        // 确保数据保存到localStorage
        SecurityUtils.safeSetStorage('office_links', JSON.stringify(links));
        this.renderLinks(links);
    },

    /**
     * 检查网站列表是否需要更新
     */
    checkLinksNeedUpdate(saved) {
        if (!saved) return true;

        const links = safeJsonParse(saved, null);
        if (!Array.isArray(links) || links.length === 0) return true;

        const hasOldDefault = links.some(l =>
            l.url && l.url.includes('weread.qq.com')
        );

        const defaultLinks = this.getDefaultLinks();
        const hasNewDefaults = defaultLinks.every(defaultLink =>
            links.some(l => l.url === defaultLink.url)
        );

        const hasWrongIcon = defaultLinks.some(defaultLink => {
            const existingLink = links.find(l => l.url === defaultLink.url);
            return existingLink && existingLink.icon !== defaultLink.icon;
        });

        return hasOldDefault || !hasNewDefaults || hasWrongIcon;
    },

    /**
     * 获取默认网站
     */
    getDefaultLinks() {
        return [
            { name: '中国政府网', url: 'https://www.gov.cn/', icon: '🏢' },
            { name: '江苏政府网', url: 'https://www.jiangsu.gov.cn/', icon: '🏢' },
            { name: '苏州政府网', url: 'https://www.suzhou.gov.cn/', icon: '🏢' },
            { name: '百度', url: 'https://www.baidu.com/', icon: '🔎' }
        ];
    },

    /**
     * 根据URL自动识别图标
     */
    getAutoIcon(url) {
        if (!url) return '🔗';

        const urlLower = url.toLowerCase();

        // 政府网站 - 使用办公大楼图标
        if (urlLower.includes('.gov.') || urlLower.includes('政府')) {
            return '🏢';
        }

        // 统计、数据类
        if (urlLower.includes('stat') || urlLower.includes('统计') || urlLower.includes('data')) {
            return '📈';
        }

        // 搜索引擎
        if (urlLower.includes('baidu') || urlLower.includes('google') || urlLower.includes('bing') ||
            urlLower.includes('sogou') || urlLower.includes('360') || urlLower.includes('search')) {
            return '🔎';
        }

        // 社交媒体
        if (urlLower.includes('weibo') || urlLower.includes('微博')) {
            return '📱';
        }
        if (urlLower.includes('weixin') || urlLower.includes('微信') || urlLower.includes('wechat')) {
            return '💬';
        }
        if (urlLower.includes('douyin') || urlLower.includes('tiktok') || urlLower.includes('抖音')) {
            return '🎵';
        }

        // 视频网站
        if (urlLower.includes('bilibili') || urlLower.includes('哔哩')) {
            return '📺';
        }
        if (urlLower.includes('youku') || urlLower.includes('优酷') || urlLower.includes('iqiyi') ||
            urlLower.includes('爱奇艺') || urlLower.includes('video')) {
            return '🎬';
        }

        // 新闻资讯
        if (urlLower.includes('news') || urlLower.includes('新闻') || urlLower.includes('xinwen')) {
            return '📰';
        }

        // 购物电商
        if (urlLower.includes('taobao') || urlLower.includes('淘宝') || urlLower.includes('jd') ||
            urlLower.includes('京东') || urlLower.includes('shop') || urlLower.includes('商城')) {
            return '🛒';
        }

        // 邮箱
        if (urlLower.includes('mail') || urlLower.includes('邮箱') || urlLower.includes('email')) {
            return '📧';
        }

        // 文档/办公
        if (urlLower.includes('doc') || urlLower.includes('文档') || urlLower.includes('office')) {
            return '📄';
        }
        if (urlLower.includes('sheet') || urlLower.includes('表格') || urlLower.includes('excel')) {
            return '📊';
        }

        // 教育/学习
        if (urlLower.includes('edu') || urlLower.includes('学') || urlLower.includes('课')) {
            return '🎓';
        }

        // 银行/金融
        if (urlLower.includes('bank') || urlLower.includes('银行') || urlLower.includes('金融') ||
            urlLower.includes('fund') || urlLower.includes('基金')) {
            return '🏦';
        }

        // 工具/开发
        if (urlLower.includes('github') || urlLower.includes('git') || urlLower.includes('code')) {
            return '💻';
        }
        if (urlLower.includes('tool') || urlLower.includes('工具')) {
            return '🔧';
        }

        // AI相关
        if (urlLower.includes('ai') || urlLower.includes('gpt') || urlLower.includes('chat') ||
            urlLower.includes('kimi') || urlLower.includes('deepseek')) {
            return '🤖';
        }

        // 默认
        return '🔗';
    },

    /**
     * 渲染网站列表（支持拖动排序）
     */
    renderLinks(links) {
        const linksList = document.getElementById('linksList');
        if (!linksList) return;

        const fragment = document.createDocumentFragment();

        links.forEach((link, index) => {
            const item = document.createElement('div');
            item.className = 'link-item';
            item.dataset.index = String(index);
            item.draggable = true;
            if (SecurityUtils.isValidUrl(link.url)) {
                item.dataset.url = link.url;
            }

            const dragHandle = document.createElement('span');
            dragHandle.className = 'link-drag';
            dragHandle.title = '拖动排序';
            dragHandle.textContent = '⋮⋮';

            const iconEl = document.createElement('span');
            iconEl.className = 'link-icon';
            iconEl.textContent = link.icon || '🔗';

            const nameEl = document.createElement('span');
            nameEl.className = 'link-name';
            nameEl.textContent = link.name || '';

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'link-delete';
            deleteBtn.dataset.index = String(index);
            deleteBtn.title = '删除';
            deleteBtn.textContent = '×';

            item.append(dragHandle, iconEl, nameEl, deleteBtn);
            fragment.appendChild(item);
        });

        linksList.replaceChildren(fragment);

        linksList.querySelectorAll('.link-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('link-delete') || e.target.classList.contains('link-drag')) return;
                const url = item.dataset.url;
                if (url) {
                    window.open(url, '_blank', 'noopener');
                }
            });
        });

        linksList.querySelectorAll('.link-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                this.deleteLink(index);
            });
        });

        this.initLinksDragSort(linksList);
    },

    /**
     * 初始化网站拖动排序
     */
    initLinksDragSort(container) {
        let draggedItem = null;
        let currentLinks = [];

        const saved = SecurityUtils.safeGetStorage('office_links');
        if (saved) {
            currentLinks = safeJsonParse(saved, []);
        }

        container.querySelectorAll('.link-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedItem = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                container.querySelectorAll('.link-item').forEach(i => {
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

                // 根据当前DOM顺序重新构建链接列表
                const newOrder = [];
                const items = container.querySelectorAll('.link-item');

                items.forEach((el, newIdx) => {
                    const oldIdx = parseInt(el.dataset.index);
                    if (currentLinks[oldIdx]) {
                        newOrder.push(currentLinks[oldIdx]);
                    }
                    // 更新索引
                    el.dataset.index = newIdx;
                });

                // 更新缓存和localStorage
                currentLinks = newOrder;
                SecurityUtils.safeSetStorage('office_links', JSON.stringify(newOrder));
                this.syncLinksToCloud(newOrder);
            });
        });
    },

    /**
     * 添加网站
     */
    addLink(name, url) {
        // 安全验证
        name = SecurityUtils.sanitizeInput(name, 50);
        url = SecurityUtils.sanitizeInput(url, 500);

        if (!name) {
            this.showError('请输入有效的网站名称');
            return;
        }

        if (!SecurityUtils.isValidUrl(url)) {
            this.showError('请输入有效的网址（以http://或https://开头）');
            return;
        }

        let links = [];
        const saved = SecurityUtils.safeGetStorage('office_links');
        if (saved) {
            const parsed = safeJsonParse(saved, []);
            if (Array.isArray(parsed)) {
                links = parsed;
            }
        }

        links.push({ name, url, icon: this.getAutoIcon(url) });
        SecurityUtils.safeSetStorage('office_links', JSON.stringify(links));
        this.renderLinks(links);
        this.showSuccess('网站已添加: ' + name);

        // 云端同步
        this.syncLinksToCloud(links);
    },

    /**
     * 删除网站
     */
    deleteLink(index) {
        const saved = SecurityUtils.safeGetStorage('office_links');
        let links = saved ? safeJsonParse(saved, []) : [];

        links.splice(index, 1);
        SecurityUtils.safeSetStorage('office_links', JSON.stringify(links));
        this.renderLinks(links);

        // 云端同步
        this.syncLinksToCloud(links);
    },

    /**
     * 同步网站到云端
     */
    async syncLinksToCloud(links) {
        if (syncManager.isLoggedIn()) {
            // 更新syncData中的links
            SecurityUtils.safeSetStorage('office_links', JSON.stringify(links));
            await syncManager.immediateSyncToCloud();
        }
    }

};
