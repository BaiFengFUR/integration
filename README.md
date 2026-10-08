# 校园信息中心（迷你版）

## 项目简介

软件开发综合实践 · 课堂作业八自主实践：整合练习成果，作为期末大作业的原型。

把课堂作业五的交互筛选、作业六的数据看板、作业七的三维场景整合进一个统一入口，四个模块共用同一主题（校园公共信息）。

## 功能模块

| 模块 | 内容 | 技术来源 |
|---|---|---|
| 首页概览 | 自习室总数 / 当前开放 / 总座位数 / 空余座位 四张卡片，JS 实时计算 | 课堂五数据驱动渲染 |
| 自习室查询 | 12 间自习室列表，支持楼层、开放状态、名称关键字三重筛选 | 课堂五事件驱动筛选模式 |
| CRUD 管理 | 添加（表单提交）/ 修改（点编辑按钮填充表单再提交覆盖）/ 删除（confirm 确认）三种操作，localStorage 持久化，刷新不丢 | 课堂五存储模式 + 状态驱动 |
| 使用统计 | 两类图表：空余座位柱状图（bar）+ 使用率折线图（line），均由 STUDYROOMS 数组驱动渲染 | 课堂六 ECharts 骨架 |
| 校园三维 | A-Frame 校园场景（教学楼、红旗、路灯），左上角可返回首页 | 课堂七 A-Frame |

模块衔接：点击列表中的自习室名称，两张图表对应柱/点同步高亮为橙色（再点一次取消），列表筛选不影响高亮对位；CRUD 操作后立即 save → renderAll 三件套，列表、卡片、图表同步刷新。

## 数据存储说明

数据从 localStorage 读取（键 `studyrooms`），首次访问或清空存储时回落到 `js/app.js` 顶部的 `DEFAULT_STUDYROOMS` 默认数组并立即写入。CRUD 改 STUDYROOMS → save() → renderAll() 三件套，刷新后数据保留。开发者工具 Application → Local Storage 可见原始 JSON 字符串。

## 运行方法（推荐通过本地服务器）

**推荐：VS Code 安装 Live Server 插件，右键 `index.html` → Open with Live Server。**

也可在项目根目录执行：

```bash
python -m http.server 9090
```

然后浏览器访问 `http://localhost:9090`。

进入三维页后场景初始化约需 1~2 秒。

说明：本作品数据来自 localStorage（不再依赖 fetch），file:// 协议下大部分功能可用，但部分浏览器对 file:// 的 localStorage 有限制，建议走 http:// 协议以确保稳定。

## 质量自查

- 空数据：清空 localStorage 后再清空 `DEFAULT_STUDYROOMS` 数组，列表显示"没有符合条件的自习室"，图表显示空；
- CRUD 容错：表单楼层填 0 或 11、座位数填 600、已占用大于座位数，均被校验拦截并给出 #r-tip 提示；
- 三档宽度：375 / 768 / 1200px 下无横向滚动；
- Console 无红色报错；
- 使用率为 0% 的点（维修/闭馆房间）属于真实数据，非缺失；
- localStorage 被手动改成非法 JSON 时：浏览器抛错，可通过后续 try/catch 兜底（待加）。

## 目录说明

```
integration/
├── index.html          # 统一入口与导航
├── css/style.css       # 自定义样式（在 Bootstrap 之后引入以保证覆盖）
├── js/app.js           # 默认数据、CRUD、三重筛选、双图表渲染、点击联动高亮
├── data/data.json      # 历史数据文件（CRUD 后未使用，保留作参考）
├── three-d/scene.html  # A-Frame 校园三维场景
└── libs/               # 本地依赖库
    ├── bootstrap.min.css / bootstrap.bundle.min.js   (Bootstrap 5)
    ├── echarts.min.js                                (ECharts 5)
    └── aframe.min.js                                 (A-Frame 1.x)
```

## 数据和资源来源

- Bootstrap、ECharts、A-Frame 均为课堂下发的本地库文件（libs/ 目录），未使用 CDN，离线可运行；
- 自习室数据来自课程统一数据集，为教学演示数据，非真实统计；
- 数据来源已在页面首页与页脚标注："课程统一数据集"；
- 三维场景中的建筑（教学楼、旗杆、路灯）为 A-Frame 基本几何体拼装，未使用外部模型或贴图资源。

## Git 提交记录

按"整合一块提交一块"分步提交：整合骨架 → 交互与图表模块 → 三维区与自查证据，以及功能迭代（名称搜索、使用率图表、点击联动高亮）。
