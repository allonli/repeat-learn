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

    // 加载视频文件
    loadVideoFile(file, videoElement) {
        let videoURL;
        
        // 处理自定义文件对象和标准File对象
        if (file.path) {
            // 我们使用Electron的文件系统API加载的文件
            videoURL = `file://${file.path}`;
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