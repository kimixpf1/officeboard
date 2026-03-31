(function () {
    const params = new URLSearchParams(window.location.search);
    const returnUrl = params.get('return') || 'index.html';
    const fileInput = document.getElementById('wechatFileInput');
    const chooseBtn = document.getElementById('chooseImageBtn');
    const backBtn = document.getElementById('backBtn');
    const statusEl = document.getElementById('uploadStatus');
    const summaryEl = document.getElementById('resultSummary');

    function setStatus(message) {
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    function setSummary(html, isError = false) {
        if (!summaryEl) {
            return;
        }

        summaryEl.innerHTML = html;
        summaryEl.style.display = 'block';
        summaryEl.classList.toggle('error', isError);
    }

    function buildRecognitionSummaryHtml(fileName, result, isPreview = false) {
        const sectionPrefix = isPreview ? '待' : '';
        let html = `<div style="text-align:left;color:inherit;">`;
        html += `<h4 style="margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid #e5e7eb;">📄 文件：${fileName}</h4>`;
        const totalCount = (result.items?.length || 0) + (result.mergedItems?.length || 0) + (result.skippedItems?.length || 0);
        html += `<div style="margin-bottom:16px;padding:10px;background:#f8fafc;border-radius:6px;">`;
        html += `<b>${isPreview ? '识别预览' : '识别汇总'}：</b>共识别 ${totalCount} 条记录`;
        html += ` → <span style="color:#10b981;">${sectionPrefix}新增 ${result.items?.length || 0}</span>`;
        html += ` | <span style="color:#f59e0b;">${sectionPrefix}合并 ${result.mergedItems?.length || 0}</span>`;
        html += ` | <span style="color:#6b7280;">${sectionPrefix}跳过 ${result.skippedItems?.length || 0}</span>`;
        html += `</div>`;

        if (result.items?.length) {
            html += `<div style="margin-bottom:16px;"><h5 style="color:#10b981;margin:0 0 10px;">✅ ${sectionPrefix}新增事项 (${result.items.length}个)</h5><ul style="margin:0;padding-left:18px;">`;
            result.items.forEach(item => {
                const title = item.title || item.displayTitle || '未知事项';
                const dateTime = [item.date, item.time].filter(Boolean).join(' ');
                html += `<li style="margin:6px 0;">${title}${dateTime ? `（${dateTime}）` : ''}</li>`;
            });
            html += `</ul></div>`;
        }

        if (result.mergedItems?.length) {
            html += `<div style="margin-bottom:16px;"><h5 style="color:#f59e0b;margin:0 0 10px;">🔄 ${sectionPrefix}合并参会人员 (${result.mergedItems.length}个)</h5><ul style="margin:0;padding-left:18px;">`;
            result.mergedItems.forEach(item => {
                const title = item.title || '未知事项';
                const targetTitle = item.targetTitle || title;
                const added = item.addedAttendees?.join('、') || '-';
                html += `<li style="margin:6px 0;">${title} → ${targetTitle}（新增：${added}）</li>`;
            });
            html += `</ul></div>`;
        }

        if (result.skippedItems?.length) {
            html += `<div><h5 style="color:#6b7280;margin:0 0 10px;">⏭️ ${sectionPrefix}跳过重复 (${result.skippedItems.length}个)</h5><ul style="margin:0;padding-left:18px;">`;
            result.skippedItems.forEach(title => {
                html += `<li style="margin:6px 0;">${title}</li>`;
            });
            html += `</ul></div>`;
        }

        if (isPreview) {
            html += `<div style="margin-top:12px;padding:10px;background:#eff6ff;border-radius:8px;color:#1e40af;">确认后才会写入主面板；取消则不保存。</div>`;
        }

        html += `</div>`;
        return html;
    }

    function showPreviewDialog(fileName, previewResult) {
        const hasActions = (previewResult.items?.length || 0) > 0 || (previewResult.mergedItems?.length || 0) > 0;

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal';
            overlay.innerHTML = `
                <div class="modal-card">
                    <div class="modal-header"><strong>识别前预览确认</strong></div>
                    <div class="modal-body">${buildRecognitionSummaryHtml(fileName, previewResult, true)}</div>
                    <div class="modal-footer">
                        <button type="button" class="secondary preview-cancel">${hasActions ? '取消保存' : '关闭'}</button>
                        ${hasActions ? '<button type="button" class="primary preview-confirm">确认保存</button>' : ''}
                    </div>
                </div>
            `;

            let settled = false;
            const finish = (confirmed) => {
                if (settled) {
                    return;
                }
                settled = true;
                overlay.remove();
                resolve(confirmed);
            };

            overlay.querySelector('.preview-cancel')?.addEventListener('click', () => finish(false));
            overlay.querySelector('.preview-confirm')?.addEventListener('click', () => finish(true));
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) {
                    finish(false);
                }
            });
            document.body.appendChild(overlay);
        });
    }

    async function init() {
        try {
            setStatus('正在初始化识别环境...');
            await db.init();
            if (typeof ocrManager?.loadApiKeysFromDB === 'function') {
                await ocrManager.loadApiKeysFromDB();
            }
            setStatus('初始化完成，请选择图片或直接拍摄。');
        } catch (error) {
            setStatus(`初始化失败：${error.message}`);
            chooseBtn.disabled = true;
        }
    }

    async function processFile(file) {
        if (!file) {
            setStatus('未选择文件');
            return;
        }

        chooseBtn.disabled = true;
        backBtn.disabled = true;
        summaryEl.style.display = 'none';

        try {
            const progressCallback = (message) => setStatus(message);
            const itemsSnapshot = await ocrManager.captureItemsSnapshot();
            const previewResult = await ocrManager.analyzeDocument(file, progressCallback, { previewOnly: true });
            const confirmed = await showPreviewDialog(file.name, previewResult);

            if (!confirmed) {
                await ocrManager.restoreItemsSnapshot(itemsSnapshot);
                setStatus('已取消保存识别结果');
                setSummary('本次识别结果未写入主面板。');
                return;
            }

            setStatus('正在保存识别结果...');
            const result = await ocrManager.applyRecognitionActionPlan(previewResult.actionPlan, {
                text: previewResult.text,
                metadata: previewResult.metadata
            });

            setStatus('识别完成，结果已保存到本地。');
            setSummary(buildRecognitionSummaryHtml(file.name, result, false));
        } catch (error) {
            setStatus(`识别失败：${error.message}`);
            setSummary(`<div>识别失败：${error.message}</div>`, true);
        } finally {
            fileInput.value = '';
            chooseBtn.disabled = false;
            backBtn.disabled = false;
        }
    }

    chooseBtn?.addEventListener('click', () => {
        summaryEl.style.display = 'none';
        fileInput.value = '';
        fileInput.click();
    });

    backBtn?.addEventListener('click', () => {
        window.location.href = returnUrl;
    });

    fileInput?.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        await processFile(file);
    });

    init();
})();
