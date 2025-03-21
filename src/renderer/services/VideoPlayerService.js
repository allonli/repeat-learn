// 视频播放器服务
class VideoPlayerService {
    constructor() {
        this.currentVideoFile = null;
        this.isPlaying = false;
        this.playbackRate = 1.0;
        this.repeatCount = 1;
        this.currentRepeat = 0;
        this.infiniteLoopMode = false;
    }

    /**
     * 安全处理文件路径中的特殊字符
     * @param {String} filePath 文件路径
     * @returns {String} 处理后的安全路径
     */
    sanitizeFilePath(filePath) {
        if (!filePath) return '';
        
        try {
            // 处理文件路径中的特殊字符
            return decodeURIComponent(filePath)
                .replace(/#/g, '%23')         // 井号
                .replace(/%/g, '%25')         // 百分号本身
                .replace(/\?/g, '%3F')        // 问号
                .replace(/&/g, '%26')         // 与号
                .replace(/\\/g, '/')          // 反斜杠转正斜杠
                .replace(/\s+/g, ' ');        // 标准化空格
        } catch (error) {
            console.error('处理文件路径时出错:', error);
            // 如果解码失败，至少保证#号被正确处理
            return filePath.replace(/#/g, '%23');
        }
    }

    // 加载视频文件
    loadVideoFile(file, videoElement) {
        let videoURL;
        
        // 处理自定义文件对象和标准File对象
        if (file.path) {
            try {
                // 使用安全处理函数处理路径
                const filePath = this.sanitizeFilePath(file.path);
                
                // 使用encodeURI确保URL安全，但避免双重编码
                const encodedPath = encodeURI(filePath);
                videoURL = `file://${encodedPath}`;
                
                console.log('加载视频:', videoURL);
            } catch (error) {
                console.error('处理视频路径时出错:', error);
                // 使用简单路径作为备选
                const simplePath = file.path.replace(/#/g, '%23');
                videoURL = `file://${simplePath}`;
            }
        } else {
            // 浏览器标准File对象
            videoURL = URL.createObjectURL(file);
        }
        
        if (!videoElement) {
            throw new Error('Video element is required');
        }
        
        videoElement.src = videoURL;
        videoElement.load();
        
        this.currentVideoFile = file;
        
        return file.name;
    }

    // 获取当前视频文件
    getCurrentVideoFile() {
        return this.currentVideoFile;
    }

    // 播放/暂停
    togglePlayPause(videoElement) {
        if (!videoElement) {
            throw new Error('Video element is required');
        }
        
        if (videoElement.paused || videoElement.ended) {
            videoElement.play();
            this.isPlaying = true;
        } else {
            videoElement.pause();
            this.isPlaying = false;
        }
        
        return this.isPlaying;
    }

    // 获取播放状态
    isVideoPlaying() {
        return this.isPlaying;
    }

    // 设置播放速率
    setPlaybackRate(rate, videoElement) {
        if (!videoElement) {
            throw new Error('Video element is required');
        }
        
        this.playbackRate = parseFloat(rate);
        videoElement.playbackRate = this.playbackRate;
        
        return this.playbackRate;
    }

    // 获取播放速率
    getPlaybackRate() {
        return this.playbackRate;
    }

    // 设置重复次数
    setRepeatCount(count) {
        this.repeatCount = parseInt(count);
        this.currentRepeat = 0;
        return this.repeatCount;
    }

    // 获取重复次数
    getRepeatCount() {
        return this.repeatCount;
    }

    // 获取当前重复次数
    getCurrentRepeat() {
        return this.currentRepeat;
    }

    // 增加当前重复次数
    incrementCurrentRepeat() {
        this.currentRepeat++;
        return this.currentRepeat;
    }

    // 重置当前重复次数
    resetCurrentRepeat() {
        this.currentRepeat = 0;
        return this.currentRepeat;
    }

    // 切换无限循环模式
    toggleInfiniteLoopMode() {
        this.infiniteLoopMode = !this.infiniteLoopMode;
        return this.infiniteLoopMode;
    }

    // 设置无限循环模式
    setInfiniteLoopMode(mode) {
        this.infiniteLoopMode = mode;
        return this.infiniteLoopMode;
    }

    // 获取无限循环模式
    isInfiniteLoopMode() {
        return this.infiniteLoopMode;
    }

    // 格式化时间（秒转为分:秒）
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
}

module.exports = new VideoPlayerService(); 