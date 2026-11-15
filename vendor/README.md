# 第三方代码

- `three.min.js`:three.js r159(MIT 许可,见 `three.LICENSE`),取自 npm 包 `three@0.159.0` 的 `build/three.min.js`。
  只把文件开头那句「该构建方式将被弃用」的 `console.warn(...),` 换成了一个 `!`,其余未改。
  用这个版本是因为它是最后一个提供非模块构建的版本,双击 `index.html` 也能加载。只有 3D 战斗用到它。
