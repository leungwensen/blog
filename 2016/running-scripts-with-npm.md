用`npm`执行脚本
==============

![npm-script](./running-scripts-with-npm/npm-script.png)

大部分`npm`用户都知道可以在`package.json`文件中定义`npm start`或者`npm test`这样的脚本任务。其实npm的脚本功能远远不止于启动服务器或者执行测试。

这是一个典型的`package.json`文件。

```javascript
// package.json
// 定义start和test脚本任务
{
  "name": "death-clock",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "test": "mocha --reporter spec test"
  },
  "devDependencies": {
    "mocha": "^1.17.1"
  }
}
// 这里为讲解需要，我在JSON文件内容中加了注解
// 事实上JSON文件中是不允许有注释的
```

`start`其实是默认脚本任务，内容也默认是`node server.js`，所以上述配置其实是冗余的。为了能用在`test`任务中调用`mocha`，还需要把它作为依赖加到`devDependencies`这一节下（当然，加到`dependencies`这一节下也可以，但因为在生产环境中不需要用到，所以放到`devDependencies`下更合适一些）。

`mocha --reporter spec test`这句命令之所以能运行，是因为`npm`会在`node_modules/.bin`目录下检索相应的脚本文件，而`mocha`包被安装后，一个名为`mocha`的脚本也会安装到这个目录下。

`mocha`项目的`package.json`配置中的这一段描述了被安装到`bin`目录下的脚本。[^typo-1]

```javascript
// mocha package.json
{
  "name": "mocha",
  ...
  "bin": {
    "mocha": "./bin/mocha",
    "_mocha": "./bin/_mocha"
  },
  ...
}
```

可以看到，`mocha`包定义了两个脚本：`mocha`和`_mocha`。

很多`npm`包都定义了`bin`这一节的内容。这一节指定的脚本都可以像`mocha`一样被`npm`直接运行。执行`ls node_modules/.bin`命令就可以知道在当前项目下有哪些`npm`脚本。

```bash
# 我一个项目下可用的npm脚本
$ ls node_modules/.bin
_mocha   browserify  envify       jshint
jsx      lessc       lesswatcher  mocha
nodemon  uglifyjs    watchify
```

## 执行脚本任务

`start`和`test`这样的特殊脚本任务都可以直接执行。

```bash
# 执行"start"指定的脚本
$ npm start
$ npm run start

# 执行"test"指定的脚本
$ npm test
$ npm run test
```

所有其它的脚本任务都必须用`npm run`来执行。`npm run`是`npm run-script`的缩略。

```javascript
{
  ...
  "scripts": {
    // watch-test starts a mocha watcher that listens for changes
    "watch-test": "mocha --watch --reporter spec test"
  },
}
```

上述代码指定的脚本任务可以通过`npm run watch-test`来执行，执行`npm watch-test`则会报错。

## 直接执行脚本文件

上述例子中执行的脚本任务都定义在`package.json`中，但这并不是必要条件。`npm run`可以执行任意`node_modules/.bin`路径下的脚本。也就是说，除了`npm test`，我还可以直接通过`npm run mocha`来执行`mocha`脚本。[^error-1]

## 自动补全

我们很难记住各种模块提供的形形色色的脚本命令。如果有自动补全的话，输入命令就简单多了。事实上用`npm`执行脚本是可以做到自动补全的。`npm`提供了非常友好的命令补全功能。执行`npm completion`可以得到一个`npm`的命令自动补全脚本，只要应用这个脚本，就能很方便的自动补全`npm`的普通子命令或者`npm run`的脚本命令。太方便了！

我习惯于把各种自动补全脚本存成文件放到`.bashrc`文件可以调用的地方去。

```bash
# npm_completion.sh
. <(npm completion)

# 我一个项目的自动补全输出
$ npm run <tab>
nodemon           browserify          build
build-js          build-less          start
jshint            test                deploy
less              uglify-js           express
mocha             watch               watch-js
watch-less        watch-server
```

很帅吧！

## 组合脚本任务

上述的`npm`特性已经可以满足大部分场景了，不过有时候我们需要同时完成多项任务。`npm`也具备这样的能力。`npm run`其实最后会把脚本任务输出给`sh`执行，所以理论上我们可以像在命令行中一样组合各种脚本任务。

### 管道

假设我们要用`browserify`打包`javascript`文件，并且要用`uglifyjs`进行代码混淆。我只需要用管道（`|`）把`browserify`的输出转接给`uglifyjs`就可以了。非常简单。

