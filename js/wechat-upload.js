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

    function setSummary(content, isError = false) {
        if (!summaryEl) return;
        summaryEl.replaceChildren();
        if (typeof content === 'string') {
            summaryEl.textContent = content;
        } else if (content instanceof HTMLElement) {
            summaryEl.appendChild(content);
        }
        summaryEl.style.display = 'block';
        summaryEl.classList.toggle('error', isError);
    }

    function disableChooseWithNoKeyTip() {
        chooseBtn.disabled = true;
        backBtn.disabled = false;
        setStatus('未检测到 Kimi API Key，请回主页面先配置 AI 密钥后再使用微信识别。');
        setSummary('当前微信轻量页不支持在无 Kimi Key 时回退到本地 OCR，请点击“返回主页面”先完成配置。', true);
    }

    function showPreviewDialog(fileName, previewResult) {
        return window.UploadFlowUtils.showRecognitionPreviewModal(fileName, previewResult, {
            layout: 'compact',
            overlayClassName: 'modal',
            dialogClassName: 'modal-card',
            dialogStyle: '',
            headerClassName: 'modal-header',
            headerContent: (() => { const s = document.createElement('strong'); s.textContent = '识别前预览确认'; return s; })(),
            showCloseButton: false,
            bodyClassName: 'modal-body',
            footerClassName: 'modal-footer',
            cancelButtonClass: 'secondary',
            confirmButtonClass: 'primary'
        });
    }

    async function init() {
        try {
            if (!window.indexedDB) {
                setStatus('当前浏览器不支持本地存储，无法使用识别功能。');
                chooseBtn.disabled = true;
                backBtn.disabled = false;
                return;
            }
            if (!window.FileReader) {
                setStatus('当前浏览器不支持文件读取，无法使用识别功能。');
                chooseBtn.disabled = true;
                backBtn.disabled = false;
                return;
            }
            setStatus('正在初始化识别环境...');
            await db.init();
            if (typeof ocrManager?.loadApiKeysFromDB === 'function') {
                await ocrManager.loadApiKeysFromDB();
            }
            const kimiApiKey = typeof ocrManager?.getKimiApiKey === 'function'
                ? ocrManager.getKimiApiKey()
                : null;
            if (!kimiApiKey) {
                disableChooseWithNoKeyTip();
                return;
            }
            chooseBtn.disabled = false;
            backBtn.disabled = false;
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
            let processedFile = file;
            if (file.type.startsWith('image/') && typeof UploadFlowUtils !== 'undefined') {
                processedFile = await UploadFlowUtils.compressImageIfNeeded(file);
            }
            const progressCallback = (message) => setStatus(message);
            const itemsSnapshot = await ocrManager.captureItemsSnapshot();
            const previewResult = await ocrManager.analyzeDocument(processedFile, progressCallback, { previewOnly: true });
            const previewDecision = await showPreviewDialog(file.name, previewResult);

            if (!previewDecision?.confirmed) {
                await ocrManager.restoreItemsSnapshot(itemsSnapshot);
                setStatus('已取消保存识别结果');
                setSummary('本次识别结果未写入主面板。');
                return;
            }

            const finalPreviewResult = previewDecision.result || previewResult;

            setStatus('正在保存识别结果...');
            const result = await ocrManager.applyRecognitionActionPlan(finalPreviewResult.actionPlan, {
                text: finalPreviewResult.text || previewResult.text,
                metadata: finalPreviewResult.metadata || previewResult.metadata
            });

            setStatus('识别完成，结果已保存到本地，正在返回主页面...');
            const successContainer = document.createElement('div');
            successContainer.appendChild(window.UploadFlowUtils.buildRecognitionSummaryHtml(file.name, result, false, 'compact'));
            const successTip = document.createElement('div');
            successTip.style.cssText = 'margin-top:12px;padding:10px;background:#eff6ff;border-radius:8px;color:#1e40af;';
            successTip.textContent = '已保存成功，约 1 秒后自动返回主页面。';
            successContainer.appendChild(successTip);
            setSummary(successContainer);

            shouldStayDisabled = true;
            window.setTimeout(() => {
                window.location.replace(returnUrl);
            }, 1200);
        } catch (error) {
            setStatus(`识别失败：${error.message}`);
            const errorContainer = document.createElement('div');
            const errorMsg = document.createElement('div');
            errorMsg.style.cssText = 'color:#dc2626;font-weight:600;margin-bottom:8px;';
            errorMsg.textContent = `识别失败：${error.message}`;
            errorContainer.appendChild(errorMsg);
            const retryBtn = document.createElement('button');
            retryBtn.style.cssText = 'background:#3b82f6;color:white;border:none;padding:8px 20px;border-radius:6px;font-size:14px;cursor:pointer;';
            retryBtn.textContent = '重新识别';
            retryBtn.addEventListener('click', () => {
                retryBtn.remove();
                errorMsg.remove();
                processFile(file);
            });
            errorContainer.appendChild(retryBtn);
            setSummary(errorContainer, true);
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
        window.location.replace(returnUrl);
    });

    fileInput?.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        await processFile(file);
    });

    init();
})();
