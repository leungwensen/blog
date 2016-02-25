
# git二三事

## 概述

git伴随着linux内核开源项目而诞生。linux内核项目在91年到02年之间的版本管理非常原始，很多时候是贡献者把patch文件通过邮件发送给Linus本人，然后由Linus手工合并。02年之后，有个商业公司为这个项目免费提供了分布式版本管理系统BitKeeper，从此项目组在版本管理方面的效率有所提升。然而在05年的时候，有成员违反了BitKeeper提供者和Linux内核开发团队之间的协议，而Linus的应对不是带着项目成员道歉，而是花了两个星期写出来git的原型。git在BitKeeper的使用权限被收回后迅速接替，成为linux内核代码的版本控制系统。

```shell
    $ man git
```

大家可以去看看[git项目的第一个commit][first-commit-of-git]。git的描述是`git - the stupid content tracker`，这其中也许有项目最初带着的怨气，但的确如描述一样，对linux系开发者来说是非常“傻瓜式”的版本控制系统。

## git vs svn

要讲清楚git，可以拿大家比较熟悉的svn来做参照。

### 分布式vs集中式

首先，我们常常听到git和mercurial(hg)是分布式版本控制系统，而svn和cvs则是集中式的版本控制系统。两者的区别在哪里？

主要的区别有两点：

* 代码提交方式
* 远程和本地的信息对称性

分布式版本控制系统都是本地commit。生成代码提交信息的时候是不需要联网的。最终和远程代码库同步需要通过push或者pull命令。而集中式版本控制系统则是远程commit，每次生成代码提交信息都需要联网进行。从这一点上看，分布式比集中式灵活度高很多。

远程和本地的信息对称方面，首先git的远程代码库本身充当的角色仅仅是方便不同的开发版本库之间的“内容交换”，因为所有的本地版本都拥有从一开始到最新同步那一刻的所有历史提交纪录。远程和本地的提交信息是对称的，所有的代码库副本都是完整的。而集中式版本管理系统通常checkout都只能签出单一分支，本地代码库信息是不完整的。这一点差别带来的特性差异有时候很致命，譬如安全性上。集中式版本管理系统一旦远程代码库出了问题，几乎就是不可恢复的。而分布式版本管理系统即使远程服务器被物理销毁，所有代码都可以恢复。

### 元数据vs文件

那为什么集中式代码管理系统不采取这种全量提交信息推送的方式，保证每一个客户端都有完整的记录呢？

git的.git只会出现在项目的根目录下，其中不仅有每次提交的元数据，也保有所有的commit、branch、tag等信息，并且分支和tag都基于commit。可以这么理解：一次提交的元数据保存后，会生成一个对应的hash码，这个hash码就是一个commit。从commit上衍生了所有的东西，譬如branch，事实上就是保存了一个commit的文件，tag也是指向某一个commit的文件指针。

而svn的.svn只存放了当前分支的提交信息db和当前分支的commit历史。因为svn可以从远程代码库checkout某个分支的某个子文件夹，而这些信息都是动态生成的，因此实现全量的版本拷贝非常困难。所以基本上svn获取分支、获取更新、切换分支等操作都只能基于文件拷贝的实现方式来做，而不能单纯依赖提交信息（也就是差分）。甚至svn的分支、tag都是物理上的另一个目录。从这一点上看svn的设计和与git相比非常原始。

### 权限？安全？

看完上面的差异会有人问：svn的实现机制让它可以做到对路径级别进行精细的权限控制，是不是意味着svn事实上比git更安全？

首先是权限控制的问题。

* 分布式版本控制的理念和路径权限管理是冲突的，目前找不到能够精确控制路径权限的分布式代码控制系统

分布式意味着代码库的备份需要对等，而路径权限的存在意味着内容不对等，那么严重依赖元数据和hash码的分布式版本控制系统将不能正常工作。因为本身元数据和hash码的计算中很有可能涉及到某一个本地没有权限的路径。

