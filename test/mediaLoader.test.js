const fs = require('fs');
const path = require('path');
const mediaLoaderService = require('../src/renderer/services/MediaLoaderService');

// 测试目录路径
const TEST_DIR = process.argv[2] || '/Users/allonli/Downloads/v';

/**
 * 运行媒体加载器测试
 */
async function runMediaLoaderTest() {
  console.log('=== 媒体加载服务测试 ===');
  console.log(`目标目录: ${TEST_DIR}`);
  
  try {
    // 检查目录是否存在
    if (!fs.existsSync(TEST_DIR)) {
      console.error(`错误: 目录不存在 - ${TEST_DIR}`);
      process.exit(1);
    }
    
    // 询问是否自动清理文件名
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('是否在加载媒体文件时自动清理文件名？(y/n) ', async (answer) => {
      const autoclean = answer.toLowerCase() === 'y';
      
      console.log(`\n开始加载媒体文件${autoclean ? '并清理文件名' : ''}...`);
      const startTime = Date.now();
      
      // 加载媒体文件
      const mediaFiles = await mediaLoaderService.loadMediaDirectory(TEST_DIR, autoclean);
      
      const endTime = Date.now();
      console.log(`完成! 耗时: ${(endTime - startTime) / 1000} 秒`);
      
      // 显示加载结果
      console.log(`\n加载结果:`);
      console.log(`- 媒体文件: ${mediaFiles.length} 个`);
      
      const recentlyRenamed = mediaLoaderService.getRecentlyRenamed();
      console.log(`- 重命名文件: ${recentlyRenamed.length} 个`);
      
      const errors = mediaLoaderService.getErrors();
      console.log(`- 错误: ${errors.length} 个`);
      
      // 显示媒体文件列表
      if (mediaFiles.length > 0) {
        console.log('\n媒体文件列表:');
        mediaFiles.forEach((file, index) => {
          console.log(`${index + 1}. ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        });
      }
      
      // 显示重命名的文件
      if (recentlyRenamed.length > 0) {
        console.log('\n重命名的文件:');
        recentlyRenamed.forEach((item, index) => {
          console.log(`${index + 1}. "${item.original}" -> "${item.cleaned}"`);
        });
      }
      
      // 显示错误
      if (errors.length > 0) {
        console.log('\n错误:');
        errors.forEach((error, index) => {
          console.log(`${index + 1}. ${error}`);
        });
      }
      
      // 显示播放建议
      if (mediaFiles.length > 0) {
        const randomIndex = Math.floor(Math.random() * mediaFiles.length);
        const randomFile = mediaFiles[randomIndex];
        
        console.log('\n推荐播放:');
        console.log(`- 文件: ${randomFile.name}`);
        console.log(`- 路径: ${randomFile.path}`);
        console.log(`- 大小: ${(randomFile.size / 1024 / 1024).toFixed(2)} MB`);
      }
      
      readline.close();
      console.log('\n测试完成!');
    });
    
  } catch (error) {
    console.error(`测试过程中出现错误: ${error.message}`);
    console.error(error.stack);
  }
}

// 运行测试
runMediaLoaderTest(); 