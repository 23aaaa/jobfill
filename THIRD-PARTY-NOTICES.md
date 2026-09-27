# 第三方说明

运行包没有嵌入第三方 JavaScript 库、字体文件、远程字体或 CDN 资源。原有图标是本项目内联 SVG 路径，打包图标为原始交付的本地资源。

六组颜色值来自 Radix Colors 官方 sRGB 色阶，只保留所需 token，没有引入其运行库。来源与许可：
https://raw.githubusercontent.com/radix-ui/colors/main/src/light.ts
https://raw.githubusercontent.com/radix-ui/colors/main/LICENSE

MIT License

Copyright (c) 2021-2022 Modulz
Copyright (c) 2022-Present WorkOS

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Node.js、Python、Playwright、Chromium、artifact_tool 用于开发或验证，不是扩展的运行依赖，也不把这些工具的安装文件、字体或浏览器打包给用户。它们自身的许可和平台条款分别适用。本说明不替代运营者对项目权利、商标与销售条款的审查。
