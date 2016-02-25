# Mac下使用latex遇到的问题以及解法

## 字体

```shell
The font "[SIMKAI.TTF]" cannot be found.
```

* 安装MacTex以及相关包；
* 文档里有以下几个设置：

```tex
% !TEX program = XeLaTeX
% !TEX encoding = UTF-8
\documentclass[UTF8,nofonts]{ctexart} % 关键是nofonts参数，保证编译文章时不会去找奇怪的win字体

% 把字体设置成mac预装好的字体 {
    \setCJKmainfont[BoldFont=STHeiti,ItalicFont=STKaiti]{STSong}
    \setCJKsansfont[BoldFont=STHeiti]{STXihei}
    \setCJKmonofont{STFangsong}
% }

\begin{document}
    文章内容。
\end{document}
```

## 文档类型设置

直接按照以下最佳实践编写文档

### 书籍

```tex
%!TEX program = XeLaTeX
%!TEX encoding = UTF-8 Unicode
\documentclass[cs4size,a4paper,fancyhdr,fntef,UTF8,nofonts,hyperref]{ctexbook} %文档类别
%Packages {
    %latex 宏包 {
        \usepackage[top=1in,bottom=1in,left=1.25in,right=1.25in]{geometry}
        %\usepackage{algorithmic}
        \usepackage{amsmath} %math!
        \usepackage{float}
        \usepackage{fontspec}
        \usepackage{hyperref}
        \usepackage{indentfirst}
        \usepackage{ifthen}
        \usepackage{makeidx}
        \usepackage{paralist} %行内列表
        \usepackage{pgffor}
        %\usepackage{zhspacing}
    %}
    %自定义宏包 {
        \usepackage{package/translation}
        \usepackage{package/variable}
    %}
%}
%settrings {
    %字体 {
        \setCJKmainfont[BoldFont=STHeiti,ItalicFont=STKaiti]{STSong}
        \setCJKsansfont[BoldFont=STHeiti]{STXihei}
        \setCJKmonofont{STFangsong}
        %\zhspacing{}
    %}
    %样式 {
        %\pagestyle{plain} %在页脚正中显示页码
        \pagestyle{fancy}
    %}
    %信息 {
        \author{\varauthor}
        \title{\vartitle\\\varsubtitle}
        \date{}
    %}
%}
%制作index {
    \makeindex
%}
\begin{document}
    \frontmatter{} %封面相关
    %封面 {
        %\include{cover}
    %}
    %作者 profile {
        %\include{author}
    %}
    %序言 {
        %\include{preface}
    %}
    %目录 {
        \begin{small} % 使用小字体
            \tableofcontents % 不能加{}，否则会输出空目录
        \end{small}
    %}
    \mainmatter{} %正文
    %章节 {
        \begin{normalsize}
            章节内容
        \end{normalsize}
    %}
    \backmatter{} %背页
    %版权页 {
        %\include{copyright}
    %}
    %使用 index {
        \appendix
        \printindex
    %}
\end{document}
```

### 论文、其它文章

```tex
%!TEX program = XeLaTeX
%!TEX encoding = UTF-8 Unicode
\documentclass[UTF8,nofonts]{ctexart} % 文档类别
% Packages {
    % latex 宏包 {
        \usepackage[top=1in,bottom=1in,left=1.25in,right=1.25in]{geometry}
        \usepackage{float}
        \usepackage{fontspec}
        \usepackage{hyperref}
        \usepackage{indentfirst}
        \usepackage{makeidx}
        %\usepackage{zhspacing}
        \usepackage{multicol}
        \usepackage{multirow}
    %}
%}
% settings {
    % 字体 {
        \setCJKmainfont[BoldFont=STHeiti,ItalicFont=STKaiti]{STSong}
        \setCJKsansfont[BoldFont=STHeiti]{STXihei}
        \setCJKmonofont{STFangsong}
        %\zhspacing{}
    %}
    % 样式 {
        \pagestyle{plain} % 在页脚正中显示页码
    %}
    \title{出版许可协议书}
    \author{}
    \date{}
%}
% 制作index {
    \makeindex
%}
\begin{document}
    \maketitle
    \renewcommand{\contentsname}{目录}
    \tableofcontents
    文章内容
\end{document}
```
