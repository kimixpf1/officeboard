/**
 * PDF解析模块 — 从 ocr.js 拆分
 * 通过 Object.assign(OCRManager.prototype, PDFParser) 注入为 mixin
 */
const PDFParser = {
    /**
     * 提取PDF文本（使用pdf.js）
     * 提取PDF文本（使用pdf.js）
     */
    async extractPDFText(file, progressCallback = null) {
        try {
            if (typeof pdfjsLib === 'undefined') {
                if (progressCallback) progressCallback('正在加载PDF解析库...');
                await this.loadPdfJs();
            }

            if (progressCallback) progressCallback('正在读取PDF文件...');
            const arrayBuffer = await file.arrayBuffer();

            if (progressCallback) progressCallback('正在解析PDF结构...');
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let fullText = '';
            const totalPages = pdf.numPages;

            for (let i = 1; i <= totalPages; i++) {
                if (progressCallback) {
                    progressCallback(`正在解析PDF (${i}/${totalPages}页)...`);
                }

                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = this.buildStructuredPDFPageText(textContent.items || []);
                fullText += pageText + '\n\n';
            }

            if (!fullText.trim()) {
                throw new Error('PDF中未检测到可提取的文字，可能是扫描版PDF。建议将PDF页面截图后上传图片识别。');
            }

            return fullText;
        } catch (error) {
            console.error('PDF解析失败:', error);
            if (error.message.includes('PDF')) {
                throw error;
            }
            throw new Error('PDF解析失败: ' + error.message + '。请确保PDF文件未损坏。');
        }
    }

    ,buildStructuredPDFPageText(items) {
        const normalizedItems = this.normalizePDFTextItems(items);
        const rows = this.groupPDFItemsIntoRows(normalizedItems);
        const rawText = rows
            .map(row => row.map(item => item.text).join(' | ').replace(/\s*\|\s*/g, ' | ').trim())
            .filter(Boolean)
            .join('\n');

        const tableLines = this.extractPDFTableRows(rows);
        if (!tableLines.length) {
            return rawText;
        }

        return `${rawText}\n\n【结构化表格提取】\n${tableLines.join('\n')}`.trim();
    }

    ,normalizePDFTextItems(items) {
        return [...(Array.isArray(items) ? items : [])]
            .filter(item => item?.str && item.str.trim())
            .map(item => ({
                text: item.str.trim(),
                x: item.transform?.[4] ?? 0,
                y: item.transform?.[5] ?? 0,
                width: Number(item.width) || 0,
                height: Math.abs(Number(item.height) || 0)
            }))
            .sort((a, b) => {
                if (Math.abs(b.y - a.y) > 2) {
                    return b.y - a.y;
                }
                return a.x - b.x;
            });
    }

    ,groupPDFItemsIntoRows(items) {
        const rows = [];

        for (const item of Array.isArray(items) ? items : []) {
            const lastRow = rows[rows.length - 1];
            const tolerance = Math.max(4, (item.height || 0) * 0.55);

            if (!lastRow || Math.abs(lastRow.y - item.y) > tolerance) {
                rows.push({ y: item.y, items: [item] });
            } else {
                lastRow.items.push(item);
            }
        }

        return rows.map(row => row.items.sort((a, b) => a.x - b.x));
    }

    ,isLocationLikeCell(value) {
        const text = this.cleanPDFCellText(value);
        if (!text || text.length > 30) return false;
        // 排除短人名（如"钱局""吴局"）——局前至少要有2个非姓氏字符
        if (/^.[局委办]$/.test(text) && text.length <= 3) return false;
        return /会议室|厅$|会场|号楼|酒店|宾馆|中心$|.{2,}局$|院$|\d楼$|分会场|多功能|报告厅|礼堂|接待室|接待厅|办公室|大楼|大厦|广场|饭店|度假村|山庄/.test(text)
            || /市.*(?:局|委|办|中心|院|馆)|^\S{2,}(?:局|委|办)$/.test(text);
    }

    ,splitPDFRowIntoCells(items) {
        const cells = [];
        let currentCell = [];

        for (const item of Array.isArray(items) ? items : []) {
            const prevItem = currentCell[currentCell.length - 1];
            const gap = prevItem ? item.x - (prevItem.x + prevItem.width) : 0;
            const splitThreshold = prevItem
                ? Math.max(18, Math.min(60, (prevItem.width || 0) * 1.4))
                : Number.MAX_SAFE_INTEGER;

            if (prevItem && gap > splitThreshold) {
                cells.push(currentCell);
                currentCell = [item];
            } else {
                currentCell.push(item);
            }
        }

        if (currentCell.length) {
            cells.push(currentCell);
        }

        return cells
            .map(cell => this.cleanPDFCellText(cell.map(item => item.text).join(' ')))
            .filter(Boolean);
    }

    ,cleanPDFCellText(value) {
        return (value || '')
            .replace(/[|｜]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    ,cleanPDFMeetingTitle(value) {
        return this.correctMeetingTitleText(
            this.cleanPDFCellText(value)
                .replace(/^事项[:：]?/, '')
                .replace(/^会议活动名称[:：]?/, '')
        );
    }

    ,isLikelyPDFTableHeader(value) {
        const text = this.cleanPDFCellText(value);
        if (!text) {
            return false;
        }

        return /近期主要会议活动安排|会议活动名称|事项|备注|地点|姓名|处室|参会人员|日期|时间/.test(text);
    }

    ,extractPDFTableRows(rows) {
        const result = [];
        let inheritedGroup = '';
        let inheritedAttendee = '';
        let attendeeY = 0; // 记录inheritedAttendee来源行的y坐标，用于距离比较

        // 预扫描：收集所有name-only行的(y坐标, 名字, 行索引)
        const nameOnlyRows = [];
        for (let i = 0; i < rows.length; i++) {
            const cells = this.splitPDFRowIntoCells(rows[i]);
            if (!cells.length) continue;
            const joined = cells.join(' ');
            const hasDateOrTime = /\d{1,2}[.:：]\d{2}|\d{1,2}月\d{1,2}日|星期[一二三四五六日天]|周[一二三四五六日天]|\d{4}-\d{2}-\d{2}/.test(joined);
            if (!hasDateOrTime && cells.length < 4) {
                const shortNamePattern = /^[一-龥、·]{1,10}$/;
                const attendeeSuffixPattern = /[局委办主任处科长组院]$/;
                if (cells.join(' ').length <= 10 && shortNamePattern.test(cells.join(' '))) {
                    const nameCore = cells.join(' ').replace(/[、·].*$/, '');
                    if (attendeeSuffixPattern.test(nameCore) && !/(?:局领导|^处室$)/.test(cells.join(' '))) {
                        nameOnlyRows.push({ y: rows[i].y, name: cells.join(' '), index: i });
                    }
                }
            }
        }

        // 辅助函数：查找给定y坐标最近的name行（上方或下方，±40单位内）
        const findClosestName = (meetingY, currentAttendeeY) => {
            let best = null;
            let bestDist = Infinity;
            for (const nr of nameOnlyRows) {
                const dist = Math.abs(nr.y - meetingY);
                if (dist > 40) continue; // 超过40单位不考虑
                if (dist < bestDist) {
                    bestDist = dist;
                    best = nr;
                }
            }
            // 最近名字比继承链的名字更近（至少更近15%）才切换
            if (best && currentAttendeeY > 0) {
                const inheritDist = Math.abs(currentAttendeeY - meetingY);
                if (bestDist >= inheritDist * 0.85) return null; // 不够近，保持继承
            }
            return best;
        };

        for (const row of Array.isArray(rows) ? rows : []) {
            const cells = this.splitPDFRowIntoCells(row);
            if (!cells.length) {
                continue;
            }

            const joined = cells.join('｜');
            if (!joined || this.isLikelyPDFTableHeader(joined)) {
                continue;
            }

            const hasDateOrTime = /\d{1,2}[.:：]\d{2}|\d{1,2}月\d{1,2}日|星期[一二三四五六日天]|周[一二三四五六日天]|\d{4}-\d{2}-\d{2}/.test(joined);
            const hasLocationCell = cells.some(c => this.isLocationLikeCell(c));

            // 标题过长时WPS会将文字拆分到多行，且拆分后的文字
            // 在不同y坐标上（WPS PDF渲染特点）。不带日期、列数少的行
            // 作为【续】条目单独输出，由AI在语义层面判断是否合并。
            if (!hasDateOrTime && cells.length < 4) {
                const singleCell = cells.join(' ');
                const hasStandaloneDateTime = /\d{1,2}月\d{1,2}日.*(?:上午|下午|晚上|\d{1,2}[:：]\d{2})/.test(singleCell);
                if (hasStandaloneDateTime) {
                    // 这行有独立日期时间，跳过续判断，继续往下走正常行逻辑
                } else {
                // 延续行可能只有标题碎片（如"专题培训班"），也可能
                // 标题碎片+地点在不同行上。都输出，交给AI合并。
                const contJoined = cells.join(' ');
                const contLoc = hasLocationCell
                    ? this.correctMeetingLocationText(this.cleanPDFCellText(cells[cells.length - 1]))
                    : '';
                const contTitle = hasLocationCell
                    ? cells.slice(0, -1).join(' ')
                    : contJoined;
                if (!contTitle && !contLoc) {
                    continue;
                }
                // 跳过孤立的短人名/处室名（被误识别为续行的参会者名字）
                // 但先检查是否为参会者名字（如"陈局""盛局""吴局""工业处、服"），如果是则用于继承
                const shortNamePattern = /^[一-龥、·]{1,10}$/;
                const attendeeSuffixPattern = /[局委办主任处科长组院]$/;
                if (contTitle.length <= 10 && !contLoc && shortNamePattern.test(contTitle)) {
                    const nameCore = contTitle.replace(/[、·].*$/, '');
                    if (attendeeSuffixPattern.test(nameCore) && !/(?:局领导|^处室$)/.test(contTitle)) {
                        inheritedAttendee = contTitle;
                        attendeeY = row.y;
                    }
                    continue;
                }
                const parts = [];
                if (inheritedGroup) parts.push(`分组：${inheritedGroup}`);
                if (inheritedAttendee) parts.push(`参会：${inheritedAttendee}`);
                parts.push(`续：${contTitle}`);
                if (contLoc) parts.push(`地点：${contLoc}`);
                if (parts.length >= 2) {
                    result.push(parts.join('｜'));
                }
                continue;
                } // close hasStandaloneDateTime else
            }

            let group = '';
            let attendee = '';
            let title = '';
            let location = '';

            if (cells.length >= 4) {
                group = cells[0];
                attendee = cells[1];
                title = cells.slice(2, -1).join(' ');
                location = cells[cells.length - 1];
            } else if (cells.length === 3) {
                attendee = cells[0];
                title = cells[1];
                location = cells[2];
            } else if (cells.length === 2) {
                title = cells[0];
                location = cells[1];
            } else {
                title = cells[0];
            }

            if (group && !/局领导|处室|科室|其他/.test(group) && !this.isLikelyPDFTableHeader(group)) {
                title = [group, title].filter(Boolean).join(' ');
                group = '';
            }

            group = this.cleanPDFCellText(group) || inheritedGroup;
            let resolvedAttendee = this.cleanPDFCellText(attendee) || inheritedAttendee;
            // 双向查找：如果继承链上的名字距离较远，尝试在附近找到更近的名字行
            if (!this.cleanPDFCellText(attendee) && inheritedAttendee && attendeeY > 0) {
                const closer = findClosestName(row.y, attendeeY);
                if (closer && closer.name !== inheritedAttendee) {
                    resolvedAttendee = closer.name;
                    // 用新找到的更近名字更新继承链，后续行继续使用
                    inheritedAttendee = closer.name;
                    attendeeY = closer.y;
                }
            }
            attendee = resolvedAttendee;
            title = this.cleanPDFMeetingTitle(title);
            location = this.correctMeetingLocationText(this.cleanPDFCellText(location));

            if (!title) {
                continue;
            }

            if (group) {
                inheritedGroup = group;
            }
            if (attendee) {
                inheritedAttendee = attendee;
            }

            const correctedAttendee = attendee
                ? (this.sortMeetingAttendees([attendee])[0] || attendee)
                : '';
            result.push([
                group ? `分组：${group}` : '',
                correctedAttendee ? `参会：${correctedAttendee}` : '',
                `事项：${title}`,
                location ? `地点：${location}` : ''
            ].filter(Boolean).join('｜'));
        }

        return result;
    }

    /**
     * 动态加载pdf.js
     */
    ,async loadPdfJs() {
        return new Promise((resolve, reject) => {
            if (typeof pdfjsLib !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.crossOrigin = 'anonymous';
            script.onload = () => {
                // 设置worker路径
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve();
            };
            script.onerror = () => {
                console.error('PDF.js加载失败');
                reject(new Error('PDF解析库加载失败，请检查网络连接'));
            };
            document.head.appendChild(script);
        });
    }
};
