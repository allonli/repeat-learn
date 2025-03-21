const fs = require('fs');
const path = require('path');
const translationService = require('../src/renderer/services/TranslationService');

// 加载dotenv以读取环境变量
require('dotenv').config();

// 定义字幕文件路径
const SUBTITLE_PATH = '/Users/allonli/Downloads/vs/Alex Thompson.srt';
const OUTPUT_PATH = '/Users/allonli/Downloads/vs/Alex_translated.srt';

/**
 * 读取SRT文件并解析字幕
 * @param {string} filePath SRT文件路径
 * @returns {Promise<Array<object>>} 解析后的字幕数组
 */
async function readSubtitles(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return reject(new Error(`读取字幕文件失败: ${err.message}`));
            }
            
            try {
                // 按空行分割字幕块
                const subtitleBlocks = data.split(/\r?\n\r?\n/).filter(block => block.trim());
                const parsedSubtitles = [];
                
                for (const block of subtitleBlocks) {
                    const lines = block.split(/\r?\n/);
                    
                    // 检查是否有足够的行数（至少序号、时间戳和文本）
                    if (lines.length >= 3) {
                        // 提取时间戳
                        const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
                        
                        if (timeMatch) {
                            const startTime = parseTimeStamp(timeMatch[1]);
                            const endTime = parseTimeStamp(timeMatch[2]);
                            
                            // 合并剩余行作为文本
                            const text = lines.slice(2).join('\n');
                            
                            parsedSubtitles.push({
                                index: parseInt(lines[0], 10),
                                startTime,
                                endTime,
                                text
                            });
                        }
                    }
                }
                
                resolve(parsedSubtitles);
            } catch (error) {
                reject(new Error(`解析字幕文件失败: ${error.message}`));
            }
        });
    });
}

/**
 * 解析SRT时间戳为秒数
 * @param {string} timestamp SRT时间戳 (hh:mm:ss,ms)
 * @returns {number} 秒数
 */
function parseTimeStamp(timestamp) {
    const parts = timestamp.split(/[:,]/);
    
    if (parts.length === 4) {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const seconds = parseInt(parts[2], 10);
        const milliseconds = parseInt(parts[3], 10);
        
        return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
    }
    
    return 0;
}

/**
 * 运行字幕翻译测试
 */
async function runTranslationTest() {
    console.log('=== 字幕翻译测试 ===');
    console.log(`源文件: ${SUBTITLE_PATH}`);
    console.log(`输出文件: ${OUTPUT_PATH}`);
    
    try {
        // 检查环境变量是否设置
        if (!process.env.TX_SECRET_ID || !process.env.TX_SECRET_KEY) {
            throw new Error('缺少必要的环境变量: TX_SECRET_ID 或 TX_SECRET_KEY');
        }
        
        // 提取环境变量，确保在测试过程中可用
        const secretId = process.env.TX_SECRET_ID;
        const secretKey = process.env.TX_SECRET_KEY;
        // 使用环境变量中的区域或默认值
        const region = 'ap-shanghai';
        
        console.log('验证腾讯云API凭证...');
        console.log(`TX_SECRET_ID: ${secretId.substring(0, 8)}...`);
        console.log('TX_SECRET_KEY: [已设置]');
        console.log(`TX_API_REGION: ${region}`);
        
        // 检查源文件是否存在
        if (!fs.existsSync(SUBTITLE_PATH)) {
            throw new Error(`字幕文件不存在: ${SUBTITLE_PATH}`);
        }
        
        // 读取并解析字幕文件
        console.log('读取并解析字幕文件...');
        const subtitles = await readSubtitles(SUBTITLE_PATH);
        console.log(`成功解析${subtitles.length}条字幕`);
        
        // 分析字幕内容
        const sampleSubtitles = subtitles.slice(0, 5);
        console.log('前5条字幕内容示例:');
        sampleSubtitles.forEach((sub, i) => {
            console.log(`[${i+1}] ${sub.text.substring(0, 50)}${sub.text.length > 50 ? '...' : ''}`);
        });
        
        // 检查是否需要翻译
        const needsTranslation = translationService.needsTranslation(subtitles);
        console.log(`是否需要翻译: ${needsTranslation ? '是' : '否'}`);
        
        if (needsTranslation) {
            console.log('开始翻译字幕...');
            const startTime = Date.now();
            
            // 创建凭证对象，直接从环境变量传递
            const credentials = {
                secretId,
                secretKey,
                region  // 添加区域参数
            };
            
            // 翻译字幕，传递凭证
            const translatedContent = await translationService.translateSubtitles(
                subtitles, 
                OUTPUT_PATH,
                credentials
            );
            
            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000;
            
            console.log(`翻译完成! 耗时: ${duration.toFixed(2)}秒`);
            console.log(`翻译后的内容已保存至: ${OUTPUT_PATH}`);
            
            // 显示翻译结果样本
            if (fs.existsSync(OUTPUT_PATH)) {
                const sampleContent = fs.readFileSync(OUTPUT_PATH, 'utf8').split('\n\n').slice(0, 3).join('\n\n');
                console.log('\n翻译结果样本:');
                console.log('----------------------------');
                console.log(sampleContent);
                console.log('----------------------------');
            }
        } else {
            console.log('字幕不需要翻译，跳过翻译步骤');
        }
        
        console.log('测试完成!');
    } catch (error) {
        console.error('测试失败:', error.message);
        console.error(error.stack);
    }
}

// 运行测试
if (require.main === module) {
    runTranslationTest().then(() => {
        console.log('测试脚本执行完毕');
    }).catch(err => {
        console.error('测试脚本执行出错:', err);
        process.exit(1);
    });
}

module.exports = {
    readSubtitles,
    parseTimeStamp,
    runTranslationTest
}; 