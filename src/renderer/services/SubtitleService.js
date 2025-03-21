const fs = require('fs');

// 字幕处理服务
class SubtitleService {
    constructor() {
        this.subtitles = [];
        this.currentSubtitleIndex = -1;
        this.subtitlesVisible = true;
        this.inputMode = false; // 标记是否处于输入模式
        this.editingSubtitle = false; // 标记是否正在编辑字幕
    }

    // 加载字幕文件
    async loadSubtitleFile(file) {
        try {
            // 根据文件对象类型选择不同的加载方式
            let content;
            if (file.text && typeof file.text === 'function') {
                content = await file.text();
            } else if (file.path) {
                // 使用Node.js的fs模块读取文件
                content = fs.readFileSync(file.path, 'utf8');
            } else {
                // 浏览器标准File对象
                content = await new Response(file).text();
            }
            
            this.subtitles = this.parseSRT(content);
            this.currentSubtitleIndex = -1;
            return this.subtitles;
        } catch (error) {
            console.error('Error loading subtitles:', error);
            throw new Error('Error loading subtitle file. Please select a valid SRT file.');
        }
    }

    // 解析SRT字幕
    parseSRT(srtContent) {
        const subtitles = [];
        const srtLines = srtContent.split('\n');
        let lineIndex = 0;

        while (lineIndex < srtLines.length) {
            const line = srtLines[lineIndex].trim();
            lineIndex++;

            // 跳过空行
            if (!line) continue;
            
            // 解析序号
            const index = parseInt(line);
            if (isNaN(index)) continue;
            
            // 解析时间戳
            if (lineIndex < srtLines.length) {
                const timestamps = srtLines[lineIndex].trim();
                lineIndex++;
                
                const match = timestamps.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
                if (match) {
                    const startTime = this.timeToSeconds(match[1]);
                    const endTime = this.timeToSeconds(match[2]);
                    
                    // 解析文本
                    let text = '';
                    
                    // 收集文本行直到遇到空行
                    const textLines = [];
                    while (lineIndex < srtLines.length && srtLines[lineIndex].trim()) {
                        textLines.push(srtLines[lineIndex].trim());
                        lineIndex++;
                    }
                    
                    // 用换行符连接行，保留格式
                    text = textLines.join('\n');
                    
                    // 检查是否有翻译（双语字幕）
                    let translation = '';
                    if (text.includes('\n\n')) {
                        const parts = text.split('\n\n');
                        text = parts[0];
                        translation = parts.slice(1).join('\n\n');
                    }
                    
                    subtitles.push({
                        index,
                        startTime,
                        endTime,
                        text,
                        translation
                    });
                }
            }
        }
        
        return subtitles;
    }

    // 时间字符串转换为秒
    timeToSeconds(timeString) {
        const [time, ms] = timeString.split(',');
        const [hours, minutes, seconds] = time.split(':').map(Number);
        return hours * 3600 + minutes * 60 + seconds + parseInt(ms) / 1000;
    }

    // 查找当前时间对应的字幕
    findSubtitleAtTime(time) {
        for (let i = 0; i < this.subtitles.length; i++) {
            if (time >= this.subtitles[i].startTime && time <= this.subtitles[i].endTime) {
                return i;
            }
        }
        return -1;
    }

    // 设置当前字幕索引
    setCurrentSubtitleIndex(index) {
        if (index >= -1 && index < this.subtitles.length) {
            this.currentSubtitleIndex = index;
            return true;
        }
        return false;
    }

    // 获取当前字幕
    getCurrentSubtitle() {
        if (this.currentSubtitleIndex >= 0 && this.currentSubtitleIndex < this.subtitles.length) {
            return this.subtitles[this.currentSubtitleIndex];
        }
        return null;
    }

    // 获取当前字幕索引
    getCurrentSubtitleIndex() {
        return this.currentSubtitleIndex;
    }

    // 获取所有字幕
    getAllSubtitles() {
        return this.subtitles;
    }

    // 切换字幕可见性
    toggleSubtitlesVisibility() {
        this.subtitlesVisible = !this.subtitlesVisible;
        
        // 当字幕不可见时，切换输入模式
        if (!this.subtitlesVisible) {
            this.inputMode = true;
        } else {
            this.inputMode = false;
        }
        
        return this.subtitlesVisible;
    }

    // 获取字幕可见性状态
    isSubtitlesVisible() {
        return this.subtitlesVisible;
    }

    // 设置字幕可见性
    setSubtitlesVisible(visible) {
        this.subtitlesVisible = visible;
        this.inputMode = !visible; // 当字幕不可见时启用输入模式
    }
    
    // 获取输入模式状态
    isInputMode() {
        return this.inputMode;
    }

    // 设置编辑字幕状态
    setEditingSubtitle(isEditing) {
        this.editingSubtitle = isEditing;
    }
    
    // 检查是否正在编辑字幕
    isEditingSubtitle() {
        return this.editingSubtitle;
    }

    // 清空字幕数据
    clearSubtitles() {
        this.subtitles = [];
        this.currentSubtitleIndex = -1;
    }
}

module.exports = new SubtitleService(); 