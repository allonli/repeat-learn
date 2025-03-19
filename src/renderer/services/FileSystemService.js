const fs = require('fs');
const path = require('path');

// 递归收集文件夹中的所有视频文件
function collectFilesRecursively(folderPath, filesList) {
    try {
        const items = fs.readdirSync(folderPath);
        
        for (const item of items) {
            const itemPath = path.join(folderPath, item);
            const stats = fs.statSync(itemPath);
            
            if (stats.isDirectory()) {
                // 如果是文件夹，递归收集其中的文件
                collectFilesRecursively(itemPath, filesList);
            } else if (stats.isFile()) {
                // 如果是文件，检查是否是视频文件
                const ext = path.extname(item).toLowerCase();
                if (['.mp4', '.mkv', '.webm', '.avi', '.mov'].includes(ext)) {
                    // 创建一个类似File对象的结构
                    const fileObj = {
                        name: item,
                        path: itemPath,
                        size: stats.size,
                        lastModified: stats.mtimeMs,
                        // 添加计算相对路径的方法，用于替代webkitRelativePath
                        webkitRelativePath: itemPath.substring(folderPath.length + 1),
                        // 添加读取文件的方法
                        async text() {
                            return fs.readFileSync(itemPath, 'utf8');
                        }
                    };
                    filesList.push(fileObj);
                }
            }
        }
    } catch (error) {
        console.error(`收集文件时出错: ${error.message}`);
    }
}

// 获取路径的最后一部分（用于显示库名称）
function getLastPathSegment(path) {
    return path.split(/[\/\\]/).filter(Boolean).pop() || 'Unknown';
}

// 组织文件到文件夹结构
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
    
    const folders = {};
    
    // Group files by their directory
    videoFiles.forEach(file => {
        // 确保webkitRelativePath属性存在
        const filePath = (file.webkitRelativePath || '');
        const pathParts = filePath.split('/');
        
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

// 寻找与视频文件匹配的字幕
function findMatchingSubtitle(videoFile) {
    const videoFileName = videoFile.name.substring(0, videoFile.name.lastIndexOf('.'));
    
    // 获取视频文件所在的目录
    const videoDir = videoFile.path ? path.dirname(videoFile.path) : null;
    
    // 检查视频所在目录中是否有匹配的SRT文件
    if (videoDir) {
        try {
            const dirFiles = fs.readdirSync(videoDir);
            const matchingSrt = dirFiles.find(file => 
                file.toLowerCase() === (videoFileName.toLowerCase() + '.srt') || 
                file.toLowerCase() === (videoFileName.trim().toLowerCase() + '.srt'));
            
            if (matchingSrt) {
                console.log("Found matching subtitle:", matchingSrt);
                const srtPath = path.join(videoDir, matchingSrt);
                
                // 创建一个类似File对象的结构
                const srtFile = {
                    name: matchingSrt,
                    path: srtPath,
                    async text() {
                        return fs.readFileSync(srtPath, 'utf8');
                    }
                };
                
                return srtFile;
            }
        } catch (error) {
            console.error("Error searching for matching subtitle:", error);
        }
    }
    
    return null;
}

module.exports = {
    collectFilesRecursively,
    getLastPathSegment,
    organizeFilesIntoFolders,
    findMatchingSubtitle
}; 