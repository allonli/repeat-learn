const fs = require('fs');
const path = require('path');
const FileCleanupService = require('./FileCleanupService');

/**
 * 目录加载服务
 * 负责加载目录内容，并在需要时自动清理文件名
 */
class DirectoryLoader {
  /**
   * 加载目录内容，并自动清理文件名
   * @param {string} directoryPath 目录路径
   * @param {boolean} autoclean 是否自动清理文件名
   * @returns {Promise<{files: Array, cleaned: Array, errors: Array}>} 加载结果
   */
  static async loadDirectory(directoryPath, autoclean = true) {
    try {
      // 验证目录是否存在
      if (!fs.existsSync(directoryPath)) {
        return {
          files: [],
          cleaned: [],
          errors: [`目录不存在: ${directoryPath}`]
        };
      }

      // 读取目录内容
      const files = await this.readDirectoryFiles(directoryPath);
      
      // 如果不需要自动清理，则直接返回文件列表
      if (!autoclean) {
        return {
          files,
          cleaned: [],
          errors: []
        };
      }

      // 检查并清理文件名
      const result = await FileCleanupService.cleanupDirectory(directoryPath);
      
      // 如果重命名了文件，重新读取目录内容
      let updatedFiles = files;
      if (result.renamed.length > 0) {
        updatedFiles = await this.readDirectoryFiles(directoryPath);
      }

      return {
        files: updatedFiles,
        cleaned: result.renamed,
        errors: result.errors
      };
    } catch (error) {
      return {
        files: [],
        cleaned: [],
        errors: [`加载目录失败: ${error.message}`]
      };
    }
  }

  /**
   * 读取目录中的文件
   * @param {string} directoryPath 目录路径
   * @returns {Promise<Array>} 文件列表
   */
  static readDirectoryFiles(directoryPath) {
    return new Promise((resolve, reject) => {
      fs.readdir(directoryPath, async (err, fileNames) => {
        if (err) {
          return reject(err);
        }

        try {
          const files = await Promise.all(
            fileNames.map(async (fileName) => {
              const filePath = path.join(directoryPath, fileName);
              const stats = await fs.promises.stat(filePath);
              
              return {
                name: fileName,
                path: filePath,
                isDirectory: stats.isDirectory(),
                isFile: stats.isFile(),
                size: stats.size,
                modified: stats.mtime
              };
            })
          );

          resolve(files);
        } catch (error) {
          reject(error);
        }
      });
    });
  }
}

module.exports = DirectoryLoader; 