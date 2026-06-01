// 构建后自动同步静态资源到 dist 目录
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src/static');
const buildDir = path.join(root, 'dist/build/mp-weixin');
const devDir = path.join(root, 'dist/dev/mp-weixin');
const outDir = process.env.UNI_OUTPUT_DIR || (fs.existsSync(buildDir) ? buildDir : devDir);
const dst = path.join(outDir, 'static');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name);
    const dstPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

if (fs.existsSync(src)) {
  try {
    copyDir(src, dst);
    console.log('[postbuild] static files synced to ' + dst);
  } catch (error) {
    console.error('[postbuild] failed to sync static files:', error);
    process.exit(1);
  }
}
