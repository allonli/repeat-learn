// 导入Node.js模块
const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');

// 导入服务 - 使用绝对路径
const fileSystemService = require(path.join(__dirname, 'services/FileSystemService'));
const libraryService = require(path.join(__dirname, 'services/LibraryService'));
const subtitleService = require(path.join(__dirname, 'services/SubtitleService'));
const videoPlayerService = require(path.join(__dirname, 'services/VideoPlayerService'));
const playlistService = require(path.join(__dirname, 'services/PlaylistService'));
const remoteSubtitleService = require(path.join(__dirname, 'services/RemoteSubtitleService'));
const translationService = require(path.join(__dirname, 'services/TranslationService'));
const mediaLoaderService = require('./services/MediaLoaderService');

// 获取dialog模块
let dialog;

try {
    // 首先尝试从@electron/remote获取dialog
    const remote = require('@electron/remote');
    dialog = remote.dialog;
} catch (error) {
    try {
        // 如果上面失败，尝试从electron.remote获取
        const { remote } = require('electron');
        dialog = remote.dialog;
    } catch (err) {
        console.error('无法加载dialog模块:', err);
        // 创建一个空的dialog对象，避免应用崩溃
        dialog = {
            showOpenDialogSync: () => {
                alert('对话框功能不可用。请确保已正确安装@electron/remote模块。');
                return null;
            }
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // DOM元素
    const videoPlayer = document.getElementById('video-player');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const prevSubtitleBtn = document.getElementById('prev-subtitle-btn');
    const nextSubtitleBtn = document.getElementById('next-subtitle-btn');
    const loopSubtitleBtn = document.getElementById('loop-subtitle-btn');
    const playbackRateSelect = document.getElementById('playback-rate-select');
    const repeatCountInput = document.getElementById('repeat-count');
    const repeatPresetSelect = document.getElementById('repeat-preset');
    const subtitleBtn = document.getElementById('subtitle-btn');
    const selectSubtitleBtn = document.getElementById('select-subtitle-btn');
    const remoteSubtitleBtn = document.getElementById('remote-subtitle-btn');
    const subtitleSelect = document.getElementById('subtitle-select');
    const subtitleOriginal = document.getElementById('subtitle-original');
    const subtitleTranslation = document.getElementById('subtitle-translation');
    const subtitleCounter = document.getElementById('subtitle-counter');
    const selectVideoBtn = document.getElementById('select-video-btn');
    const playlistContainer = document.getElementById('playlist');
    const progressFill = document.querySelector('.progress-fill');
    const progressBar = document.querySelector('.progress-bar');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    const librariesList = document.getElementById('libraries-list');
    const addLibraryBtn = document.getElementById('add-library-btn');
    // 新增的输入框元素
    const subtitleInputContainer = document.getElementById('subtitle-input-container');
    const subtitleTranslationInput = document.getElementById('subtitle-translation-input');
    const translateSubtitleBtn = document.getElementById('translateSubtitleBtn');
    const translateBtn = document.getElementById('translate-btn');
    const setupTencentCloudBtn = document.getElementById('setup-tencent-cloud-btn');

    // 当前加载的视频文件
    let currentVideoFile = null;

    // 初始化
    videoPlayer.controls = false; // 使用自定义控件
    
    // 重置远程字幕按钮状态
    const resetRemoteSubtitleButton = () => {
        // 清除之前的进度条
        const existingProgress = remoteSubtitleBtn.querySelector('.progress-overlay');
        if (existingProgress) {
            existingProgress.remove();
        }
        
        // 重置按钮文本
        remoteSubtitleBtn.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Load Remote Subtitle';
        
        // 默认禁用，等待视频加载后决定是否启用
        remoteSubtitleBtn.disabled = true;
    };

    // 确保初始状态下输入框是隐藏的
    subtitleOriginal.style.display = 'block';
    subtitleTranslation.style.display = 'block';
    subtitleInputContainer.style.display = 'none';
    
    // 初始化远程字幕按钮
    resetRemoteSubtitleButton();
    
    // 加载库和上次激活的库
    initializeLibraries();
    
    // 初始化库
    function initializeLibraries() {
        libraryService.loadLibraries();
        const lastLibrary = libraryService.loadLastActiveLibrary();
        if (lastLibrary) {
            loadLibraryContent(lastLibrary);
        }
        renderLibraries();
    }

    // 渲染库列表
    function renderLibraries() {
        librariesList.innerHTML = '';
        
        libraryService.getAllLibraries().forEach((library, index) => {
            const libraryItem = document.createElement('div');
            libraryItem.className = `library-item ${index === libraryService.getCurrentLibraryIndex() ? 'active' : ''}`;
            libraryItem.dataset.index = index;
            
            const libraryName = document.createElement('div');
            libraryName.className = 'library-name';
            libraryName.textContent = library.name || fileSystemService.getLastPathSegment(library.path);
            
            const libraryPath = document.createElement('div');
            libraryPath.className = 'library-path';
            libraryPath.textContent = library.path;
            
            const removeBtn = document.createElement('div');
            removeBtn.className = 'library-remove';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            
            libraryItem.appendChild(libraryName);
            libraryItem.appendChild(libraryPath);
            libraryItem.appendChild(removeBtn);
            
            libraryItem.addEventListener('click', (e) => {
                if (!e.target.closest('.library-remove')) {
                    const library = libraryService.selectLibrary(index);
                    
                    // 更新激活类
                    document.querySelectorAll('.library-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    libraryItem.classList.add('active');
                    
                    loadLibraryContent(library);
                }
            });
            
            // 删除库按钮事件
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const result = libraryService.removeLibrary(index);
                renderLibraries();
                
                if (typeof result === 'object') {
                    // 如果返回的是库对象，加载该库
                    loadLibraryContent(result);
                } else if (result === null) {
                    // 如果没有库了，清空播放列表
                    playlistContainer.innerHTML = '';
                }
            });
            
            librariesList.appendChild(libraryItem);
        });
    }

    // 加载库内容
    function loadLibraryContent(library) {
        // 防御性检查 - 确保library存在
        if (!library) {
            if (playlistContainer) {
                playlistContainer.innerHTML = '<div class="empty-message">Invalid library</div>';
            }
            return;
        }
        
        // 防御性检查 - 确保library.files存在
        if (!library.files) {
            if (playlistContainer) {
                playlistContainer.innerHTML = '<div class="empty-message">No files in this library</div>';
            }
            return;
        }
        
        try {
            // 保存目录文件供字幕匹配使用
            window.lastDirectoryFiles = library.files;
            
            // 使用PlaylistService生成播放列表
            playlistService.populatePlaylist(library.files, playlistContainer, (file, item) => {
                // 播放列表项点击回调
                handleVideoSelection(file);
                playlistService.updateActiveItem(item);
            });
        } catch (error) {
            console.error("Error loading library content:", error);
            if (playlistContainer) {
                playlistContainer.innerHTML = `<div class="empty-message">Error: ${error.message}</div>`;
            }
        }
    }

    // 更新进度条
    const updateProgress = () => {
        if (videoPlayer.duration) {
            const percent = (videoPlayer.currentTime / videoPlayer.duration) * 100;
            progressFill.style.width = `${percent}%`;
            currentTimeEl.textContent = videoPlayerService.formatTime(videoPlayer.currentTime);
            durationEl.textContent = videoPlayerService.formatTime(videoPlayer.duration);
        }
    };

    // 检查和更新字幕
    const checkSubtitle = () => {
        if (!videoPlayer || !subtitleService.getAllSubtitles().length) return;
        
        const currentTime = videoPlayer.currentTime;
        
        // 寻找当前时间对应的字幕
        const subtitleIndex = subtitleService.findSubtitleAtTime(currentTime);
        
        // 字幕发生变化时
        if (subtitleIndex !== -1 && subtitleIndex !== subtitleService.getCurrentSubtitleIndex()) {
            const prevIndex = subtitleService.getCurrentSubtitleIndex();
            subtitleService.setCurrentSubtitleIndex(subtitleIndex);
            displaySubtitle(subtitleIndex);
            videoPlayerService.resetCurrentRepeat();
            
            console.log(`Subtitle changed: from #${prevIndex + 1} to #${subtitleIndex + 1}`);
        }
        
        // 如果没有找到当前字幕，什么也不做
        if (subtitleService.getCurrentSubtitleIndex() === -1) return;
        
        const currentSubtitle = subtitleService.getAllSubtitles()[subtitleService.getCurrentSubtitleIndex()];
        const timeUntilEnd = currentSubtitle.endTime - currentTime;
        
        // 这个扩大的判断窗口用于避免播放器跳过字幕
        const isNearEnd = timeUntilEnd <= 0.1;
        
        if (isNearEnd) {
            // 无限循环模式
            if (videoPlayerService.isInfiniteLoopMode()) {
                console.log(`Infinite loop: replaying subtitle #${subtitleService.getCurrentSubtitleIndex() + 1}`);
                videoPlayer.currentTime = currentSubtitle.startTime + 0.01; // 添加0.01s避免精度问题
                return;
            }
            
            // 有限重复模式
            if (videoPlayerService.getCurrentRepeat() < videoPlayerService.getRepeatCount() - 1) {
                videoPlayerService.incrementCurrentRepeat();
                console.log(`Limited repeat: ${videoPlayerService.getCurrentRepeat()}/${videoPlayerService.getRepeatCount()-1} repetitions of subtitle #${subtitleService.getCurrentSubtitleIndex() + 1}`);
                videoPlayer.currentTime = currentSubtitle.startTime + 0.01; // 添加0.01s避免精度问题
                return;
            }
        }
    };

    // 显示字幕
    const displaySubtitle = (index) => {
        const subtitles = subtitleService.getAllSubtitles();
        
        if (index < 0 || index >= subtitles.length) {
            subtitleOriginal.textContent = '';
            subtitleTranslation.textContent = '';
            subtitleCounter.textContent = '0/0';
            
            // 清空输入框
            subtitleTranslationInput.value = '';
            
            // 更新字幕控制按钮状态
            updateSubtitleControlsState();
            return;
        }

        const subtitle = subtitles[index];
        
        // 保留字幕文本中的换行符
        subtitleOriginal.innerHTML = subtitle.text.replace(/\n/g, '<br>');
        subtitleTranslation.innerHTML = subtitle.translation ? subtitle.translation.replace(/\n/g, '<br>') : '';
        
        // 更新字幕计数器
        subtitleCounter.textContent = `${index + 1}/${subtitles.length}`;
        
        // 更新字幕下拉选择框
        subtitleSelect.value = index;
        
        // 更新输入框的内容（无论是否在输入模式）
        // 优先显示用户输入的内容（如果有）
        subtitleTranslationInput.value = subtitle.userTranslation || subtitle.translation || '';
        
        // 更新字幕控制按钮状态
        updateSubtitleControlsState();
    };

    // 跳转到指定字幕
    const goToSubtitle = (index) => {
        const subtitles = subtitleService.getAllSubtitles();
        if (index < 0 || index >= subtitles.length) return;
        
        subtitleService.setCurrentSubtitleIndex(index);
        const subtitle = subtitles[index];
        
        videoPlayer.currentTime = subtitle.startTime;
        displaySubtitle(index);
        
        // 重置重复计数器
        videoPlayerService.resetCurrentRepeat();
        
        if (videoPlayer.paused && videoPlayerService.isVideoPlaying()) {
            videoPlayer.play();
        }
    };

    // 跳转到下一个字幕
    function goToNextSubtitle() {
        const subtitles = subtitleService.getAllSubtitles();
        if (!subtitles || subtitles.length === 0) return;
        
        // 获取当前时间和下一个字幕索引
        const currentTime = videoPlayer.currentTime;
        let nextIndex = -1;
        
        // 查找下一个字幕
        for (let i = 0; i < subtitles.length; i++) {
            if (subtitles[i].startTime > currentTime) {
                nextIndex = i;
                break;
            }
        }
        
        // 如果找到下一个字幕，跳转到它
        if (nextIndex !== -1) {
            videoPlayer.currentTime = subtitles[nextIndex].startTime + 0.01; // 添加一个小偏移确保触发字幕
            displaySubtitle(nextIndex);
        } else if (subtitles.length > 0) {
            // 如果当前已是最后一个字幕，可以循环到第一个
            videoPlayer.currentTime = subtitles[0].startTime + 0.01;
            displaySubtitle(0);
        }
    }

    // 更新重复次数预设
    const updateRepeatCountFromPreset = (value) => {
        if (value === "infinite") {
            videoPlayerService.setInfiniteLoopMode(true);
            loopSubtitleBtn.classList.add('active');
            
            // 禁用重复次数输入
            if (repeatCountInput) {
                repeatCountInput.disabled = true;
            }
            
            console.log('启用无限循环模式');
        } else {
            videoPlayerService.setInfiniteLoopMode(false);
            loopSubtitleBtn.classList.remove('active');
            
            // 启用重复次数输入
            if (value === "custom") {
                if (document.querySelector('.repeat-control')) {
                    document.querySelector('.repeat-control').classList.add('custom');
                }
            } else {
                if (document.querySelector('.repeat-control')) {
                    document.querySelector('.repeat-control').classList.remove('custom');
                }
                
                // 根据预设设置重复次数
                if (repeatCountInput) {
                    repeatCountInput.disabled = false;
                    videoPlayerService.setRepeatCount(parseInt(value));
                    repeatCountInput.value = videoPlayerService.getRepeatCount();
                }
            }
        }
    };

    // 切换无限循环模式
    const toggleInfiniteLoop = () => {
        const isInfiniteMode = videoPlayerService.toggleInfiniteLoopMode();
        
        // 更新UI
        if (isInfiniteMode) {
            loopSubtitleBtn.classList.add('active');
            repeatPresetSelect.value = "infinite";
            if (document.querySelector('.repeat-control')) {
                document.querySelector('.repeat-control').classList.remove('custom');
            }
            
            // 如果当前有字幕正在播放，立即跳到当前字幕开头
            const currentSubtitleIndex = subtitleService.getCurrentSubtitleIndex();
            if (currentSubtitleIndex >= 0) {
                const subtitles = subtitleService.getAllSubtitles();
                const currentSubtitle = subtitles[currentSubtitleIndex];
                console.log(`启用循环：跳转到第${currentSubtitleIndex + 1}句开头`);
                videoPlayer.currentTime = currentSubtitle.startTime + 0.01; // 添加0.01s避免精度问题
            }
        } else {
            loopSubtitleBtn.classList.remove('active');
            repeatPresetSelect.value = videoPlayerService.getRepeatCount().toString();
            // 检查当前重复次数是否有对应的预设
            const hasPreset = ["1", "3", "5", "10"].includes(videoPlayerService.getRepeatCount().toString());
            if (!hasPreset && document.querySelector('.repeat-control')) {
                repeatPresetSelect.value = "custom";
                document.querySelector('.repeat-control').classList.add('custom');
            }
        }
    };

    // 处理单个视频选择
    const handleVideoSelection = (file) => {
        try {
            // 保存当前视频文件引用
            currentVideoFile = file;

            // 处理文件名中的特殊字符
            if (file.name && file.name.includes('#')) {
                console.log('File name contains special character #, performing safe handling');
                // 创建一个新的文件对象，但安全处理文件名
                file = {
                    ...file,
                    name: file.name.replace(/#/g, '_')  // 用下划线替换#以便显示
                };
            }

            const filename = videoPlayerService.loadVideoFile(file, videoPlayer);
            document.title = `Playing: ${filename}`;
            
            // 重置控件
            subtitleService.setCurrentSubtitleIndex(-1);
            displaySubtitle(-1);
            videoPlayerService.resetCurrentRepeat();
            
            // 更新字幕控制按钮状态
            updateSubtitleControlsState();
            
            // 重置远程字幕按钮
            resetRemoteSubtitleButton();
            
            // 自动播放
            videoPlayer.onloadedmetadata = () => {
                updateProgress();
                const isPlaying = videoPlayerService.togglePlayPause(videoPlayer);
                playPauseBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
                
                // 获取视频尺寸并调整窗口大小以匹配视频宽高比
                const videoWidth = videoPlayer.videoWidth;
                const videoHeight = videoPlayer.videoHeight;
                
                if (videoWidth && videoHeight) {
                    console.log(`Video dimensions: ${videoWidth}x${videoHeight}`);
                    // 发送消息到主进程以调整窗口大小
                    ipcRenderer.send('resize-window-to-aspect-ratio', {
                        width: videoWidth,
                        height: videoHeight
                    });
                }
            };
            
            // 尝试加载匹配的字幕
            const hasLocalSubtitle = tryLoadMatchingSubtitle(file);
            
            // 如果没有本地字幕，启用远程字幕按钮
            if (!hasLocalSubtitle) {
                remoteSubtitleBtn.disabled = false;
            } else {
                remoteSubtitleBtn.disabled = true;
            }
        } catch (error) {
            console.error('Error loading video file:', error);
            alert(`Error loading video file: ${error.message}`);
        }
    };

    // 尝试加载匹配的字幕
    const tryLoadMatchingSubtitle = (videoFile) => {
        // 使用FileSystemService查找匹配的字幕
        const srtFile = fileSystemService.findMatchingSubtitle(videoFile);
        
        if (srtFile) {
            loadSubtitleFile(srtFile);
            return true;
        }
        
        // 兼容旧的方法，用于File API加载的文件
        if (window.lastDirectoryFiles && window.lastDirectoryFiles.length > 0) {
            const videoFileName = videoFile.name.substring(0, videoFile.name.lastIndexOf('.'));
            
            // 安全处理文件名中的特殊字符
            const safeVideoFileName = videoFileName.replace(/#/g, '');
            
            // 查找与基本名称相同的SRT文件（不区分大小写）
            const matchingSrt = Array.from(window.lastDirectoryFiles).find(file => 
                file.name.toLowerCase() === (safeVideoFileName.toLowerCase() + '.srt') || 
                file.name.toLowerCase() === (safeVideoFileName.trim().toLowerCase() + '.srt'));
                
            if (matchingSrt) {
                console.log("Found matching subtitle:", matchingSrt.name);
                loadSubtitleFile(matchingSrt);
                return true;
            }
        }

        // 如果没有找到匹配的字幕，重置字幕相关元素
        subtitleOriginal.textContent = "No subtitle file found. Please load subtitle manually.";
        subtitleTranslation.textContent = '';
        subtitleSelect.innerHTML = '<option value="">Jump to subtitle...</option>';
        subtitleService.clearSubtitles();
        
        // 更新字幕控制按钮状态
        updateSubtitleControlsState();
        
        return false;
    };

    // 加载字幕文件
    const loadSubtitleFile = async (file) => {
        try {
            const subtitles = await subtitleService.loadSubtitleFile(file);
            console.log(`Loaded ${subtitles.length} subtitles`);
            
            // 填充字幕选择下拉框
            populateSubtitleSelect(subtitles);
            
            // 更新字幕控制按钮状态
            updateSubtitleControlsState();
            
            return true;
        } catch (error) {
            console.error('Failed to load subtitle:', error);
            alert(`Failed to load subtitle: ${error.message}`);
            
            return false;
        }
    };

    // 填充字幕选择下拉框
    const populateSubtitleSelect = (subtitles) => {
        subtitleSelect.innerHTML = '<option value="">Subtitle List</option>';
        
        if (!subtitles || subtitles.length === 0) {
            subtitleService.setSubtitlesVisible(false);
            subtitleBtn.style.opacity = '0.5';
            subtitleOriginal.textContent = '';
            subtitleTranslation.textContent = '';
            subtitleCounter.textContent = '0/0';
            
            remoteSubtitleBtn.disabled = false;
            
            // 重置所有输入模式
            subtitleOriginal.style.display = 'block'; 
            subtitleTranslation.style.display = 'block';
            subtitleInputContainer.style.display = 'none';
            
            return;
        }
        
        // 重置远程字幕按钮状态
        remoteSubtitleBtn.disabled = true;
        
        // 显示字幕
        subtitles.forEach((subtitle, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = subtitle.text.length > 30 
                ? subtitle.text.substring(0, 30) + '...' 
                : subtitle.text;
            subtitleSelect.appendChild(option);
        });
        
        // 如果视频已经在播放，查找并显示对应的字幕
        if (videoPlayer.currentTime > 0) {
            const subtitleIndex = subtitleService.findSubtitleAtTime(videoPlayer.currentTime);
            if (subtitleIndex !== -1) {
                subtitleService.setCurrentSubtitleIndex(subtitleIndex);
                displaySubtitle(subtitleIndex);
            }
        }
        
        // 启用字幕显示
        subtitleService.setSubtitlesVisible(true);
        subtitleBtn.style.opacity = '1';
        
        // 更新字幕控制按钮状态
        updateSubtitleControlsState();
    };

    // 检查字幕是否需要翻译，并显示翻译按钮
    const checkNeedsTranslation = () => {
        // 如果没有字幕，隐藏翻译按钮
        if (!subtitleService.getAllSubtitles() || subtitleService.getAllSubtitles().length === 0) {
            translateSubtitleBtn.style.display = 'none';
            return;
        }
        
        // 检查字幕是否需要翻译（有文本但没有中文）
        if (translationService.needsTranslation(subtitleService.getAllSubtitles())) {
            // 检查当前字幕是否包含中文
            const currentSubtitleIndex = subtitleService.getCurrentSubtitleIndex();
            if (currentSubtitleIndex !== -1) {
                const currentSubtitle = subtitleService.getAllSubtitles()[currentSubtitleIndex];
                // 使用正则表达式检查是否包含中文字符
                const hasChinese = /[\u4e00-\u9fa5]/.test(currentSubtitle.text);
                if (hasChinese) {
                    translateSubtitleBtn.style.display = 'none';
                    return;
                }
            }
            
            translateSubtitleBtn.style.display = 'inline-block';
        } else {
            translateSubtitleBtn.style.display = 'none';
        }
    };

    // 翻译当前字幕文件
    const translateCurrentSubtitle = async () => {
        // 检查是否有字幕和当前视频文件
        if (!subtitleService.getAllSubtitles() || !currentVideoFile) {
            alert('No subtitle file to translate');
            return;
        }
        
        // 检查是否正在翻译
        if (translationService.isTranslationInProgress()) {
            alert('Translation in progress, please wait...');
            return;
        }
        
        try {
            // 获取当前字幕文件路径
            const subtitlePath = currentVideoFile.path.replace(/\.[^/.]+$/, '.srt');
            if (!fs.existsSync(subtitlePath)) {
                alert('Subtitle file not found');
                return;
            }
            
            // 显示加载状态
            translateSubtitleBtn.disabled = true;
            translateSubtitleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating...';
            
            // 翻译字幕
            const subtitles = subtitleService.getAllSubtitles();
            await translationService.translateSubtitles(subtitles, subtitlePath);
            
            // 重新加载字幕文件
            const srtFile = {
                name: path.basename(subtitlePath),
                path: subtitlePath
            };
            
            await loadSubtitleFile(srtFile);
            
            // 重置按钮
            translateSubtitleBtn.disabled = false;
            translateSubtitleBtn.innerHTML = '<i class="fas fa-language"></i> Translate';
            
            // 翻译完成后，隐藏翻译按钮
            translateSubtitleBtn.style.display = 'none';
        } catch (error) {
            console.error('Failed to translate subtitle:', error);
            alert(`Failed to translate subtitle: ${error.message}`);
            
            // 重置按钮
            translateSubtitleBtn.disabled = false;
            translateSubtitleBtn.innerHTML = '<i class="fas fa-language"></i> Translate';
        }
    };

    // 事件监听器
    
    // 字幕输入框内容变化时自动保存
    subtitleTranslationInput.addEventListener('input', () => {
        const currentSubtitleIndex = subtitleService.getCurrentSubtitleIndex();
        
        if (currentSubtitleIndex !== -1) {
            const subtitles = subtitleService.getAllSubtitles();
            const currentSubtitle = subtitles[currentSubtitleIndex];
            
            if (currentSubtitle) {
                // 保存用户输入的翻译内容到当前字幕
                currentSubtitle.userTranslation = subtitleTranslationInput.value;
            }
        }
    });

    // 视频时间更新
    videoPlayer.addEventListener('timeupdate', () => {
        updateProgress();
        
        // 如果处于输入模式，不检查更新字幕
        if (subtitleService.isInputMode()) {
            return;
        }
        
        if (subtitleService.isSubtitlesVisible() && subtitleService.getAllSubtitles().length > 0) {
            checkSubtitle();
        }
    });

    // 进度条点击
    progressBar.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        videoPlayer.currentTime = pos * videoPlayer.duration;
    });

    // 播放/暂停按钮
    playPauseBtn.addEventListener('click', () => {
        const isPlaying = videoPlayerService.togglePlayPause(videoPlayer);
        playPauseBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    });

    // 视频点击播放/暂停
    videoPlayer.addEventListener('click', () => {
        const isPlaying = videoPlayerService.togglePlayPause(videoPlayer);
        playPauseBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    });

    // 播放速率变化
    playbackRateSelect.addEventListener('change', () => {
        videoPlayerService.setPlaybackRate(playbackRateSelect.value, videoPlayer);
    });

    // 重复次数变化
    repeatCountInput.addEventListener('change', () => {
        videoPlayerService.setRepeatCount(repeatCountInput.value);
        // 更新预设下拉框以匹配
        if (videoPlayerService.getRepeatCount() === 3) repeatPresetSelect.value = "3";
        else if (videoPlayerService.getRepeatCount() === 5) repeatPresetSelect.value = "5";
        else if (videoPlayerService.getRepeatCount() === 10) repeatPresetSelect.value = "10";
        else repeatPresetSelect.value = "custom";
    });

    // 重复预设变化
    if (repeatPresetSelect) {
        repeatPresetSelect.addEventListener('change', () => {
            updateRepeatCountFromPreset(repeatPresetSelect.value);
        });
    }

    // 切换字幕
    subtitleBtn.addEventListener('click', () => {
        // 如果处于输入模式，保存当前输入
        if (subtitleService.isInputMode()) {
            const currentSubtitleIndex = subtitleService.getCurrentSubtitleIndex();
            if (currentSubtitleIndex !== -1) {
                const subtitles = subtitleService.getAllSubtitles();
                const currentSubtitle = subtitles[currentSubtitleIndex];
                if (currentSubtitle) {
                    currentSubtitle.userTranslation = subtitleTranslationInput.value;
                }
            }
        }

        const isVisible = subtitleService.toggleSubtitlesVisibility();
        subtitleBtn.style.opacity = isVisible ? '1' : '0.5';
        
        if (!isVisible) {
            // 隐藏字幕区域，显示输入框
            subtitleOriginal.style.display = 'none';
            subtitleTranslation.style.display = 'none';
            subtitleCounter.textContent = '0/0';
            subtitleInputContainer.style.display = 'flex';
        } else {
            // 显示字幕，隐藏输入框
            subtitleOriginal.style.display = 'block';
            subtitleTranslation.style.display = 'block';
            subtitleInputContainer.style.display = 'none';
            
            // 恢复当前字幕显示
            if (subtitleService.getCurrentSubtitleIndex() !== -1) {
                displaySubtitle(subtitleService.getCurrentSubtitleIndex());
            }
        }
    });

    // 切换无限循环
    loopSubtitleBtn.addEventListener('click', toggleInfiniteLoop);

    // 上一个字幕
    prevSubtitleBtn.addEventListener('click', () => {
        goToSubtitle(subtitleService.getCurrentSubtitleIndex() - 1);
    });

    // 下一个字幕
    nextSubtitleBtn.addEventListener('click', goToNextSubtitle);

    // 字幕选择变化
    subtitleSelect.addEventListener('change', () => {
        if (subtitleSelect.value) {
            goToSubtitle(parseInt(subtitleSelect.value));
        }
    });

    // 选择字幕文件
    selectSubtitleBtn.addEventListener('click', () => {
        // 使用Electron的对话框API选择字幕文件
        const filePaths = dialog.showOpenDialogSync({
            properties: ['openFile'],
            filters: [
                { name: 'Subtitle Files', extensions: ['srt'] }
            ],
            title: 'Select Subtitle File'
        });
        
        if (filePaths && filePaths.length > 0) {
            const srtPath = filePaths[0];
            try {
                // 创建一个类似File对象的结构
                const srtFile = {
                    name: path.basename(srtPath),
                    path: srtPath
                };
                loadSubtitleFile(srtFile);
            } catch (error) {
                console.error('Error loading subtitle file:', error);
                alert(`Error loading subtitle file: ${error.message}`);
            }
        }
    });

    // 远程字幕下载按钮
    remoteSubtitleBtn.addEventListener('click', () => {
        // 检查是否有视频加载
        if (!currentVideoFile) {
            alert('Please load a video file first');
            return;
        }
        
        // 检查文件大小是否超过50MB
        const isLargeFile = remoteSubtitleService.isVideoSizeAbove(currentVideoFile.path, 50);
        let shouldProceed = true;
        
        // 如果文件大于50MB，显示确认对话框
        if (isLargeFile) {
            shouldProceed = confirm('The video file is large (>50MB), upload may take longer. Continue?');
        }
        
        if (shouldProceed) {
            // 开始字幕处理
            processRemoteSubtitle();
        }
    });

    // 处理远程字幕生成
    const processRemoteSubtitle = async () => {
        try {
            // 禁用按钮，防止重复点击
            remoteSubtitleBtn.disabled = true;
            
            // 显示进度信息
            updateRemoteSubtitleProgress(5, "Preparing...");
            
            // 直接调用下载函数
            await downloadRemoteSubtitle();
        } catch (error) {
            console.error('Subtitle processing failed:', error);
            alert(`Subtitle processing failed: ${error.message}`);
            resetRemoteSubtitleButton();
            remoteSubtitleBtn.disabled = false;
        }
    };

    // 视频文件选择
    selectVideoBtn.addEventListener('click', () => {
        // 使用Electron的对话框API选择视频文件
        const filePaths = dialog.showOpenDialogSync({
            properties: ['openFile'],
            filters: [
                { name: 'Video Files', extensions: ['mp4', 'mkv', 'webm', 'avi', 'mov'] }
            ],
            title: 'Select Video File'
        });
        
        if (filePaths && filePaths.length > 0) {
            const videoPath = filePaths[0];
            try {
                // 检查并清理文件名
                const originalFileName = path.basename(videoPath);
                const FileCleanupService = require('./services/FileCleanupService');
                
                if (FileCleanupService.needsCleaning(originalFileName)) {
                    // 文件名需要清理
                    const cleanFileName = FileCleanupService.sanitizeFilename(originalFileName);
                    const directoryPath = path.dirname(videoPath);
                    const newFilePath = path.join(directoryPath, cleanFileName);
                    
                    // 重命名文件
                    fs.renameSync(videoPath, newFilePath);
                    console.log(`Auto-renamed file: "${originalFileName}" -> "${cleanFileName}"`);
                    
                    // 使用新的路径创建文件对象
                    const videoFile = {
                        name: cleanFileName,
                        path: newFilePath,
                        size: fs.statSync(newFilePath).size,
                        lastModified: fs.statSync(newFilePath).mtimeMs
                    };
                    
                    handleVideoSelection(videoFile);
                    
                    // 添加到播放列表
                    playlistContainer.innerHTML = '';
                    const item = document.createElement('div');
                    item.className = 'playlist-item active';
                    item.textContent = videoFile.name;
                    playlistContainer.appendChild(item);
                } else {
                    // 文件名不需要清理，使用原始路径
                    const videoFile = {
                        name: originalFileName,
                        path: videoPath,
                        size: fs.statSync(videoPath).size,
                        lastModified: fs.statSync(videoPath).mtimeMs
                    };
                    
                    handleVideoSelection(videoFile);
                    
                    // 添加到播放列表
                    playlistContainer.innerHTML = '';
                    const item = document.createElement('div');
                    item.className = 'playlist-item active';
                    item.textContent = videoFile.name;
                    playlistContainer.appendChild(item);
                }
            } catch (error) {
                console.error('Error loading video file:', error);
                alert(`Error loading video file: ${error.message}`);
            }
        }
    });

    // 添加新库
    addLibraryBtn.addEventListener('click', () => {
        // 使用Electron的对话框API选择文件夹
        const folderPath = dialog.showOpenDialogSync({
            properties: ['openDirectory'],
            title: 'Select Media Folder'
        });
        
        if (folderPath && folderPath.length > 0) {
            const selectedPath = folderPath[0];
            
            try {
                // 检查路径是否存在
                if (fs.existsSync(selectedPath)) {
                    // 使用MediaLoaderService加载目录并清理文件名
                    mediaLoaderService.loadMediaDirectory(selectedPath, true)
                        .then(mediaFiles => {
                            // 获取所有文件（包括清理后的）
                            const filesList = [];
                            fileSystemService.collectFilesRecursively(selectedPath, filesList);
                            
                            // 添加这个目录到库中
                            const library = libraryService.addLibrary(selectedPath, filesList);
                            renderLibraries();
                            loadLibraryContent(library);
                            
                            // 显示清理信息
                            const renamedFiles = mediaLoaderService.getRecentlyRenamed();
                            if (renamedFiles && renamedFiles.length > 0) {
                                console.log(`Auto-renamed ${renamedFiles.length} files`);
                            }
                        })
                        .catch(error => {
                            console.error('Error processing directory:', error);
                            alert(`Error processing directory: ${error.message}`);
                        });
                } else {
                    alert('Selected folder does not exist');
                }
            } catch (error) {
                console.error('Error opening folder:', error);
                alert(`Error opening folder: ${error.message}`);
            }
        }
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        // 如果当前正在编辑字幕，则不处理播放控制快捷键
        if (subtitleService.isEditingSubtitle() || document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
            return;
        }
        
        // 播放/暂停 - 空格键
        if (e.code === 'Space') {
            togglePlayPause();
            e.preventDefault();
        }
        
        // 前进5秒 - 右箭头
        if (e.code === 'ArrowRight') {
            skip(5);
            e.preventDefault();
        }
        
        // 后退5秒 - 左箭头
        if (e.code === 'ArrowLeft') {
            skip(-5);
            e.preventDefault();
        }
        
        // 音量增加 - 上箭头
        if (e.code === 'ArrowUp') {
            changeVolume(0.05);
            e.preventDefault();
        }
        
        // 音量减小 - 下箭头
        if (e.code === 'ArrowDown') {
            changeVolume(-0.05);
            e.preventDefault();
        }
        
        // 切换无限循环模式 - L键
        if (e.code === 'KeyL') {
            toggleInfiniteLoop();
            e.preventDefault();
        }
        
        // 切换字幕显示 - S键
        if (e.code === 'KeyS') {
            toggleSubtitleVisibility();
            e.preventDefault();
        }
        
        // 翻译字幕 - T键
        if (e.code === 'KeyT') {
            translateCurrentSubtitle();
            e.preventDefault();
        }
        
        // 设置播放速度
        if (e.code === 'Digit1') {
            setPlaybackRate(1.0);
            e.preventDefault();
        } else if (e.code === 'Digit2') {
            setPlaybackRate(1.25);
            e.preventDefault();
        } else if (e.code === 'Digit3') {
            setPlaybackRate(1.5);
            e.preventDefault();
        } else if (e.code === 'Digit4') {
            setPlaybackRate(1.75);
            e.preventDefault();
        } else if (e.code === 'Digit5') {
            setPlaybackRate(2.0);
            e.preventDefault();
        } else if (e.code === 'Digit0') {
            setPlaybackRate(0.75);
            e.preventDefault();
        }
    });

    // 视频结束
    videoPlayer.addEventListener('ended', () => {
        videoPlayerService.isPlaying = false;
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    });

    // 更新远程字幕下载进度
    const updateRemoteSubtitleProgress = (percent, statusText) => {
        // 确保百分比在0-100之间
        percent = Math.max(0, Math.min(100, percent));
        
        // 获取或创建进度条元素
        let progressOverlay = remoteSubtitleBtn.querySelector('.progress-overlay');
        if (!progressOverlay) {
            progressOverlay = document.createElement('div');
            progressOverlay.className = 'progress-overlay';
            remoteSubtitleBtn.appendChild(progressOverlay);
        }
        
        // 更新进度条宽度
        progressOverlay.style.width = `${percent}%`;
        
        // 更新按钮文本以显示状态
        if (statusText) {
            remoteSubtitleBtn.innerHTML = `<i class="fas fa-sync fa-spin"></i> ${statusText}`;
        }
        
        // 如果完成，延迟后重置按钮
        if (percent >= 100) {
            setTimeout(() => {
                resetRemoteSubtitleButton();
                remoteSubtitleBtn.disabled = true; // 下载完成后禁用按钮
            }, 1500);
        }
    };

    // 从远程下载字幕
    const downloadRemoteSubtitle = async () => {
        if (!currentVideoFile || !currentVideoFile.path) {
            alert('Please load a video file first');
            return;
        }
        
        try {
            // 禁用按钮，防止重复点击
            remoteSubtitleBtn.disabled = true;
            
            // 使用真实的火山引擎API获取字幕
            const subtitleContent = await remoteSubtitleService.downloadSubtitle(
                currentVideoFile.path,
                updateRemoteSubtitleProgress
            );
            
            // 保存字幕文件
            const srtPath = await remoteSubtitleService.saveSubtitleFile(
                subtitleContent,
                currentVideoFile.path
            );
            
            // 创建一个类似File对象的结构
            const srtFile = {
                name: path.basename(srtPath),
                path: srtPath
            };
            
            // 加载字幕
            await loadSubtitleFile(srtFile);
            
            updateRemoteSubtitleProgress(100, "Completed");
            console.log('Remote subtitle downloaded and loaded successfully');
        } catch (error) {
            console.error('Error downloading remote subtitle:', error);
            alert(`Error downloading remote subtitle: ${error.message}`);
            
            // 重置按钮，允许重新尝试
            resetRemoteSubtitleButton();
            remoteSubtitleBtn.disabled = false;
        }
    };

    // 翻译字幕按钮事件
    translateSubtitleBtn.addEventListener('click', translateCurrentSubtitle);

    // 更新字幕控制按钮的状态
    const updateSubtitleControlsState = () => {
        // Check if subtitles are loaded
        const hasSubtitles = subtitleService.getAllSubtitles() && subtitleService.getAllSubtitles().length > 0;
        
        // Enable/disable subtitle control buttons
        prevSubtitleBtn.disabled = !hasSubtitles;
        nextSubtitleBtn.disabled = !hasSubtitles;
        loopSubtitleBtn.disabled = !hasSubtitles;
        subtitleSelect.disabled = !hasSubtitles;
        repeatPresetSelect.disabled = !hasSubtitles;
        repeatCountInput.disabled = !hasSubtitles;
        
        // Update visual state
        prevSubtitleBtn.style.opacity = hasSubtitles ? '1' : '0.5';
        nextSubtitleBtn.style.opacity = hasSubtitles ? '1' : '0.5';
        loopSubtitleBtn.style.opacity = hasSubtitles ? '1' : '0.5';
        subtitleSelect.style.opacity = hasSubtitles ? '1' : '0.5';
        repeatPresetSelect.style.opacity = hasSubtitles ? '1' : '0.5';
        repeatCountInput.style.opacity = hasSubtitles ? '1' : '0.5';
        
        // Update translation button state
        updateTranslateButtonState();
    };
    
    // Update translation button state based on subtitles and Chinese content
    const updateTranslateButtonState = () => {
        // If no subtitles, disable translation button
        if (!subtitleService.getAllSubtitles() || subtitleService.getAllSubtitles().length === 0) {
            translateSubtitleBtn.disabled = true;
            translateSubtitleBtn.style.display = 'none';
            return;
        }
        
        // Check if translation is needed and there are no Chinese characters
        if (translationService.needsTranslation(subtitleService.getAllSubtitles())) {
            // Check if current subtitle contains Chinese
            const currentSubtitleIndex = subtitleService.getCurrentSubtitleIndex();
            if (currentSubtitleIndex !== -1) {
                const currentSubtitle = subtitleService.getAllSubtitles()[currentSubtitleIndex];
                // Check for Chinese characters
                const hasChinese = /[\u4e00-\u9fa5]/.test(currentSubtitle.text);
                if (hasChinese) {
                    translateSubtitleBtn.disabled = true;
                    translateSubtitleBtn.style.display = 'none';
                    return;
                }
            }
            
            translateSubtitleBtn.disabled = false;
            translateSubtitleBtn.style.display = 'inline-block';
        } else {
            translateSubtitleBtn.disabled = true;
            translateSubtitleBtn.style.display = 'none';
        }
    };
    
    // Initialize subtitle control buttons state
    updateSubtitleControlsState();

    // 设置腾讯云API凭证
    const setupTencentCloudCredentials = async () => {
        try {
            const secretId = prompt('请输入腾讯云 SecretId:');
            if (!secretId) return;

            const secretKey = prompt('请输入腾讯云 SecretKey:');
            if (!secretKey) return;

            await translationService.setCredentials(secretId, secretKey);
            alert('腾讯云API凭证设置成功！');
            updateTranslateButtonState();
        } catch (error) {
            console.error('设置腾讯云API凭证失败:', error);
            alert('设置腾讯云API凭证失败: ' + error.message);
        }
    };

    // 绑定事件监听器
    if (setupTencentCloudBtn) {
        setupTencentCloudBtn.addEventListener('click', setupTencentCloudCredentials);
    }

    // 初始化时检查凭证状态
    updateTranslateButtonState();
}); 