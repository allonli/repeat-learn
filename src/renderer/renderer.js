// 导入Node.js模块
const fs = require('fs');
const path = require('path');

// 导入服务 - 使用绝对路径
const fileSystemService = require(path.join(__dirname, 'services/FileSystemService'));
const libraryService = require(path.join(__dirname, 'services/LibraryService'));
const subtitleService = require(path.join(__dirname, 'services/SubtitleService'));
const videoPlayerService = require(path.join(__dirname, 'services/VideoPlayerService'));
const playlistService = require(path.join(__dirname, 'services/PlaylistService'));

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

    // 初始化
    videoPlayer.controls = false; // 使用自定义控件
    
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
            console.error("Invalid library parameter:", library);
            if (playlistContainer) {
                playlistContainer.innerHTML = '<div class="empty-message">Invalid library</div>';
            }
            return;
        }
        
        // 防御性检查 - 确保library.files存在
        if (!library.files) {
            console.error("Library has no files:", library);
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
            
            console.log(`字幕变化：从第${prevIndex + 1}句到第${subtitleIndex + 1}句`);
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
                console.log(`无限循环：重播第${subtitleService.getCurrentSubtitleIndex() + 1}句`);
                videoPlayer.currentTime = currentSubtitle.startTime + 0.01; // 添加0.01s避免精度问题
                return;
            }
            
            // 有限重复模式
            if (videoPlayerService.getCurrentRepeat() < videoPlayerService.getRepeatCount() - 1) {
                videoPlayerService.incrementCurrentRepeat();
                console.log(`有限重复：第${videoPlayerService.getCurrentRepeat()}/${videoPlayerService.getRepeatCount()-1}次重复第${subtitleService.getCurrentSubtitleIndex() + 1}句`);
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
        const repeatControlElement = document.querySelector('.repeat-control');
        if (repeatControlElement) {
            repeatControlElement.classList.remove('custom');
        }
        
        if (value === "infinite") {
            videoPlayerService.setInfiniteLoopMode(true);
            loopSubtitleBtn.classList.add('active');
            if (repeatCountInput) {
                repeatCountInput.disabled = true;
                repeatCountInput.style.display = 'none';
            }
            
            // 如果当前有字幕正在播放，立即跳到当前字幕开头
            const currentSubtitleIndex = subtitleService.getCurrentSubtitleIndex();
            if (currentSubtitleIndex >= 0) {
                const subtitles = subtitleService.getAllSubtitles();
                const currentSubtitle = subtitles[currentSubtitleIndex];
                console.log(`选择无限循环：跳转到第${currentSubtitleIndex + 1}句开头`);
                videoPlayer.currentTime = currentSubtitle.startTime + 0.01; // 添加0.01s避免精度问题
            }
        } else if (value === "custom") {
            videoPlayerService.setInfiniteLoopMode(false);
            loopSubtitleBtn.classList.remove('active');
            if (repeatCountInput) {
                repeatCountInput.disabled = false;
                if (repeatControlElement) {
                    repeatControlElement.classList.add('custom');
                }
            }
        } else {
            videoPlayerService.setInfiniteLoopMode(false);
            loopSubtitleBtn.classList.remove('active');
            if (repeatCountInput) {
                repeatCountInput.disabled = false;
                videoPlayerService.setRepeatCount(parseInt(value));
                repeatCountInput.value = videoPlayerService.getRepeatCount();
            }
        }
        videoPlayerService.resetCurrentRepeat();
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
            const filename = videoPlayerService.loadVideoFile(file, videoPlayer);
            document.title = `Playing: ${filename}`;
            
            // 重置控件
            subtitleService.setCurrentSubtitleIndex(-1);
            displaySubtitle(-1);
            videoPlayerService.resetCurrentRepeat();
            
            // 自动播放
            videoPlayer.onloadedmetadata = () => {
                updateProgress();
                const isPlaying = videoPlayerService.togglePlayPause(videoPlayer);
                playPauseBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
            };
            
            // 尝试加载匹配的字幕
            tryLoadMatchingSubtitle(file);
        } catch (error) {
            console.error('加载视频文件时出错:', error);
            alert(`加载视频文件时出错: ${error.message}`);
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
            
            // 查找与基本名称相同的SRT文件（不区分大小写）
            const matchingSrt = Array.from(window.lastDirectoryFiles).find(file => 
                file.name.toLowerCase() === (videoFileName.toLowerCase() + '.srt') || 
                file.name.toLowerCase() === (videoFileName.trim().toLowerCase() + '.srt'));
                
            if (matchingSrt) {
                console.log("Found matching subtitle:", matchingSrt.name);
                loadSubtitleFile(matchingSrt);
                return true;
            }
        }

        // 如果没有找到匹配的字幕，显示消息
        subtitleOriginal.textContent = "未找到字幕文件，请手动加载字幕";
        return false;
    };

    // 加载字幕文件
    const loadSubtitleFile = async (file) => {
        try {
            const subtitles = await subtitleService.loadSubtitleFile(file);
            
            // 填充字幕选择下拉框
            subtitleSelect.innerHTML = '<option value="">跳转到字幕...</option>';
            
            subtitles.forEach((subtitle, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${index + 1}: ${subtitle.text.substring(0, 30)}${subtitle.text.length > 30 ? '...' : ''}`;
                subtitleSelect.appendChild(option);
            });
            
            displaySubtitle(-1);
            
            subtitleBtn.style.opacity = '1';
            subtitleService.setSubtitlesVisible(true);
            
            // 如果视频已经在播放，查找并显示对应的字幕
            if (videoPlayer.currentTime > 0) {
                const subtitleIndex = subtitleService.findSubtitleAtTime(videoPlayer.currentTime);
                if (subtitleIndex !== -1) {
                    subtitleService.setCurrentSubtitleIndex(subtitleIndex);
                    displaySubtitle(subtitleIndex);
                }
            }
        } catch (error) {
            console.error('Error loading subtitles:', error);
            alert('Error loading subtitle file. Please select a valid SRT file.');
        }
    };

    // 事件监听器
    
    // 视频时间更新
    videoPlayer.addEventListener('timeupdate', () => {
        updateProgress();
        
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
        const isVisible = subtitleService.toggleSubtitlesVisibility();
        subtitleBtn.style.opacity = isVisible ? '1' : '0.5';
        
        if (!isVisible) {
            subtitleOriginal.textContent = '';
            subtitleTranslation.textContent = '';
            subtitleCounter.textContent = '0/0';
        } else if (subtitleService.getCurrentSubtitleIndex() !== -1) {
            displaySubtitle(subtitleService.getCurrentSubtitleIndex());
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
                { name: '字幕文件', extensions: ['srt'] }
            ],
            title: '选择字幕文件'
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
                console.error('加载字幕文件时出错:', error);
                alert(`加载字幕文件时出错: ${error.message}`);
            }
        }
    });

    // 视频文件选择
    selectVideoBtn.addEventListener('click', () => {
        // 使用Electron的对话框API选择视频文件
        const filePaths = dialog.showOpenDialogSync({
            properties: ['openFile'],
            filters: [
                { name: '视频文件', extensions: ['mp4', 'mkv', 'webm', 'avi', 'mov'] }
            ],
            title: '选择视频文件'
        });
        
        if (filePaths && filePaths.length > 0) {
            const videoPath = filePaths[0];
            try {
                // 创建一个类似File对象的结构
                const videoFile = {
                    name: path.basename(videoPath),
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
            } catch (error) {
                console.error('加载视频文件时出错:', error);
                alert(`加载视频文件时出错: ${error.message}`);
            }
        }
    });

    // 添加新库
    addLibraryBtn.addEventListener('click', () => {
        // 使用Electron的对话框API选择文件夹
        const folderPath = dialog.showOpenDialogSync({
            properties: ['openDirectory']
        });
        
        if (folderPath && folderPath.length > 0) {
            const selectedPath = folderPath[0];
            
            try {
                // 检查路径是否存在
                if (fs.existsSync(selectedPath)) {
                    const filesList = [];
                    fileSystemService.collectFilesRecursively(selectedPath, filesList);
                    
                    // 添加这个目录到库中
                    const library = libraryService.addLibrary(selectedPath, filesList);
                    renderLibraries();
                    loadLibraryContent(library);
                } else {
                    alert('选择的文件夹不存在');
                }
            } catch (error) {
                console.error('打开文件夹时出错:', error);
                alert(`打开文件夹时出错: ${error.message}`);
            }
        }
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            const isPlaying = videoPlayerService.togglePlayPause(videoPlayer);
            playPauseBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        } else if (e.code === 'Enter') {
            e.preventDefault();
            goToNextSubtitle();
        } else if (e.code === 'ArrowLeft') {
            videoPlayer.currentTime -= 5;
        } else if (e.code === 'ArrowRight') {
            videoPlayer.currentTime += 5;
        } else if (e.code === 'KeyL') {
            // 'L' 键切换循环
            toggleInfiniteLoop();
        }
    });

    // 视频结束
    videoPlayer.addEventListener('ended', () => {
        videoPlayerService.isPlaying = false;
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    });
}); 