* 分布式版本控制系统通常基于commit来控制读写权限

你可以设置某个用户对版本库的某个状态的编辑权限，譬如某个commit，某个分支，某个tag等。[gitolite][gitolite]让这些权限管理变得非常简单。

* 有解决的办法

上文提到的[gitolite][gitolite]是一个办法，它对写操作的限制可以精确到目录级别。当然，如果是担心代码泄露，想设置读权限的话，更推荐的办法是把项目拆分成不同的子系统，各个子系统分别设置权限。总的项目可以用[submodule][git-submodule]来依赖子系统。

另外，如果需要对某些开发者设置不可读权限，那么他们的工作完全可以作为新的项目来开发。git代码库拷贝的最小单位就是项目，正是基于这个考虑。

* svn精细授权背后的陷阱

svn各个分支之间的授权（包括目录授权）并不能继承，原因很简单，上文提过了svn不同分支甚至是不同的目录存放的，分支之间物理隔离。这对系统管理员来说是一个巨大的隐患。因为每一个分支都必须维护一个授权文件，并且一旦授权文件出了问题（譬如格式问题），管理员之前的工作都变得毫无意义。随着分支的增多、标签的增多（都是物理拷贝！），这个坑只会越挖越深。

然后是安全问题。

1. 代码完整性、提交历史的完整性方面之前提过，git完胜。
2. 代码泄露方面的安全问题，git有替代svn的方案，并且更加彻底、符合实际情况。
3. 提交的安全方面，gitolite可以完美解决，并且更加方便。

### 分支！

git鼓励分支，鼓励commit。生成分支和commit在git中代价实在太小，以至于完全不必要考虑“分支太多速度会不会变慢啊，会不会占很多存储空间啊”这种问题。开发者只需要考虑怎么样的分支命名、commit信息可以有利于团队交流即可。越详尽的commit历史，分工越明确的分支无疑可以带来越流畅、可控的开发体验。

svn每建一个分支就是拷贝代码生成一个新的目录。而git建一个分支则只是多一个保存hash码的指针文件而已。这个特性无疑是git远超svn最为关键的一点。

大家可以通过这个命令去确认一下：

```
    $ less $path/to/a/git-repo/.git/refs/heads/master
```

### 团队协作

基于超低成本的代码提交、创建分支特性，加上非常方便的查看差分的体验，git甚至衍生出好几种流派的工作流程（这个后面具体讲）。这些工作流程的核心就是如何确保在各种实际情况（网络情况、机器性能等）下有一个流畅的沟通协作的开发体验。

传统集中式的版本控制系统最大的问题会出在最后的合并流程。因为事实上开发分支和合并分支甚至是物理隔离的，而拥有合并权限的人和具体分支开发者往往不是同一个人，最终解决冲突的过程会有各种意料之外的情况。这是svn、cvs这些版本控制系统避免不了的问题。

而git里你随时可以建新分支，随时可以合并分支，操作的都是同一份物理备份，你基于这个物理备份做过的所有变更都有迹可循。并且基于强大的分支功能，我们甚至可以把分支的粒度降到单个类、甚至单个函数的级别，这样粒度的分支开发合并起来丝毫体会不到迟滞的感觉。

### git的问题

如果用git来管理非常庞大的历史项目，那么有可能会碰到git的一个问题：它没办法像svn一样checkout一个子目录，因此第一次clone的时候速度会非常慢。并且当项目规模迅速膨胀的时候，有可能会因为元数据剧增而自动走清理cache、压缩元数据的流程。所以这里有一个***成名的机会***。如果你能够给git加上***p2p数据传输或者断点续传***的特性，或者你可以解决***GB或者更大级别数据计算hash***时的性能问题，你都能在开源界青史留名。

## 安装&配置

下面是一些基本的安装配置流程。

### 命令行

#### mac

```
    $ brew install git
```

#### windows

