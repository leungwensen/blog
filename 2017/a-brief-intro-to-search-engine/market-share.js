(function () {
    let rendered = false
    const data = [
        {
            name: 'Google',
            value: 80.52,
        },
        {
            name: 'Bing',
            value: 6.92,
        },
        {
            name: 'Baidu',
            value: 5.94,
        },
        {
            name: 'Yahoo!',
            value: 5.35,
        },
    ]

    Reveal.addEventListener('slidechanged', (event) => {
        // event.previousSlide, event.currentSlide, event.indexh, event.indexv
        if (event.indexh === 2 && event.indexv === 0 && !rendered) {
            const Stat = G2.Stat
            const chart = new G2.Chart({
                id: 'market-share-2017',
                forceFit: true,
                height: 500,
            })
            chart.source(data)
            chart.coord('theta', {
                radius: 0.8 // 设置饼图的大小
            })
            chart.legend('name', {
                position: 'bottom',
                itemWrap: true,
                formatter: (val) => {
                    for (let i = 0, len = data.length; i < len; i++) {
                        const obj = data[i];
                        if (obj.name === val) {
                            return `${val}: ${obj.value}%`;
                        }
                    }
                }
            })
            chart.tooltip({
                title: null,
            })
            chart.intervalStack()
                .position(Stat.summary.percent('value'))
                .color('name')
                .label('name*..percent', (name, percent) => {
                    percent = `${(percent * 100).toFixed(2)}%`;
                    return `${name} ${percent}`;
                })

            chart.render()
            // 设置默认选中
            const geom = chart.getGeoms()[0] // 获取所有的图形
            const items = geom.getData() // 获取图形对应的数据
            geom.setSelected(items[0]) // 设置选中
            rendered = true
        }
    })
})()
