// 构建后自动同步静态资源到 dist 目录
const fs = require('fs');
const path = require('path');

const src = 'src/static';
const outDir = process.env.UNI_OUTPUT_DIR || 'dist/dev/mp-weixin';
const dst = path.join(outDir, 'static');

if (fs.existsSync(src)) {
  fs.cpSync(src, dst, { recursive: true });
  console.log('[postbuild] static files synced to ' + dst);
}