[git-for-windows][git-for-windows]

#### linux

```
    $ yum install git-core
    $ apt-get install git-core
```

### GUI

日常使用基本上GUI客户端也能满足。

* [github-desktop][github-desktop]
* [git-osx-installer][git-osx-installer]
* [sourcetree][sourcetree]
* [tortoisegit][tortoisegit]

### 自动补全

在git的代码目录下有一个专门做自动补全的文件夹。

```
    git/contrib/completion
```

### 全局配置

全局配置可以通过命令行，也可以通过直接改文件。

```
.gitconf:

    [user]
        name  = 绝云
        email = wensen.lws@alibaba-inc.com

    [color]
        diff   = auto
        status = auto
        branch = auto
        ui     = auto

    [push]
        default = simple

    [core]
        editor = vim
        pager  = less -R
        excludesfile = ~/.gitignore

    [alias]
        diverges = !bash -c 'diff -u <(git rev-list --first-parent "${1}") <(git rev-list --first-parent "${2:-HEAD}") | sed -ne \"s/^ //p\" | head -1' -
        st       = status
        ci       = commit
        br       = branch
        co       = checkout
        df       = diff
        lg       = log --color --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit
        up       = !sh -c 'git pull --rebase --prune && git log --pretty=format:\"%Cred%ae %Creset- %C(yellow)%s %Creset(%ar)\" HEAD@{1}..'
        lol      = log --graph --decorate --pretty=oneline --abbrev-commit
        lola     = log --graph --decorate --pretty=oneline --abbrev-commit --all
        ls       = ls-files
```

修改某一个单项的方法：

```
    git config --global user.name yourname
```

用户区一定要配置，添加别名也可以显著提升效率。

另一个全局配置文件是 `.gitignore` 这个文件的作用是指定哪些路径或者文件不纳入版本控制。例子：

```
    .*.cfg
    .DS_Store
    .config
    .dat*
    .grunt
    .last_cover_stats
    .lock-wscript
    .repl_history
    .rvmrc
    Build.bat
    MANIFEST.bak
    META.json
    META.yml
    MYMETA.*
    coverage
```

## 几个概念

接下来在玩转git之前，我们先看几个概念。

### 文件状态

在一个git版本控制库里，一个文件有这几种基本状态。

* 未入库(untracked)
* 草稿(unstaged)
* 待commit(staged)
* 已提交(committed)
* 已同步(remote)

可以试着执行这个命令看看：

```
    $ git status
```

`Untracked files:`这个类目下的，就是未入库文件；

`Changes not staged for commit:`这个类目下的文件有未添加到待commit区的变更，并且文件名前会有这几个状态提示：

* modified
* added
* removed
* renamed

`Changes to be committed:`里是待commit的变更，状态提示和上述一致，但颜色不一样。

commit完成之后，就是已提交状态，这时会有类似这样的提示：

```
    Your branch is ahead of 'origin/dev' by 1 commit.
```

这个表示有已经提交的变更，但未和远程同步。

这时执行`git push`就可以把本地的变更同步到远程服务器了。

### 指针和分支

大家可以证实一下之前所说分支和tag都是commit的hash码这个事情。

事实上一个分支就是一个文件，这个文件里保存着一个commit的hash码。譬如：

```
    $ less $path/to/a/git-repo/.git/refs/heads/master
```

这个文件没有别的内容，只有一个hash码。

而git所谓的切换分支是怎么回事呢？.git文件夹下有一个HEAD文件，这个文件的内容如下：

```
     ref: refs/heads/dev
```

内容很简洁易懂，就是一个指向dev分支的指针。HEAD指向哪个分支，我们当前就处于哪个分支。

并且这个HEAD可以作为一个commit来使用（事实上一个分支里保存的就是这个分支的最新commit）。由此还延伸出这样的用法：

