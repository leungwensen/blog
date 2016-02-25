var arrayUtils = require('zero-lang/array');
var Color = require('zero-colors/Color');
var domData = require('zero-dom/data');
var domEvent = require('zero-dom/event');
var domQuery = require('zero-dom/query');
var domStyle = require('zero-dom/style');
var sprintf = require('zero-fmt/sprintf');
var uuid = require('zero-crypto/uuid');

var DecisionTree = require('./id3');

var appContainer = domQuery.one('#visualize-id3');
var canvas = domQuery.one('.training-canvas', appContainer),
    context = canvas.getContext('2d');

var selectedColorElement;
var selectedColor;
function selectColorElement(element) {
    if (selectedColorElement) {
        domStyle.set(selectedColorElement, 'border', '');
    }
    selectedColorElement = element;
    domStyle.set(element, 'border', '2px solid grey');
    selectedColor = new Color(domData.get(element, 'color'));
}
selectColorElement(domQuery.one('.color-select', appContainer));

var points = [];

function clearCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    points = [];
    initGraph();
}

function drawCircle(x, y, radius, color) {
    context.beginPath();
    context.arc(x, y, radius, 0, 2 * Math.PI, false);

    context.fillStyle = color;
    context.fill();
    context.closePath();
    context.stroke();
}

var POINT_RADIUS = 3;
function addPoint(e) {
    var x = e.offsetX ? e.offsetX : (e.layerX - canvas.offsetLeft);
    var y = e.offsetY ? e.offsetY : (e.layerY - canvas.offsetTop);

    drawCircle(x, y, POINT_RADIUS, selectedColor.toCss());
    points.push({
        x: x,
        y: y,
        color: selectedColor.toCss()
    });
}

var tree = null;
function rebuildDecisionTree() {
    if (points.length === 0) {
        return;
    }
    var threshold = Math.floor(points.length / 100);
    threshold = (threshold > 1) ? threshold : 1;
    tree = new DecisionTree({
        trainingSet: points,
        categoryAttr: 'color',
        minItemsCount: threshold
    });

    showTreePredictions();
    showPoints();
    showDecisionTree();
}

var MAX_ALPHA = 128;
function putPixel(imageData, width, x, y, color, alpha) {
    var c = new Color(color);
    var indx = (y * width + x) * 4;

    var currAlpha = imageData.data[indx + 3];

    imageData.data[indx + 0] = (c.r * alpha + imageData.data[indx + 0] * currAlpha) /
        (alpha + currAlpha);
    imageData.data[indx + 1] = (c.g * alpha + imageData.data[indx + 1] * currAlpha) /
        (alpha + currAlpha);
    imageData.data[indx + 2] = (c.b * alpha + imageData.data[indx + 2] * currAlpha) /
        (alpha + currAlpha);
    imageData.data[indx + 3] = alpha + currAlpha;
}
function showTreePredictions() {
    var width = canvas.width;
    var height = canvas.height;
    context.clearRect(0, 0, width, height);
    var imageData = context.getImageData(0, 0, width, height);

    for (var x = 0; x < width; x++) {
        for (var y = 0; y < height; y++) {
            var predictedColor = tree.predict({
                x: x,
                y: y
            });
            putPixel(imageData, width, x, y, predictedColor, MAX_ALPHA);
        }
    }

    context.putImageData(imageData, 0, 0);
}
function showPoints() {
    arrayUtils.each(points, function (p) {
        drawCircle(p.x, p.y, POINT_RADIUS, p.color);
    });
}

var svg = d3.select('#visualize-id3 svg');
var inner = svg.select('g');
var zoom = d3.behavior.zoom().on('zoom', function () {
    inner.attr('transform', 'translate(' + d3.event.translate + ')' +
        'scale(' + d3.event.scale + ')');
});
var render = new dagreD3.render();
var g;
function initGraph() {
    g = new dagreD3.graphlib.Graph();
    svg.call(zoom);
    g.setGraph({
        nodesep: 30,
        ranksep: 150,
        rankdir: 'TB',
        marginx: 10,
        marginy: 10
    });
    inner.call(render, g);
}
function addGraphElements(branch, parentId, edge) {
    if (!branch) {
        return;
    }
    var branchId = uuid();
    var label = branch.category ?
        sprintf(
            '<span style="background-color: %s;">%s</span>',
            branch.category, branch.category
        ) :
        sprintf('%s %s %s?', branch.attribute, branch.predicateName, branch.pivot);
    g.setNode(branchId, {
        id: branchId,
        labelType: 'html',
        label: label,
        rx: 5,
        ry: 5,
        padding: 5,
    });
    if (parentId && edge) {
        g.setEdge(parentId, branchId, {
            label: edge,
            width: 40,
            lineInterpolate: 'basis',
            style: 'fill:none;',
        });
    }
    if (branch.match) {
        addGraphElements(
            branch.match,
            branchId,
            sprintf('yes(%d)', branch.matchedCount)
        );
    }
    if (branch.notMatch) {
        addGraphElements(
            branch.notMatch,
            branchId,
            sprintf('no(%d)', branch.notMatchedCount)
        );
    }
}
function showDecisionTree() {
    if (!tree || !tree.root) {
        return;
    }
    initGraph();

    addGraphElements(tree.root);
    inner.call(render, g);
    // Zoom and scale to fit
    var zoomScale = zoom.scale();
    var graphWidth = g.graph().width;
    var graphHeight = g.graph().height;
    var width = parseInt(domStyle.get(svg, 'width'));
    var height = parseInt(domStyle.get(svg, 'height'));
    zoomScale = Math.min(width / graphWidth, height / graphHeight);
    var translate = [
        (width / 2) - ((graphWidth * zoomScale) / 2),
        (height / 2) - ((graphHeight * zoomScale) / 2)
    ];
    zoom.translate(translate);
    zoom.scale(zoomScale);
    zoom.event(svg);
}

var isLeftKeyHolding;
domEvent.on(appContainer, 'click', '.color-select', function (e) {
    selectColorElement(e.delegateTarget);
});
domEvent.on(appContainer, 'click', '.btn-clear', function () {
    clearCanvas();
});
domEvent.on(canvas, 'mousedown', function (e) {
    isLeftKeyHolding = true;
    addPoint(e);
});
domEvent.on(canvas, 'mouseup', function () {
    if (isLeftKeyHolding) {
        isLeftKeyHolding = false;
        rebuildDecisionTree();
    }
});
domEvent.on(canvas, 'mouseout', function () {
    if (isLeftKeyHolding) {
        isLeftKeyHolding = false;
        rebuildDecisionTree();
    }
});
domEvent.on(canvas, 'mousemove', function (e) {
    if (isLeftKeyHolding) {
        addPoint(e);
    }
});
