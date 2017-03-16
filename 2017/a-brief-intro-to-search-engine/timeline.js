(function () {
    let rendered = false
    const container = document.getElementById('timeline')
    const data = [
        {
            id: 'archie',
            content: `The FIRST one: Archie
<br>
<a href="http://www.seobythesea.com/2006/02/just-what-was-the-first-search-engine/" target="_blank">
<img src="./a-brief-intro-to-search-engine/archie.png" style="width: 160px;">
</a>
`,
            start: '1990-09-10',
        },
        {
            id: 'www',
            content: `Tim Berners-Lee & the WWW
<br>
<a href="http://info.cern.ch/" target="_blank">
<img src="./a-brief-intro-to-search-engine/tim-bl.jpg" style="width: 160px;">
</a>
`,
            start: '1991-08-06',
        },
        {
            id: 'yahoo',
            content: `Yahoo! Directory
<br>
<a href="" target="_blank">
<img src="./a-brief-intro-to-search-engine/yahoo-directory.png" style="width: 160px;">
</a>
`,
            start: '1994-04-01',
        },
        {
            id: 'webcrawler',
            content: `WebCrawler
<br>
<a href="" target="_blank">
<img src="./a-brief-intro-to-search-engine/webcrawler.gif" style="width: 160px;">
</a>
`,
            start: '1994-04-20',
        },
        {
            id: 'Overture',
            content: `Pioneer of paid search
<br>
<a href="" target="_blank">
<img src="./a-brief-intro-to-search-engine/overture.jpg" style="width: 160px;">
</a>
`,
            start: '1998-02-01',
        },
        {
            id: 'google-1998',
            content: `Google launched
<br>
<a href="https://www.google.com/" target="_blank">
<img src="./a-brief-intro-to-search-engine/google-1998.png" style="width: 160px;">
</a>
`,
            start: '1998-09-04',
        },
        {
            id: 'baidu',
            content: `Baidu launched
<br>
<a href="https://www.baidu.com/" target="_blank">
<img src="./a-brief-intro-to-search-engine/baidu.svg" style="width: 160px;">
</a>
`,
            start: '2000-01-01',
        },
        {
            id: 'google-AdWords',
            content: `Google AdWords
<br>
<a href="https://www.google.com/" target="_blank">
<img src="./a-brief-intro-dto-search-engine/google-adwords.png" style="width: 160px;">
</a>
`,
            start: '2000-10-23',
        },
        {
            id: 'bing',
            content: `Bing launched
<br>
<a href="https://www.bing.com/" target="_blank">
<img src="./a-brief-intro-to-search-engine/bing.svg" style="width: 160px;">
</a>
`,
            start: '2009-06-01',
        }
    ]
    Reveal.addEventListener('slidechanged', (event) => {
        // event.previousSlide, event.currentSlide, event.indexh, event.indexv
        if (event.indexh === 1 && event.indexv === 0 && !rendered) {
            new vis.Timeline(container, data, {})
            rendered = true
        }
    })
})()