符号 | 含义
-----|------
HEAD | 当前分支最新commit
HEAD^ (HEAD^1)(HEAD~1) | 第二新的commit
HEAD^^ (HEAD^2)(HEAD~2) | 第三新的commit

## 基本使用

以下是一些常用的命令：

```
    $ git clone       # 克隆版本库
    $ git fetch       # 同步远程版本库状态
    $ git pull        # 同步当前分支并检出最新commit
    $ git log         # 查看历史
    $ git diff        # 查看差分
    $ git checkout    # 签出分支｜commit｜tag等
    $ git checkout -b # 新建分支
    $ git branch -d   # 删除分支
    $ git add         # 把文件或目录加入版本哭或者把变更加入到staged列表
    $ git add -A      # 把所有untracked或者unstaged的文件或变更都加到staged列表
    $ git rm          # 把文件或者目录移出版本库
    $ git reset       # 把staged中的文件或者变更恢复到之前的状态
    $ git revert      # 回滚到某一个commit
    $ git stash       # 把所有uncommited的内容保存到缓存区域（.git/refs/stash）
    $ git commit      # 生成commit
    $ git merge       # 合并分支｜commit等
    $ git rebase      # “重新基于”一个分支
    $ git tag         # 添加标签（tag）
    $ git push        # 推送到远程版本库
    $ git push -u     # 推送新分支
    $ git config      # 配置
```

具体的用法可以这样看

```
    $ man git
```

也可以在线查看[progit][progit]。

下面介绍几个有用或者要注意的命令。

* 查看所有分支

```
    $ git branch    # 本地
    $ git branch -r # 远程
```

* 查看2次log

```
    $ git log -2
```

* 查看当前分支比和other分支差异的commit

```
    $ git log other..  # 当前分支比other分支多了哪些commit
    $ git log ..other  # other分支比当前分支多了哪些commit
```

* 热切换分支之前和之后可以用stash子命令来缓存和恢复工作状态

```
    $ git stash       # 缓存
    $ git stash apply # 恢复
    $ git stash list  # 查看缓存列表
```

* 强制覆盖远程分支 ***注意，只用于恢复代码***

```
    $ git push -f
```

* 删除远程分支

```
    $ git push origin --delete <branchName>
    $ git push origin :<branchName>
```

* 删除远程tag

```
    $ git push origin --delete tag <tagname>
    $ git tag -d <tagname>
    $ git push origin :refs/tags/<tagname>
```

## 工作流程

前面提过，得益于git的强大与简洁，业界已经衍生出几种基于git的工作流程。下面介绍几种有代表性的。

### 集中式流程(centralized workflow)

这种工作流程称得上是git对集中式版本控制系统的***降维攻击***。一般来说比较适合用于个人项目、小团队项目或者充当从旧的版本控制系统迁移到git的过渡方案。

它大致的理念就是完全只用一个master分支作为开发、测试、发布分支，这样就相当于使用传统的集中式版本控制系统了。并且加上了一部分强大的git特性。

如果你熟悉[git-svn][git-svn]，那么你甚至可以继续使用原有的svn服务器，改用git来做版本管理。

### 特性分支(feature branch)

这个是云数据实验室现用工作流程。事实上也是流传最广的一种。它是广大码农在探索git最佳实践的过程中沉淀下来的东西，可以参考这篇文章：[a-successful-git-branching-model][a-successful-git-branching-model]。

其主要的理念是把分支的创建粒度细化到功能点，提倡多多创建分支、提倡结对编程。实践这个工作流程最重要的一点就是约定分支管理的规范。下面列举云数据实验室的分支管理细则。

