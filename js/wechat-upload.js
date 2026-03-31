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

    function showPreviewDialog(fileName, previewResult) {
        return window.UploadFlowUtils.showRecognitionPreviewModal(fileName, previewResult, {
            layout: 'compact',
            overlayClassName: 'modal',
            dialogClassName: 'modal-card',
            dialogStyle: '',
            headerClassName: 'modal-header',
            headerHtml: '<strong>识别前预览确认</strong>',
            showCloseButton: false,
            bodyClassName: 'modal-body',
            footerClassName: 'modal-footer',
            cancelButtonClass: 'secondary',
            confirmButtonClass: 'primary'
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

        let shouldStayDisabled = false;
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

            setStatus('识别完成，结果已保存到本地，正在返回主页面...');
            setSummary(
                `${window.UploadFlowUtils.buildRecognitionSummaryHtml(file.name, result, false, 'compact')}
                <div style="margin-top:12px;padding:10px;background:#eff6ff;border-radius:8px;color:#1e40af;">已保存成功，约 1 秒后自动返回主页面。</div>`
            );

            shouldStayDisabled = true;
            window.setTimeout(() => {
                window.location.href = returnUrl;
            }, 1200);
        } catch (error) {
            setStatus(`识别失败：${error.message}`);
            setSummary(`<div>识别失败：${error.message}</div>`, true);
        } finally {
            fileInput.value = '';
            if (!shouldStayDisabled) {
                chooseBtn.disabled = false;
                backBtn.disabled = false;
            }
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
