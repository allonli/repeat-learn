const path = require('path');
const fileSystemService = require(path.join(__dirname, 'FileSystemService'));

// 播放列表服务
class PlaylistService {
    constructor() {
        this.folders = {};
    }

    // 生成播放列表内容
    populatePlaylist(files, container, onItemClick) {
        if (!container) {
            console.error('Playlist container is null or undefined');
            return;
        }
        
        container.innerHTML = '';
        
        // 排除非视频文件
        const videoFiles = files.filter(file => this.isVideoFile(file.name));
        
        if (videoFiles.length === 0) {
            container.innerHTML = '<div class="empty-message">No video files found</div>';
            return;
        }
        
        // 创建播放列表项
        videoFiles.forEach(file => {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.dataset.path = file.path;
            item.dataset.name = file.name;
            
            // 设置文件名并确保单行显示，超出部分用省略号
            item.textContent = file.name;
            item.style.whiteSpace = 'nowrap';
            item.style.overflow = 'hidden';
            item.style.textOverflow = 'ellipsis';
            
            item.addEventListener('click', () => {
                this.updateActiveItem(item);
                
                if (typeof onItemClick === 'function') {
                    onItemClick(file, item);
                }
            });
            
            container.appendChild(item);
        });
    }

    // 创建播放列表项目
    createPlaylistItem(file, container, onItemClick) {
        const item = document.createElement('div');
        item.className = 'playlist-item';
        item.textContent = file.name;
        
        // 在数据属性中存储完整的文件路径
        if (file.webkitRelativePath) {
            item.dataset.filePath = file.webkitRelativePath;
        }
        
        if (typeof onItemClick === 'function') {
            item.addEventListener('click', () => {
                onItemClick(file, item);
            });
        }
        
        container.appendChild(item);
        return item;
    }

    // 切换文件夹展开/折叠
    toggleFolder(folderHeader) {
        folderHeader.classList.toggle('collapsed');
        const folderContent = folderHeader.nextElementSibling;
        folderContent.classList.toggle('collapsed');
    }

    // 获取文件夹
    getFolders() {
        return this.folders;
    }

    // 更新播放列表项目激活状态
    updateActiveItem(item) {
        document.querySelectorAll('.playlist-item').forEach(el => {
            el.classList.remove('active');
        });
        
        if (item) {
            item.classList.add('active');
        }
    }

    // 判断是否为视频文件
    isVideoFile(fileName) {
        const videoExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.mpeg', '.mpg'];
        const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
        return videoExtensions.includes(extension);
    }
}

module.exports = new PlaylistService(); 