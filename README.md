# 星恬的小站 · startian.top

🌐 **在线访问 → https://startian.top/**

> 一个纯前端的个人作品小站：16 个打开即玩的小作品，从「会学习的五子棋 AI」到「数学几何工作台」再到「万物沙盒」，全部单文件、零依赖、（几乎）数据不出本机。

## 站内有什么

| 作品 | 在线地址 | 一句话 |
| --- | --- | --- |
| ♟ 五子棋 · 学习反制版 | [wuziqi.startian.top](https://wuziqi.startian.top/) | 会针对你学习并反制的 AI 对手，内嵌 Rapfi 引擎 + 灵拙神经网络 |
| 📐 几何工坊 | [geometry.startian.top](https://geometry.startian.top/) | 高中数学几何教学工作台：表达式引擎 / 几何构建 / AI 出图 |
| 🏖 万物沙盒 | [startian.top/sandbox/](https://startian.top/sandbox/) | 22 种元素互相反应的像素沙盘 + 隐藏的第一人称 3D 世界 |
| 🗓 打卡日程表 | [daka.startian.top](https://daka.startian.top/) | 轻量习惯打卡：连续天数 / 月度日历 / 成就 |
| 🐱 心情日历 | [startian.top/mood/](https://startian.top/mood/) | 43 张猫耳表情 × 天气 × 日记，翻一翻就是这个月的样子 |
| 📕 错题本 | [startian.top/cuoti/](https://startian.top/cuoti/) | 间隔重复复习：让记忆曲线帮你安排什么时候复习 |
| ✨ 无限星空 | [startian.top/star/](https://startian.top/star/) | 种子生成的无限星空，往任何方向拖都有新的星 |
| 🗺 宇宙地图 | [startian.top/map/](https://startian.top/map/) | 全站导航：作品星在宇宙里自由漂移，去过就亮 |
| 🌱 生命游戏 | [startian.top/life/](https://startian.top/life/) | 康威生命游戏花园：存「物种」、看两个物种对撞 |
| 🎵 函数音乐 | [startian.top/music/](https://startian.top/music/) | 把函数画成声波：不同函数不同音色，图形跟着跳 |
| 📈 函数拟合器 | [startian.top/fit/](https://startian.top/fit/) | 丢一堆散点进去，自动找出最像的函数 |
| 🩺 今日份诊断 | [startian.top/report/](https://startian.top/report/) | 每次刷新生成一张（仅供开心的）状态体检单 |
| 🎨 配色实验室 | [startian.top/colorlab/](https://startian.top/colorlab/) | 选两色实时预览整套 UI，一键导出 CSS 变量 |
| ⏳ 假加载页 | [startian.top/fake/](https://startian.top/fake/) | 一个非常正经的加载页面。真的。 |
| ⬡ 六边形维度 | [tujie.startian.top](https://tujie.startian.top/) | 无上限展开的六边形展示器，转一转挺上头 |
| 😏 整活 · 隐私协议 | [zhenghuo.startian.top](https://zhenghuo.startian.top/) | 认真读完，再点「同意并继续」 |

> 另外还有**两个隐藏站点**（地址需要自己找）——去主页连点头像试试看。

## 站点特色

- **🎨 主题系统**：7 套主题（蓝白 / 暗红 / 梦幻紫 / 清新绿 / 温馨粉 / 缤纷彩 / 自定义）+ 隐藏「星夜」（背景是动态无限星空）；一键随机灵感、自定义切换时刻，主题切换带「光晕扩散 / 碎块剥落」转场动画
- **🏆 跨站成就柜**：cookie（`.startian.top`）跨站共享，34 枚成就；每个作品的成就互相桥接，到访足迹点亮
- **🌐 全站多语言**：中文 / English，右下角胶囊一键切换，跨站同步（cookie + localStorage），日期数字格式跟随
- **📮 留言箱**：联系区的反馈卡由 FormSubmit 直转邮箱，欢迎来聊
- **♿ 细节**：响应式适配手机、尊重 `prefers-reduced-motion`、键盘可达

## 技术说明

- **纯静态**：GitHub Pages 托管 + Cloudflare CDN（免费套餐拉满：全站加密、缓存规则、全球加速）
- **单文件应用哲学**：每个作品都是自包含的 HTML（打开即玩、离线可用、双击就能跑），部分大项目由 `src/` 分片 + `build.py` 构建
- **零运行时依赖**：所有作品不依赖任何前端框架，渲染管线 / 表达式引擎 / AI 接入均为自研或直连官方 API
- **数据本地化**：存档全部在浏览器 localStorage，不上传、无需登录；导出 / 导入 JSON 备份
- **本仓库结构**：根目录为主站页面，各子目录为子作品（如 `mood/`、`sandbox/`、`cuoti/`）

## 仓库地图

| 仓库 | 对应作品 |
| --- | --- |
| **Estheria-star.github.io**（本仓库） | 主站 + 全部子作品（mood / star / life / fit / report / map / cuoti / colorlab / fake / sandbox）|
| [gomoku](https://github.com/Estheria-star/gomoku) | 五子棋 · 学习反制版 |
| [geometry](https://github.com/Estheria-star/geometry) | 几何工坊 |
| [daka](https://github.com/Estheria-star/daka) | 打卡日程表 |
| [tujie](https://github.com/Estheria-star/tujie) | 六边形维度展示器 |
| [zhenghuo](https://github.com/Estheria-star/zhenghuo) | 整活 · 隐私协议 |

## 致谢与许可

- 本仓库代码以 **MIT** 许可开源，欢迎借鉴交流（见 [LICENSE](LICENSE)）
- 各子作品若有第三方组件，已在其目录的 README 中单独注明（如五子棋内嵌 Rapfi 引擎为 GPL-3）
- 个人学习娱乐项目，不作商业用途；头像与表情贴纸版权归原作者所有
