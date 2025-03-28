const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 确保dist目录存在
console.log('正在构建项目...');
execSync('npm run build', { stdio: 'inherit' });

// 创建必要的配置文件
console.log('正在创建必要的配置文件...');
const projectConfigPath = path.join(__dirname, 'dist', 'project.config.json');
const projectConfig = {
  "appid": "cli_a76fb3ef2472100c",
  "projectname": "monthly-preparation-fee-summary",
  "setting": {
    "urlCheck": true,
    "es6": true,
    "postcss": true,
    "minified": true,
    "newFeature": true,
    "autoAudits": false,
    "checkInvalidKey": true,
    "checkSiteMap": true,
    "uploadWithSourceMap": true,
    "babelSetting": {
      "ignore": [],
      "disablePlugins": [],
      "outputPath": ""
    }
  },
  "compileType": "miniprogram",
  "libVersion": "2.6.1",
  "packOptions": {
    "ignore": [],
    "include": []
  },
  "condition": {
    "search": {
      "current": -1,
      "list": []
    },
    "conversation": {
      "current": -1,
      "list": []
    },
    "plugin": {
      "current": -1,
      "list": []
    },
    "game": {
      "list": []
    },
    "miniprogram": {
      "current": 0,
      "list": [
        {
          "id": -1,
          "name": "首页",
          "pathName": "pages/index/index",
          "query": ""
        }
      ]
    }
  }
};

fs.writeFileSync(projectConfigPath, JSON.stringify(projectConfig, null, 2));
console.log(`已创建配置文件: ${projectConfigPath}`);

// 复制app.json和base.config.json到dist目录
const appJsonPath = path.join(__dirname, '..', 'app.json');
const baseConfigPath = path.join(__dirname, '..', 'base.config.json');
const distAppJsonPath = path.join(__dirname, 'dist', 'app.json');
const distBaseConfigPath = path.join(__dirname, 'dist', 'base.config.json');

if (fs.existsSync(appJsonPath)) {
  fs.copyFileSync(appJsonPath, distAppJsonPath);
  console.log(`已复制: ${appJsonPath} -> ${distAppJsonPath}`);
}

if (fs.existsSync(baseConfigPath)) {
  fs.copyFileSync(baseConfigPath, distBaseConfigPath);
  console.log(`已复制: ${baseConfigPath} -> ${distBaseConfigPath}`);
}

// 创建zip文件
console.log('正在创建zip文件...');
try {
  // 检查dist目录是否存在
  const distPath = path.join(__dirname, 'dist');
  if (!fs.existsSync(distPath)) {
    console.error('dist目录不存在，请先构建项目');
    process.exit(1);
  }

  // 使用archiver模块创建zip文件
  const archiver = require('archiver');
  const output = fs.createWriteStream(path.join(__dirname, 'dist.zip'));
  const archive = archiver('zip', {
    zlib: { level: 9 } // 最高压缩级别
  });

  output.on('close', function() {
    console.log(`创建zip文件成功: ${path.join(__dirname, 'dist.zip')}`);
    console.log(`总大小: ${archive.pointer()} 字节`);
    
    console.log('\n请手动上传扩展:');
    console.log('1. 登录飞书开放平台 https://open.feishu.cn/');
    console.log('2. 前往"开发者后台" > "应用管理" > 选择您的应用');
    console.log('3. 导航到"多维表格" > "版本管理"');
    console.log('4. 点击"创建版本"，上传生成的zip文件 (dist.zip)');
    console.log('5. 填写版本信息后提交审核');
  });

  archive.on('error', function(err) {
    throw err;
  });

  archive.pipe(output);
  archive.directory(distPath, false);
  archive.finalize();
  
} catch (error) {
  console.error('创建zip文件时出错：', error.message);
  console.log('\n可能是因为未安装archiver模块，请运行:');
  console.log('npm install -D archiver');
  console.log('然后重新运行: npm run upload');
  
  process.exit(1);
}