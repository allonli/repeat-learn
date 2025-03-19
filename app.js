
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
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
    const selectFolderBtn = document.getElementById('select-folder-btn');
    const selectVideoBtn = document.getElementById('select-video-btn');
    const playlistContainer = document.getElementById('playlist');
    const progressFill = document.querySelector('.progress-fill');
    const progressBar = document.querySelector('.progress-bar');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    const librariesList = document.getElementById('libraries-list');
    const addLibraryBtn = document.getElementById('add-library-btn');

    // State variables
    let subtitles = [];
    let currentSubtitleIndex = -1;
    let subtitlesVisible = true;
    let repeatCount = 1;
    let currentRepeat = 0;
    let videoDirectory = null;
    let isPlaying = false;
    let infiniteLoopMode = false;
    let currentVideoFile = null;
    let libraries = [];
    let currentLibraryIndex = -1;
    let folders = {};

    // Initialize
    videoPlayer.controls = false; // Use our custom controls
    
    // Load libraries from localStorage if available
    loadLibraries();
    
    // Load the last active library if available
    const lastActiveLibrary = parseInt(localStorage.getItem('activeLibraryIndex') || '0');
    if (libraries.length > 0 && lastActiveLibrary >= 0 && lastActiveLibrary < libraries.length) {
        currentLibraryIndex = lastActiveLibrary;
        const library = libraries[currentLibraryIndex];
        loadLibraryContent(library);
    }

    // Load libraries from localStorage
    function loadLibraries() {
        const savedLibraries = localStorage.getItem('libraries');
        if (savedLibraries) {
            try {
                libraries = JSON.parse(savedLibraries);
                renderLibraries();
            } catch (e) {
                console.error('Error parsing saved libraries:', e);
                libraries = [];
                localStorage.removeItem('libraries');
            }
        }
    }

    // Render libraries in the sidebar
    function renderLibraries() {
        librariesList.innerHTML = '';
        
        libraries.forEach((library, index) => {
            const libraryItem = document.createElement('div');
            libraryItem.className = `library-item ${index === currentLibraryIndex ? 'active' : ''}`;
            libraryItem.dataset.index = index;
            
            const libraryName = document.createElement('div');
            libraryName.className = 'library-name';
            libraryName.textContent = library.name || getLastPathSegment(library.path);
            
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
                    currentLibraryIndex = index;
                    // Update active class
                    document.querySelectorAll('.library-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    libraryItem.classList.add('active');
                    loadLibraryContent(library);
                }
            });
            
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                libraries.splice(index, 1);
                renderLibraries();
                
                if (currentLibraryIndex === index) {
                    // If we removed the current library
                    if (libraries.length > 0) {
                        currentLibraryIndex = 0;
                        loadLibraryContent(libraries[0]);
                    } else {
                        currentLibraryIndex = -1;
                        playlistContainer.innerHTML = '';
                    }
                } else if (currentLibraryIndex > index) {
                    // Adjust current index if we removed a library before it
                    currentLibraryIndex--;
                }
            });
            
            librariesList.appendChild(libraryItem);
        });
    }

    // Load a library's content
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
            populatePlaylist(library.files);
        } catch (error) {
            console.error("Error loading library content:", error);
            if (playlistContainer) {
                playlistContainer.innerHTML = `<div class="empty-message">Error: ${error.message}</div>`;
            }
        }
    }

    // Get the last segment of a path (for library name display)
    function getLastPathSegment(path) {
        return path.split(/[\/\\]/).filter(Boolean).pop() || 'Unknown';
    }

    // Helper function to format time
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Function to handle single video selection
    const handleVideoSelection = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*,.mp4,.mkv,.webm';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                currentVideoFile = file;
                loadVideoFile(file);
                
                // Add to playlist
                playlistContainer.innerHTML = '';
                const item = document.createElement('div');
                item.className = 'playlist-item active';
                item.textContent = file.name;
                playlistContainer.appendChild(item);
                
                // Try to load subtitle with the same name
                tryLoadMatchingSubtitle(file);
            }
        };
        
        input.click();
    };

    // Try to load a subtitle file with the same name as the video
    const tryLoadMatchingSubtitle = (videoFile) => {
        const videoFileName = videoFile.name.substring(0, videoFile.name.lastIndexOf('.'));
        
        // For files loaded from a directory
        if (window.lastDirectoryFiles && window.lastDirectoryFiles.length > 0) {
            // Look for an SRT file with the same base name (case-insensitive)
            const matchingSrt = Array.from(window.lastDirectoryFiles).find(file => 
                file.name.toLowerCase() === (videoFileName.toLowerCase() + '.srt') || 
                file.name.toLowerCase() === (videoFileName.trim().toLowerCase() + '.srt'));
                
            if (matchingSrt) {
                console.log("Found matching subtitle:", matchingSrt.name);
                loadSubtitleFile(matchingSrt);
                return true;
            }
        }

        // If we didn't find a matching subtitle, show a message
        subtitleOriginal.textContent = "未找到字幕文件，请手动加载字幕";
        return false;
    };

    // Update repeat count based on preset dropdown
    const updateRepeatCountFromPreset = (value) => {
        const repeatControlElement = document.querySelector('.repeat-control');
        if (repeatControlElement) {
            repeatControlElement.classList.remove('custom');
        }
        
        if (value === "infinite") {
            infiniteLoopMode = true;
            loopSubtitleBtn.classList.add('active');
            if (repeatCountInput) {
                repeatCountInput.disabled = true;
                repeatCountInput.style.display = 'none';
            }
            
            // 如果当前有字幕正在播放，立即跳到当前字幕开头
            if (currentSubtitleIndex >= 0 && currentSubtitleIndex < subtitles.length) {
                const currentSubtitle = subtitles[currentSubtitleIndex];
                console.log(`选择无限循环：跳转到第${currentSubtitleIndex + 1}句开头`);
                videoPlayer.currentTime = currentSubtitle.startTime + 0.01; // 添加0.01s避免精度问题
            }
        } else if (value === "custom") {
            infiniteLoopMode = false;
            loopSubtitleBtn.classList.remove('active');
            if (repeatCountInput) {
                repeatCountInput.disabled = false;
                if (repeatControlElement) {
                    repeatControlElement.classList.add('custom');
                }
            }
        } else {
            infiniteLoopMode = false;
            loopSubtitleBtn.classList.remove('active');
            if (repeatCountInput) {
                repeatCountInput.disabled = false;
                repeatCount = parseInt(value);
                repeatCountInput.value = repeatCount;
            }
        }
        currentRepeat = 0;
    };

    // Event listeners for video selection buttons
    selectVideoBtn.addEventListener('click', handleVideoSelection);

    // Event listener for adding a new library
    addLibraryBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        
        input.onchange = (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                const path = files[0].webkitRelativePath.split('/')[0];
                
                // Add this directory to libraries
                const library = {
                    path: path,
                    name: getLastPathSegment(path),
                    files: Array.from(files)
                };
                
                libraries.push(library);
                currentLibraryIndex = libraries.length - 1;
                renderLibraries();
                loadLibraryContent(library);
            }
        };
        
        input.click();
    });

    // Toggle folder collapse/expand
    function toggleFolder(folderHeader) {
        folderHeader.classList.toggle('collapsed');
        const folderContent = folderHeader.nextElementSibling;
        folderContent.classList.toggle('collapsed');
    }

    // Update progress bar
    const updateProgress = () => {
        if (videoPlayer.duration) {
            const percent = (videoPlayer.currentTime / videoPlayer.duration) * 100;
            progressFill.style.width = `${percent}%`;
            currentTimeEl.textContent = formatTime(videoPlayer.currentTime);
            durationEl.textContent = formatTime(videoPlayer.duration);
        }
    };

    // Play/Pause toggle
    const togglePlayPause = () => {
        if (videoPlayer.paused || videoPlayer.ended) {
            videoPlayer.play();
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            isPlaying = true;
        } else {
            videoPlayer.pause();
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            isPlaying = false;
        }
    };

    // Parse SRT subtitles
    const parseSRT = (srtContent) => {
        const subtitles = [];
        const srtLines = srtContent.split('\n');
        let subtitle = {};
        let lineIndex = 0;

        while (lineIndex < srtLines.length) {
            const line = srtLines[lineIndex].trim();
            lineIndex++;

            // Skip empty lines
            if (!line) continue;
            
            // Parse index
            const index = parseInt(line);
            if (isNaN(index)) continue;
            
            // Parse timestamps
            if (lineIndex < srtLines.length) {
                const timestamps = srtLines[lineIndex].trim();
                lineIndex++;
                
                const match = timestamps.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
                if (match) {
                    const startTime = timeToSeconds(match[1]);
                    const endTime = timeToSeconds(match[2]);
                    
                    // Parse text
                    let text = '';
                    let translationStart = -1;
                    
                    // Collect text lines until an empty line
                    const textLines = [];
                    while (lineIndex < srtLines.length && srtLines[lineIndex].trim()) {
                        textLines.push(srtLines[lineIndex].trim());
                        lineIndex++;
                    }
                    
                    // Join lines with line breaks to preserve formatting
                    text = textLines.join('\n');
                    
                    // Check for translation (in bilingual subtitles)
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
    };

    // Convert time string to seconds
    const timeToSeconds = (timeString) => {
        const [time, ms] = timeString.split(',');
        const [hours, minutes, seconds] = time.split(':').map(Number);
        return hours * 3600 + minutes * 60 + seconds + parseInt(ms) / 1000;
    };

    // Display current subtitle
    const displaySubtitle = (index) => {
        if (index < 0 || index >= subtitles.length) {
            subtitleOriginal.textContent = '';
            subtitleTranslation.textContent = '';
            subtitleCounter.textContent = '0/0';
            return;
        }

        const subtitle = subtitles[index];
        
        // Preserve line breaks in the subtitle text
        subtitleOriginal.innerHTML = subtitle.text.replace(/\n/g, '<br>');
        subtitleTranslation.innerHTML = subtitle.translation ? subtitle.translation.replace(/\n/g, '<br>') : '';
        
        // Update subtitle counter
        subtitleCounter.textContent = `${index + 1}/${subtitles.length}`;
        
        // Update subtitle select dropdown
        subtitleSelect.value = index;
    };

    // Move to specific subtitle
    const goToSubtitle = (index) => {
        if (index < 0 || index >= subtitles.length) return;
        
        currentSubtitleIndex = index;
        const subtitle = subtitles[index];
        
        videoPlayer.currentTime = subtitle.startTime;
        displaySubtitle(index);
        
        // Reset repeat counter
        currentRepeat = 0;
        
        if (videoPlayer.paused && isPlaying) {
            videoPlayer.play();
        }
    };

    // Find subtitle at current time
    const findSubtitleAtTime = (time) => {
        for (let i = 0; i < subtitles.length; i++) {
            if (time >= subtitles[i].startTime && time <= subtitles[i].endTime) {
                return i;
            }
        }
        return -1;
    };

    // Toggle infinite loop mode
    const toggleInfiniteLoop = () => {
        infiniteLoopMode = !infiniteLoopMode;
        
        // 更新UI
        if (infiniteLoopMode) {
            loopSubtitleBtn.classList.add('active');
            repeatPresetSelect.value = "infinite";
            if (document.querySelector('.repeat-control')) {
                document.querySelector('.repeat-control').classList.remove('custom');
            }
            
            // 如果当前有字幕正在播放，立即跳到当前字幕开头
            if (currentSubtitleIndex >= 0 && currentSubtitleIndex < subtitles.length) {
                const currentSubtitle = subtitles[currentSubtitleIndex];
                console.log(`启用循环：跳转到第${currentSubtitleIndex + 1}句开头`);
                videoPlayer.currentTime = currentSubtitle.startTime + 0.01; // 添加0.01s避免精度问题
            }
        } else {
            loopSubtitleBtn.classList.remove('active');
            repeatPresetSelect.value = repeatCount.toString();
            // 检查当前重复次数是否有对应的预设
            const hasPreset = ["1", "3", "5", "10"].includes(repeatCount.toString());
            if (!hasPreset && document.querySelector('.repeat-control')) {
                repeatPresetSelect.value = "custom";
                document.querySelector('.repeat-control').classList.add('custom');
            }
        }
    };

    // Check and update subtitle during playback
    const checkSubtitle = () => {
        if (!videoPlayer || !subtitles || subtitles.length === 0) return;
        
        const currentTime = videoPlayer.currentTime;
        
        // 寻找当前时间对应的字幕
        const subtitleIndex = findSubtitleAtTime(currentTime);
        
        // 字幕发生变化时
        if (subtitleIndex !== -1 && subtitleIndex !== currentSubtitleIndex) {
            const prevIndex = currentSubtitleIndex;
            currentSubtitleIndex = subtitleIndex;
            displaySubtitle(subtitleIndex);
            currentRepeat = 0;
            
            console.log(`字幕变化：从第${prevIndex + 1}句到第${subtitleIndex + 1}句`);
        }
        
        // 如果没有找到当前字幕，什么也不做
        if (currentSubtitleIndex === -1) return;
        
        const currentSubtitle = subtitles[currentSubtitleIndex];
        const timeUntilEnd = currentSubtitle.endTime - currentTime;
        
        // 这个扩大的判断窗口用于避免播放器跳过字幕
        const isNearEnd = timeUntilEnd <= 0.1;
        
        if (isNearEnd) {
            // 无限循环模式
            if (infiniteLoopMode) {
                console.log(`无限循环：重播第${currentSubtitleIndex + 1}句`);
                videoPlayer.currentTime = currentSubtitle.startTime + 0.01; // 添加0.01s避免精度问题
                return;
            }
            
            // 有限重复模式
            if (currentRepeat < repeatCount - 1) {
                currentRepeat++;
                console.log(`有限重复：第${currentRepeat}/${repeatCount-1}次重复第${currentSubtitleIndex + 1}句`);
                videoPlayer.currentTime = currentSubtitle.startTime + 0.01; // 添加0.01s避免精度问题
                return;
            }
        }
    };

    // Load subtitle file
    const loadSubtitleFile = async (file) => {
        try {
            const content = await file.text();
            subtitles = parseSRT(content);
            
            // Populate subtitle select dropdown
            subtitleSelect.innerHTML = '<option value="">跳转到字幕...</option>';
            
            subtitles.forEach((subtitle, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${index + 1}: ${subtitle.text.substring(0, 30)}${subtitle.text.length > 30 ? '...' : ''}`;
                subtitleSelect.appendChild(option);
            });
            
            currentSubtitleIndex = -1;
            displaySubtitle(-1);
            
            subtitleBtn.style.opacity = '1';
            subtitlesVisible = true;
            
            // If video is already at a time, find and display the corresponding subtitle
            if (videoPlayer.currentTime > 0) {
                const subtitleIndex = findSubtitleAtTime(videoPlayer.currentTime);
                if (subtitleIndex !== -1) {
                    currentSubtitleIndex = subtitleIndex;
                    displaySubtitle(subtitleIndex);
                }
            }
        } catch (error) {
            console.error('Error loading subtitles:', error);
            alert('Error loading subtitle file. Please select a valid SRT file.');
        }
    };

    // Load video file
    const loadVideoFile = (file) => {
        const videoURL = URL.createObjectURL(file);
        videoPlayer.src = videoURL;
        videoPlayer.load();
        
        const filename = file.name;
        document.title = `Playing: ${filename}`;
        currentVideoFile = file;
        
        // Reset controls
        currentSubtitleIndex = -1;
        displaySubtitle(-1);
        currentRepeat = 0;
        
        // Auto play
        videoPlayer.onloadedmetadata = () => {
            updateProgress();
            togglePlayPause();
        };
    };

    // Organize files into folders by their directory structure
    function organizeFilesIntoFolders(files) {
        // 防御性检查 - 确保files存在并且是可迭代的
        if (!files || !Array.isArray(files) && !(files instanceof FileList)) {
            console.error("Invalid files parameter:", files);
            return {};
        }
        
        // 过滤视频文件
        const videoFiles = Array.from(files).filter(file => {
            // 防御性检查 - 确保file对象有效
            if (!file) return false;
            
            // 检查file.type是否可用
            if (typeof file.type === 'string' && file.type.startsWith('video/')) {
                return true;
            }
            
            // 检查file.name是否可用
            if (typeof file.name === 'string') {
                const lowerName = file.name.toLowerCase();
                return lowerName.endsWith('.mp4') || 
                       lowerName.endsWith('.mkv') || 
                       lowerName.endsWith('.webm');
            }
            
            return false;
        });
        
        // Reset folders object
        folders = {};
        
        // Group files by their directory
        videoFiles.forEach(file => {
            // 确保webkitRelativePath属性存在
            const path = (file.webkitRelativePath || '');
            const pathParts = path.split('/');
            
            // Skip the first part (root directory)
            if (pathParts.length <= 2) {
                // Files directly in the root directory
                if (!folders['_root_']) folders['_root_'] = [];
                folders['_root_'].push(file);
            } else {
                // Files in subdirectories
                const folderName = pathParts[1]; // First level subdirectory
                if (!folders[folderName]) folders[folderName] = [];
                folders[folderName].push(file);
            }
        });
        
        // Sort files in each folder by name
        Object.keys(folders).forEach(folderName => {
            folders[folderName].sort((a, b) => {
                // 防御性检查 - 确保name属性存在
                const nameA = a && a.name ? a.name : '';
                const nameB = b && b.name ? b.name : '';
                return nameA.localeCompare(nameB);
            });
        });
        
        return folders;
    }

    // Populate playlist
    function populatePlaylist(files) {
        if (!playlistContainer) return;
        playlistContainer.innerHTML = '';
        
        // 防御性检查 - 确保files存在
        if (!files) {
            console.error("No files to populate playlist");
            playlistContainer.innerHTML = '<div class="empty-message">No files available</div>';
            return;
        }
        
        // Store the directory files for later use with subtitle matching
        window.lastDirectoryFiles = files;
        
        try {
            // Organize files into folders
            const folders = organizeFilesIntoFolders(files);
            
            // 如果没有有效的文件夹和文件
            if (Object.keys(folders).length === 0) {
                playlistContainer.innerHTML = '<div class="empty-message">No video files found</div>';
                return;
            }
            
            // Render folders and files
            Object.keys(folders).sort().forEach(folderName => {
                if (folderName === '_root_') {
                    // Render root files directly in the playlist
                    folders[folderName].forEach(file => {
                        createPlaylistItem(file, playlistContainer);
                    });
                } else {
                    // Create a folder with its files
                    const folderElement = document.createElement('div');
                    folderElement.className = 'playlist-folder';
                    
                    const folderHeader = document.createElement('div');
                    folderHeader.className = 'folder-header';
                    folderHeader.innerHTML = `<i class="fas fa-chevron-down"></i> ${folderName}`;
                    
                    const folderContent = document.createElement('div');
                    folderContent.className = 'folder-content';
                    
                    // Add click event to toggle folder content
                    folderHeader.addEventListener('click', () => {
                        toggleFolder(folderHeader);
                    });
                    
                    // Add files to the folder
                    folders[folderName].forEach(file => {
                        createPlaylistItem(file, folderContent);
                    });
                    
                    folderElement.appendChild(folderHeader);
                    folderElement.appendChild(folderContent);
                    playlistContainer.appendChild(folderElement);
                }
            });
        } catch (error) {
            console.error("Error populating playlist:", error);
            playlistContainer.innerHTML = `<div class="empty-message">Error loading files: ${error.message}</div>`;
        }
    }

    // Create a playlist item for a file
    function createPlaylistItem(file, container) {
        const item = document.createElement('div');
        item.className = 'playlist-item';
        item.textContent = file.name;
        
        // Store the full file path in a data attribute
        if (file.webkitRelativePath) {
            item.dataset.filePath = file.webkitRelativePath;
        }
        
        item.addEventListener('click', () => {
            loadVideoFile(file);
            
            // Mark as active
            document.querySelectorAll('.playlist-item').forEach(el => {
                el.classList.remove('active');
            });
            item.classList.add('active');
            
            // Try to load matching subtitle
            tryLoadMatchingSubtitle(file);
        });
        
        container.appendChild(item);
    }

    // Event Listeners
    
    // Video time update
    videoPlayer.addEventListener('timeupdate', () => {
        updateProgress();
        
        if (subtitlesVisible && subtitles.length > 0) {
            checkSubtitle();
        }
    });

    // Progress bar click
    progressBar.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        videoPlayer.currentTime = pos * videoPlayer.duration;
    });

    // Play/Pause button
    playPauseBtn.addEventListener('click', togglePlayPause);

    // Video click for play/pause
    videoPlayer.addEventListener('click', togglePlayPause);

    // Playback rate change
    playbackRateSelect.addEventListener('change', () => {
        videoPlayer.playbackRate = parseFloat(playbackRateSelect.value);
    });

    // Repeat count change
    repeatCountInput.addEventListener('change', () => {
        repeatCount = parseInt(repeatCountInput.value);
        currentRepeat = 0;
        // Update preset dropdown to match
        if (repeatCount === 3) repeatPresetSelect.value = "3";
        else if (repeatCount === 5) repeatPresetSelect.value = "5";
        else if (repeatCount === 10) repeatPresetSelect.value = "10";
        else repeatPresetSelect.value = "custom";
    });

    // Repeat preset change
    if (repeatPresetSelect) {
        repeatPresetSelect.addEventListener('change', () => {
            updateRepeatCountFromPreset(repeatPresetSelect.value);
        });
    }

    // Toggle subtitles
    subtitleBtn.addEventListener('click', () => {
        subtitlesVisible = !subtitlesVisible;
        subtitleBtn.style.opacity = subtitlesVisible ? '1' : '0.5';
        
        if (!subtitlesVisible) {
            subtitleOriginal.textContent = '';
            subtitleTranslation.textContent = '';
            subtitleCounter.textContent = '0/0';
        } else if (currentSubtitleIndex !== -1) {
            displaySubtitle(currentSubtitleIndex);
        }
    });

    // Toggle infinite loop
    loopSubtitleBtn.addEventListener('click', toggleInfiniteLoop);

    // Previous subtitle
    prevSubtitleBtn.addEventListener('click', () => {
        goToSubtitle(currentSubtitleIndex - 1);
    });

    // Next subtitle
    nextSubtitleBtn.addEventListener('click', () => {
        goToSubtitle(currentSubtitleIndex + 1);
    });

    // Subtitle select change
    subtitleSelect.addEventListener('change', () => {
        if (subtitleSelect.value) {
            goToSubtitle(parseInt(subtitleSelect.value));
        }
    });

    // Select subtitle file
    selectSubtitleBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.srt';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                loadSubtitleFile(file);
            }
        };
        
        input.click();
    });

    // // Select video folder
    // selectFolderBtn.addEventListener('click', () => {
    //     const input = document.createElement('input');
    //     input.type = 'file';
    //     input.webkitdirectory = true;
        
    //     input.onchange = (e) => {
    //         const files = e.target.files;
    //         if (files.length > 0) {
    //             const path = files[0].webkitRelativePath.split('/')[0];
                
    //             // Add this directory to libraries
    //             const library = {
    //                 path: path,
    //                 name: getLastPathSegment(path),
    //                 files: Array.from(files)
    //             };
                
    //             libraries.push(library);
    //             currentLibraryIndex = libraries.length - 1;
    //             renderLibraries();
    //             loadLibraryContent(library);
    //         }
    //     };
        
    //     input.click();
    // });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            togglePlayPause();
        } else if (e.code === 'Enter') {
            e.preventDefault();
            goToSubtitle(currentSubtitleIndex + 1);
        } else if (e.code === 'ArrowLeft') {
            videoPlayer.currentTime -= 5;
        } else if (e.code === 'ArrowRight') {
            videoPlayer.currentTime += 5;
        } else if (e.code === 'KeyL') {
            // 'L' key for loop toggle
            toggleInfiniteLoop();
        }
    });

    // Video ended
    videoPlayer.addEventListener('ended', () => {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        isPlaying = false;
    });

    // 修复下一句按钮功能
    function goToNextSubtitle() {
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

    // 确保按钮事件监听正确
    const nextSubtitleButton = document.getElementById('next-subtitle-btn');
    if (nextSubtitleButton) {
        nextSubtitleButton.addEventListener('click', goToNextSubtitle);
    }
}); 