```javascript
// package.json
// browserify的reactify选项用于处理React语法
"scripts": {
  "build-js": "browserify -t reactify app/js/main.js | uglifyjs -mc > static/bundle.js"
},
// 添加必要的依赖项
"devDependencies": {
  "browserify": "^3.14.0",
  "reactify": "^0.5.1",
  "uglify-js": "^2.4.8"
}
```

### 串行

另一个场景是我们希望当且仅当上一个命令完成后，再执行下一个命令。可以通过串行符号（`&&`）来实现这个功能，当然，管道（`|`）也可以实现类似的效果。[^error-2]

```javascript
"scripts": {
  // 如果build-js，则继续执行build-less
  "build": "npm run build-js && npm run build-less",
  ...
  "build-js": "browserify -t reactify app/js/main.js | uglifyjs -mc > static/bundle.js",
  "build-less": "lessc app/less/main.less static/main.css"
}
```

这里，我通过`build`脚本任务来执行另外两个在`package.json`中定义的脚本任务。和执行脚本不同之处在于：必须使用`npm run`来执行其它脚本任务。

### 并行

有时候并行地执行多个命令的功能也是必要的。使用并行符号（`&`）可以把子命令作为后台任务并行执行。

```javascript
"scripts": {
  // 并行地执行watch-js，watch-less和watch-server
  "watch": "npm run watch-js & npm run watch-less & npm run watch-server",
  "watch-js": "watchify app/js/main.js -t reactify -o static/bundle.js -dv",
  "watch-less": "nodemon --watch app/less/*.less --ext less --exec 'npm run build-less'",
  "watch-server": "nodemon --ignore app --ignore static server.js"
},
// 添加必要的依赖项
"devDependencies": {
  "watchify": "^0.6.2",
  "nodemon": "^1.0.15"
}
```

上述配置有几个挺有意思的点。首先`watch`脚本任务使用`&`来并行执行三个`watch`任务。如果按下`Ctrl-C`杀掉进程，所有`watch`任务都会停止，因为它们由同一个父进程执行。

`watchify`是`browserify`命令的`watch`模式。`watch-server`是`nodemon`的标准用法：每当有相应的文件变更时，重启服务器。

`watch-less`则是`nodemon`的一种不常见的用法。每当有`less`文件变更的时候，它都会执行`npm run build-less`命令把`less`文件编译成`CSS`文件。`--ext less`是必需的选项。`--exec`选项指定的是`nodemon`执行的外部命令。

## 复杂脚本

如果是更复杂的脚本任务，我通常会写成`bash`文件，而在`package.json`中指定为脚本任务。下面是一个脚本实例，这个脚本做的事情是把编译好的资源加到一个发布分支，并且把这个分之推送到`Heroku`上。

```bash
#!/bin/bash

set -o errexit # Exit on error

git stash save -u 'Before deploy' # Stash all changes, including untracked files, before deploy
git checkout deploy
git merge master --no-edit # Merge in the master branch without prompting
npm run build # Generate the bundled Javascript and CSS
if $(git commit -am Deploy); then # Commit the changes, if any
  echo 'Changes Committed'
fi
git push heroku deploy:master # Deploy to Heroku
git checkout master # Checkout master again
git stash pop # And restore the changes
```

加上`package.json`的配置后，就可以通过`npm run deploy`命令执行这个脚本了。

```javascript
"scripts": {
  "deploy": "./bin/deploy.sh"
},
```

## 小结

对于`Node`而言，`npm`的存在意义并不止于包管理器。通过合适的配置，我们可以处理绝大部分的脚本需求。

另一个用`npm`执行脚本的原因是，只需要配置好`start`和`test`，我的项目就可以和`Heroku`和`TravisCI`这样的`SaaS`服务提供商整合起来了。

## 文档信息

项目 | 内容
---- | ----
原文作者 | [Anders Janmyr](https://github.com/andersjanmyr)
原文链接 | http://anders.janmyr.com/2014/03/running-scripts-with-npm.html
本文链接 | http://leungwensen.github.io/blog/2016/from-socialcalc-to-ethercalc.html

如果发现翻译问题，欢迎反馈：[leungwensen@gmail.com](mailto:leungwensen@gmail.com)

[^typo-1]: 原文笔误：`mocha`写成了`macha`
[^error-1]: 原文错误：`npm test`写成了`mocha test`
[^error-2]: 原文代码注释错误：`build-js`写成了`build-less`
