/**
 * 通讯录面板模块（mixin 模式）
 * 通过 Object.assign(OfficeDashboard.prototype, ContactsPanel) 混入
 */
const ContactsPanel = {

    /**
     * 初始化通讯录面板
     */
    initContactsPanel() {
        const panel = document.getElementById('contactsPanel');
        const toggle = document.getElementById('contactsToggle');
        const close = document.getElementById('contactsClose');
        const searchInput = document.getElementById('contactsSearchInput');
        const searchBtn = document.getElementById('contactsSearchBtn');
        const clearSearchBtn = document.getElementById('contactsClearSearchBtn');
        const addBtn = document.getElementById('addContactBtn');
        const importFile = document.getElementById('importContactsFile');
        const nameInput = document.getElementById('newContactName');
        const phoneInput = document.getElementById('newContactPhone');

        if (!panel || !toggle) return;

        // 切换面板
        toggle.addEventListener('click', () => {
            panel.classList.toggle('expanded');
            if (panel.classList.contains('expanded')) {
                this.loadContacts();
            }
        });

        if (close) {
            close.addEventListener('click', () => {
                panel.classList.remove('expanded');
            });
        }

        // 添加联系人
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.addContact();
            });
        }

        // 回车添加
        if (phoneInput) {
            phoneInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addContact();
                }
            });
        }

        // 搜索按钮
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.filterContacts(searchInput?.value || '');
            });
        }

        // 回车搜索
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.filterContacts(searchInput.value);
                }
            });
            // 输入时显示/隐藏清除按钮
            searchInput.addEventListener('input', () => {
                if (searchInput.value && clearSearchBtn) {
                    clearSearchBtn.style.display = 'block';
                } else if (clearSearchBtn) {
                    clearSearchBtn.style.display = 'none';
                }
            });
        }

        // 清除搜索
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                clearSearchBtn.style.display = 'none';
                this.renderContacts(this.contacts);
            });
        }

        // 导入Excel
        if (importFile) {
            importFile.addEventListener('change', (e) => {
                this.importContactsFromExcel(e.target.files[0]);
            });
        }

        // 批量删除按钮
        const batchDeleteBtn = document.getElementById('batchDeleteContactsBtn');
        if (batchDeleteBtn) {
            batchDeleteBtn.addEventListener('click', () => {
                this.batchDeleteContacts();
            });
        }

        // 监听云端同步事件（其他设备更新时）
        document.addEventListener('contactsSynced', (e) => {
            const newContacts = e.detail.contacts;
            this.contacts = newContacts;
            const searchInput = document.getElementById('contactsSearchInput');
            const keyword = searchInput?.value?.trim() || '';
            if (keyword) {
                this.filterContacts(keyword);
            } else {
                this.renderContacts(newContacts);
            }
        });

        // 初始加载
        this.loadContacts();
    },

    /**
     * 加载通讯录
     */
    async loadContacts() {
        const saved = SecurityUtils.safeGetStorage('office_contacts');
        const contacts = saved ? safeJsonParse(saved, []) : [];
        this.contacts = contacts;
        this.renderContacts(contacts);
    },

    appendHighlightedText(container, text, keyword) {
        const normalizedText = typeof text === 'string' ? text : String(text || '');
        if (!keyword) {
            container.textContent = normalizedText;
            return;
        }

        const regex = new RegExp(`(${this.escapeRegex(keyword)})`, 'gi');
        const parts = normalizedText.split(regex);
        const fragment = document.createDocumentFragment();

        parts.forEach(part => {
            if (!part) return;

            if (part.toLowerCase() === keyword.toLowerCase()) {
                const mark = document.createElement('mark');
                mark.className = 'highlight';
                mark.textContent = part;
                fragment.appendChild(mark);
            } else {
                fragment.appendChild(document.createTextNode(part));
            }
        });

        container.replaceChildren(fragment);
    },

    createContactItem(contact, index, highlightKeyword) {
        const contactId = String(contact.id || index);
        const isMatched = highlightKeyword && (
            contact.name.toLowerCase().includes(highlightKeyword.toLowerCase()) ||
            contact.phone.includes(highlightKeyword) ||
            (contact.phone.length >= 4 && contact.phone.slice(-4) === highlightKeyword)
        );

        const item = document.createElement('div');
        item.className = `contact-item${isMatched ? ' matched' : ''}`;
        item.dataset.index = String(index);
        item.dataset.id = contactId;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'contact-checkbox';
        checkbox.dataset.id = contactId;
        checkbox.addEventListener('change', () => {
            this.updateBatchDeleteButton();
        });

        const info = document.createElement('div');
        info.className = 'contact-info';
        info.addEventListener('dblclick', () => {
            this.editContact(contactId);
        });

        const name = document.createElement('div');
        name.className = 'contact-name';
        this.appendHighlightedText(name, contact.name, highlightKeyword);

        const phone = document.createElement('div');
        phone.className = 'contact-phone';
        this.appendHighlightedText(phone, contact.phone, highlightKeyword);

        info.append(name, phone);

        const actions = document.createElement('div');
        actions.className = 'contact-actions';

        const callBtn = document.createElement('button');
        callBtn.type = 'button';
        callBtn.className = 'contact-call';
        callBtn.textContent = '拨打';
        callBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.open(`tel:${contact.phone}`);
        });

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'contact-edit';
        editBtn.dataset.id = contactId;
        editBtn.textContent = '编辑';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editContact(contactId);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'contact-delete';
        deleteBtn.dataset.id = contactId;
        deleteBtn.textContent = '删除';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteContact(contactId);
        });

        actions.append(callBtn, editBtn, deleteBtn);
        item.append(checkbox, info, actions);

        return item;
    },

    /**
     * 渲染通讯录列表
     * @param {Array} contacts - 联系人数组
     * @param {string} highlightKeyword - 高亮关键词（可选）
     */
    renderContacts(contacts, highlightKeyword = '') {
        const list = document.getElementById('contactsList');
        const status = document.getElementById('contactsStatus');

        if (!list) return;

        if (contacts.length === 0) {
            const emptyTip = document.createElement('div');
            emptyTip.style.textAlign = 'center';
            emptyTip.style.color = 'var(--text-secondary)';
            emptyTip.style.padding = '20px';
            emptyTip.textContent = '暂无联系人';
            list.replaceChildren(emptyTip);
            const batchDeleteBtn = document.getElementById('batchDeleteContactsBtn');
            if (batchDeleteBtn) batchDeleteBtn.style.display = 'none';
        } else {
            const fragment = document.createDocumentFragment();
            contacts.forEach((contact, index) => {
                fragment.appendChild(this.createContactItem(contact, index, highlightKeyword));
            });
            list.replaceChildren(fragment);
        }

        if (status) {
            status.textContent = `共 ${contacts.length} 个联系人`;
        }
    },

    /**
     * 更新批量删除按钮状态
     */
    updateBatchDeleteButton() {
        const checkedCount = document.querySelectorAll('.contact-checkbox:checked').length;
        const batchDeleteBtn = document.getElementById('batchDeleteContactsBtn');
        if (batchDeleteBtn) {
            batchDeleteBtn.style.display = checkedCount > 0 ? 'inline-block' : 'none';
            batchDeleteBtn.textContent = `删除(${checkedCount})`;
        }
    },

    /**
     * 批量删除选中的联系人
     */
    async batchDeleteContacts() {
        const checkedBoxes = document.querySelectorAll('.contact-checkbox:checked');
        if (checkedBoxes.length === 0) return;

        if (!confirm(`确定删除选中的 ${checkedBoxes.length} 个联系人？`)) return;

        const idsToDelete = Array.from(checkedBoxes).map(cb => cb.dataset.id);
        this.contacts = this.contacts.filter(c => !idsToDelete.includes(c.id) && !idsToDelete.includes(String(c.id)));

        await this.saveContacts();
        this.renderContacts(this.contacts);

        // 隐藏批量删除按钮
        const batchDeleteBtn = document.getElementById('batchDeleteContactsBtn');
        if (batchDeleteBtn) batchDeleteBtn.style.display = 'none';
    },

    /**
     * 添加/更新联系人
     */
    async addContact() {
        const nameInput = document.getElementById('newContactName');
        const phoneInput = document.getElementById('newContactPhone');
        const addBtn = document.getElementById('addContactBtn');

        const name = nameInput?.value.trim();
        const phone = phoneInput?.value.trim();

        if (!name) {
            alert('请输入姓名');
            return;
        }
        if (!phone) {
            alert('请输入电话号码');
            return;
        }

        // 检查是否是编辑模式
        const editId = addBtn?.dataset.editId;

        if (editId && addBtn?.classList.contains('editing')) {
            // 编辑模式：更新现有联系人
            const index = this.contacts.findIndex(c => c.id === editId || c.id === parseInt(editId));
            if (index >= 0) {
                this.contacts[index].name = name;
                this.contacts[index].phone = phone;
                this.contacts[index].updatedAt = new Date().toISOString();
            }
            // 重置按钮状态
            addBtn.textContent = '+ 添加';
            delete addBtn.dataset.editId;
            addBtn.classList.remove('editing');
        } else {
            // 新增模式
            const contact = {
                id: Date.now().toString(),
                name,
                phone,
                createdAt: new Date().toISOString()
            };
            this.contacts = this.contacts || [];
            this.contacts.push(contact);
        }

        // 保存
        await this.saveContacts();

        // 清空输入
        nameInput.value = '';
        phoneInput.value = '';

        // 刷新列表
        this.renderContacts(this.contacts);
    },

    /**
     * 删除联系人
     */
    async deleteContact(id) {
        if (!confirm('确定删除此联系人？')) return;

        this.contacts = this.contacts.filter(c => c.id !== id && c.id !== parseInt(id));
        await this.saveContacts();
        this.renderContacts(this.contacts);
    },

    /**
     * 编辑联系人
     */
    editContact(id) {
        const contact = this.contacts.find(c => c.id === id || c.id === parseInt(id));
        if (!contact) return;

        // 填充到输入框
        const nameInput = document.getElementById('newContactName');
        const phoneInput = document.getElementById('newContactPhone');
        const addBtn = document.getElementById('addContactBtn');

        if (nameInput && phoneInput) {
            nameInput.value = contact.name;
            phoneInput.value = contact.phone;

            // 更改按钮状态为编辑模式
            if (addBtn) {
                addBtn.textContent = '保存';
                addBtn.dataset.editId = id;
                addBtn.classList.add('editing');
            }

            nameInput.focus();

            // 滚动到输入区域
            nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },

    /**
     * 保存通讯录
     */
    async saveContacts() {
        const status = document.getElementById('contactsStatus');

        // 保存到本地
        SecurityUtils.safeSetStorage('office_contacts', JSON.stringify(this.contacts));

        // 同步到云端
        if (syncManager.isLoggedIn()) {
            if (status) status.textContent = '同步中...';
            try {
                const syncResult = await syncManager.immediateSyncToCloud();
                if (syncResult && syncResult.protected) {
                    if (status) status.textContent = `共 ${this.contacts.length} 个联系人 (已保留本地)`;
                } else if (status) {
                    status.textContent = `共 ${this.contacts.length} 个联系人 ✓ 已同步`;
                }
                setTimeout(() => {
                    if (status) status.textContent = `共 ${this.contacts.length} 个联系人`;
                }, 2000);
            } catch (e) {
                console.error('通讯录同步失败:', e);
                if (status) status.textContent = `共 ${this.contacts.length} 个联系人 (同步失败)`;
            }
        } else {
            if (status) status.textContent = `共 ${this.contacts.length} 个联系人`;
        }
    },

    /**
     * 搜索过滤通讯录
     * 支持：姓名模糊搜索、电话号码搜索、后四位尾号搜索
     */
    filterContacts(keyword) {
        if (!keyword) {
            this.renderContacts(this.contacts);
            return;
        }

        keyword = keyword.toLowerCase().trim();

        // 支持后四位尾号搜索
        const filtered = this.contacts.filter(c => {
            const nameMatch = c.name.toLowerCase().includes(keyword);
            const phoneMatch = c.phone.includes(keyword);
            // 后四位尾号匹配
            const lastFourMatch = c.phone.length >= 4 && c.phone.slice(-4) === keyword;
            return nameMatch || phoneMatch || lastFourMatch;
        });

        // 渲染并滚动到第一个匹配项
        this.renderContacts(filtered, keyword);

        // 滚动到第一个匹配的联系人
        setTimeout(() => {
            const firstMatch = document.querySelector('.contact-item.matched');
            if (firstMatch) {
                firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    },

    /**
     * 从Excel导入通讯录
     * 支持自动识别姓名和电话列
     */
    async importContactsFromExcel(file) {
        if (!file) return;

        try {
            // 使用SheetJS解析
            if (typeof XLSX === 'undefined') {
                // 动态加载SheetJS
                const loadScript = (src) => new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = src;
                    script.onload = resolve;
                    script.onerror = () => reject(new Error('SheetJS库加载失败: ' + src));
                    document.head.appendChild(script);
                });
                try {
                    await loadScript('https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js');
                } catch (cdnErr) {
                    try {
                        await loadScript('vendor/xlsx.full.min.js');
                    } catch (localErr) {
                        throw new Error('SheetJS库加载失败，请检查网络连接或刷新页面重试');
                    }
                }
            }

            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length < 2) {
                alert('Excel文件为空或只有标题行');
                return;
            }

            // 智能识别姓名和电话列
            const headerRow = jsonData[0] || [];
            let nameColIndex = -1;
            let phoneColIndex = -1;

            // 遍历标题行查找姓名和电话列
            headerRow.forEach((cell, index) => {
                const cellText = String(cell || '').toLowerCase().trim();
                // 识别姓名列
                if (nameColIndex === -1 && (
                    cellText.includes('姓名') ||
                    cellText.includes('名字') ||
                    cellText === 'name' ||
                    cellText === '联系人'
                )) {
                    nameColIndex = index;
                }
                // 识别电话列
                if (phoneColIndex === -1 && (
                    cellText.includes('电话') ||
                    cellText.includes('手机') ||
                    cellText.includes('联系方式') ||
                    cellText === 'phone' ||
                    cellText === 'tel' ||
                    cellText === 'mobile'
                )) {
                    phoneColIndex = index;
                }
            });

            // 如果没有识别到标题，尝试自动检测数据类型
            if (nameColIndex === -1 || phoneColIndex === -1) {
                // 检查第二行数据，自动判断
                const secondRow = jsonData[1] || [];
                secondRow.forEach((cell, index) => {
                    const cellText = String(cell || '').trim();
                    // 检测是否为电话号码（包含数字，可能带横线或空格）
                    const phonePattern = /^[\d\s\-]+$/
                    const hasDigits = /\d{7,}/.test(cellText);

                    if (phoneColIndex === -1 && hasDigits && phonePattern.test(cellText)) {
                        phoneColIndex = index;
                    } else if (nameColIndex === -1 && !hasDigits && cellText.length <= 20) {
                        nameColIndex = index;
                    }
                });
            }

            // 默认使用前两列
            if (nameColIndex === -1) nameColIndex = 0;
            if (phoneColIndex === -1) phoneColIndex = 1;



            // 解析数据
            let imported = 0;
            let updated = 0;
            let skipped = 0;
            const startRow = 1; // 跳过标题行

            for (let i = startRow; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;

                const name = String(row[nameColIndex] || '').trim();
                let phone = String(row[phoneColIndex] || '').trim();

                // 清理电话号码格式（移除空格、横线等）
                phone = phone.replace(/[\s\-]/g, '');

                if (name && phone && phone.length >= 7) {
                    // 检查是否已存在相同姓名的联系人
                    const existingIndex = this.contacts.findIndex(c =>
                        c.name === name
                    );

                    if (existingIndex >= 0) {
                        // 相同姓名，更新电话号码
                        const existingPhone = this.contacts[existingIndex].phone.replace(/[\s\-]/g, '');
                        if (existingPhone !== phone) {
                            this.contacts[existingIndex].phone = phone;
                            this.contacts[existingIndex].updatedAt = new Date().toISOString();
                            updated++;
                        } else {
                            skipped++; // 姓名和电话都相同，跳过
                        }
                    } else {
                        // 新联系人，添加
                        this.contacts.push({
                            id: Date.now().toString() + '_' + i,
                            name,
                            phone,
                            createdAt: new Date().toISOString()
                        });
                        imported++;
                    }
                } else if (name || phone) {
                    skipped++;

                }
            }

            // 清空文件选择
            document.getElementById('importContactsFile').value = '';

            const totalChanged = imported + updated;
            if (totalChanged > 0) {
                await this.saveContacts();
                this.renderContacts(this.contacts);
                let message = '';
                if (imported > 0) {
                    message += `新增 ${imported} 个联系人`;
                }
                if (updated > 0) {
                    message += (message ? '\n' : '') + `更新 ${updated} 个联系人电话`;
                }
                if (skipped > 0) {
                    message += `\n（跳过 ${skipped} 个重复或无效项）`;
                }
                alert(message);
            } else if (skipped > 0) {
                alert(`没有新的联系人可导入\n（跳过 ${skipped} 个重复或无效项）`);
            } else {
                alert('未找到有效的联系人数据\n\n请确保Excel包含"姓名"和"电话"两列');
            }

        } catch (e) {
            console.error('导入Excel失败:', e);
            alert('导入失败: ' + (e?.message || '未知错误，请检查文件格式'));
        }
    },

    /**
     * 正则表达式特殊字符转义
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

};