* 主分支master为发布分支，只用于打标签（tag）和发布
* dev分支为开发分支，用于开发和部署开发机
* feature分支为功能点开发分支，从dev分支checkout，分支以`feature-`开头，后半部分命名采用驼峰式说明要开发的feature
* bugfix分支可以从dev或者master分支checkout，以`bugfix-`开头，后半部分命名规则如上
* 非代码资源、文档资源和其它静态资源可以建asset分支专门维护，也可以从asset中checkout以`asset-`开头的自分支
* 每次checkout新分支之前要先同步远程版本库（`git pull`）
* 开发功能点前最好新建issue，开发完成后新建一个***从feature分支到dev分支的merge request***，并邀请其他成员进行code review，review人确认过后合并分支并且关闭issue。
* 发布之前把dev分支合并到master分支，测试通过后打上tag（`git tag -a`），新的开发流程开始时dev分支要重新基于master（`git checkout dev & git rebase master`）

### forking工作流程(forking workflow)

这种工作流程值得一提的原因是，它是[github][github]以及其它在线git版本库托管服务广泛支持的一种工作流程。这种工作流程一般是前一种工作流程的补充：它适合于核心开发者以外的人为项目提供补丁。

譬如你在用[ipython][ipython]的过程中发现了一个bug，并且你修复了它，你想给ipython团队提供你的补丁代码，那么你可以把这个项目fork过来，加上补丁代码之后发起一个pull request。事实上，像ipython这样流行的开源项目，一般都有一个规范的代码贡献流程，这个流程事实上就是一个forking工作流程的描述。ipython的代码贡献细则可以在这里看到：[ipython-pull-request][ipython-pull-request]。

这种工作流程给有价值的开源项目提供了巨大的助力：一般一个开源项目贡献者越多，大家就越觉得它鲁棒、可靠，用的人也就越多；用的人多了，发现的bug也越详尽，pull request也越多，项目越来越完善，反过来贡献者和新用户也就越多。这样就形成了一个良性循环。

github这个聚拢了巨量软件开发人员的开源社区之所以取得成功，这种工作流程功不可没。

## 扩展阅读

### [a-successful-git-branching-model][a-successful-git-branching-model]

### [atlassian-git-tutorials][atlassian-git-tutorials]

### [git-scm][git-scm]

### [gitolite][gitolite]

### [progit][progit]

### [pull-requests-of-git-project][pull-requests-of-git-project]

### [tig][tig]

### 糟糕，出了个贻笑大方的bug，要怎样才能把committer改成自己的主管？

救火救场请用

```
    $ git filter-branch -f --env-filter
```

或者直接报警 [警察叔叔就是这个人][blamehim]

## FAQ

[a-successful-git-branching-model]: http://nvie.com/posts/a-successful-git-branching-model/
[atlassian-git-tutorials]: https://www.atlassian.com/git/tutorials/
[blamehim]: https://github.com/dyng/BlameHim/blob/master/blamehim/
[first-commit-of-git]: https://github.com/git/git/commit/e83c5163316f89bfbde7d9ab23ca2e25604af290#diff-c47c7c7383225ab55ff591cb59c41e6bR2
[git-for-windows]: https://git-for-windows.github.io/
[git-osx-installer]: https://git-for-windows.github.io/
[git-scm]: http://git-scm.com/
[git-svn]: http://git-scm.com/book/en/v1/Git-and-Other-Systems-Git-and-Subversion#git-svn
[github]: https://github.com/
[github-desktop]: https://desktop.github.com/
[gitolite]: https://github.com/sitaramc/gitolite/
[ipython]: https://github.com/ipython/ipython/
[ipython-pull-request]: https://github.com/ipython/ipython/wiki/Dev%3A-GitHub-workflow#pull-requests
[progit-cn]: http://git-scm.com/book/zh/v2/
[progit-en]: http://git-scm.com/book/en/v2/
[progit-ja]: http://git-scm.com/book/ja/v2/
[progit]: https://progit.org/
[pull-requests-of-git-project]: https://github.com/git/git/pulls/
[sourcetree]: https://www.sourcetreeapp.com/
[tig]: https://github.com/jonas/tig/
[tortoisegit]: https://tortoisegit.org/
[git-submodule]: http://git-scm.com/docs/git-submodule/

