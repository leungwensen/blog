(function () {
    let rendered = false
    const data = [
        {
            category: 'User Survey',
            type: 'Navigational',
            desc: 'The immediate intent is to reach a particular site',
            value: 24.5,
        },
        {
            category: 'User Survey',
            type: 'Informational',
            desc: 'The intent is to acquire some information assumed to be present on one or more web pages',
            value: 39,
        },
        {
            category: 'User Survey',
            type: 'Transactional',
            desc: 'The intent is to perform some web-mediated activity',
            value: 36,
        },
        {
            category: 'Query Log Analysis',
            type: 'Navigational',
            desc: 'The immediate intent is to reach a particular site',
            value: 20,
        },
        {
            category: 'Query Log Analysis',
            type: 'Informational',
            desc: 'The intent is to acquire some information assumed to be present on one or more web pages',
            value: 48,
        },
        {
            category: 'Query Log Analysis',
            type: 'Transactional',
            desc: 'The intent is to perform some web-mediated activity',
            value: 30,
        },
    ]

    Reveal.addEventListener('slidechanged', (event) => {
        // event.previousSlide, event.currentSlide, event.indexh, event.indexv
        if (event.indexh === 3 && event.indexv === 0 && !rendered) {
            const Stat = G2.Stat
            const chart = new G2.Chart({
                id: 'types-of-search-queries',
                forceFit: true,
                height: 500,
                plotCfg: {
                    margin: 80
                }
            })
            chart.source(data)
            // 以 year 为维度划分分面
            chart.facet(['category'], {
                margin: 50,
                facetTitle: {
                    colDimTitle: {
                        title: null
                    },
                    colTitle: {
                        title: {
                            fontSize: 18,
                            textAlign: 'center',
                            fill: '#999'
                        }
                    }
                }
            })
            chart.legend({
                position: 'bottom'
            })
            chart.coord('theta', {
                radius: 1,
                inner: 0.35
            })
            chart.tooltip({
                title: null
            })
            chart.intervalStack().position(Stat.summary.percent('value'))
                .color('type')
                .label('type*..percent', (type, percent) => {
                    percent = `${(percent * 100).toFixed(2)}%`;
                    return `${type} ${percent}`;
                })
                .style({
                    lineWidth: 1
                })
            chart.render()
            rendered = true
        }
    })
})()
