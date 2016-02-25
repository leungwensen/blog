(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*
 * @author: 绝云（wensen.lws）
 * @description: description
 */

/**
 * Creates an instance of DecisionTree
 *
 * @constructor
 * @param builder - contains training set and
 *                  some configuration parameters
 */

var lang = require('zero-lang');
var declare = require('zero-oop/declare');

var DecisionTree = declare({
    constructor: function (builder) {
        this.root = buildDecisionTree({
            trainingSet: builder.trainingSet,
            ignoredAttributes: arrayToHashSet(builder.ignoredAttributes),
            categoryAttr: builder.categoryAttr || 'category',
            minItemsCount: builder.minItemsCount || 1,
            entropyThrehold: builder.entropyThrehold || 0.01,
            maxTreeDepth: builder.maxTreeDepth || 70
        });
    },
    predict: function (item) {
        return predict(this.root, item);
    }
});

/**
 * Transforming array to object with such attributes
 * as elements of array (afterwards it can be used as HashSet)
 */
function arrayToHashSet(array) {
    var hashSet = {};
    if (array) {
        lang.each(array, function (item) {
            hashSet[item] = true;
        });
    }
    return hashSet;
}

/**
 * Calculating how many objects have the same
 * values of specific attribute.
 *
 * @param items - array of objects
 *
 * @param attr  - variable with name of attribute,
 *                which embedded in each object
 */
function countUniqueValues(items, attr) {
    var counter = {};

    // detecting different values of attribute
    lang.each(items, function (item) {
        counter[item[attr]] = 0;
    });

    // counting number of occurrences of each of values
    // of attribute
    lang.each(items, function (item) {
        counter[item[attr]] += 1;
    });
    return counter;
}

/**
 * Calculating entropy of array of objects
 * by specific attribute.
 *
 * @param items - array of objects
 *
 * @param attr  - variable with name of attribute,
 *                which embedded in each object
 */
function entropy(items, attr) {
    // counting number of occurrences of each of values
    // of attribute
    var counter = countUniqueValues(items, attr);

    var e = 0;
    var p;
    lang.forIn(counter, function (c) {
        p = c / items.length;
        e += -p * Math.log(p);
    });
    return e;
}

/**
 * Splitting array of objects by value of specific attribute,
 * using specific predicate and pivot.
 *
 * Items which matched by predicate will be copied to
 * the new array called 'match', and the rest of the items
 * will be copied to array with name 'notMatch'
 *
 * @param items - array of objects
 *
 * @param attr  - variable with name of attribute,
 *                which embedded in each object
 *
 * @param predicate - function(x, y)
 *                    which returns 'true' or 'false'
 *
 * @param pivot - used as the second argument when
 *                calling predicate function:
 *                e.g. predicate(item[attr], pivot)
 */
function split(items, attr, predicate, pivot) {
    var match = [];
    var notMatch = [];

    var attrValue;

    lang.each(items, function (item) {
        attrValue = item[attr];
        if (predicate(attrValue, pivot)) {
            match.push(item);
        } else {
            notMatch.push(item);
        }
    });
    return {
        match: match,
        notMatch: notMatch
    };
}

/**
 * Finding value of specific attribute which is most frequent
 * in given array of objects.
 *
 * @param items - array of objects
 *
 * @param attr  - variable with name of attribute,
 *                which embedded in each object
 */
function mostFrequentValue(items, attr) {
    // counting number of occurrences of each of values
    // of attribute
    var counter = countUniqueValues(items, attr);

    var mostFrequentCount = 0;
    var mostFrequentV;

    lang.forIn(counter, function (value, key) {
        if (value > mostFrequentCount) {
            mostFrequentCount = value;
            mostFrequentV = key;
        }
    });
    return mostFrequentV;
}

var predicates = {
    '==': function (a, b) {
        return a == b;
    },
    '>=': function (a, b) {
        return a >= b;
    }
};

/**
 * Function for building decision tree
 */
function buildDecisionTree(builder) {
    var trainingSet = builder.trainingSet;
    var minItemsCount = builder.minItemsCount;
    var categoryAttr = builder.categoryAttr;
    var entropyThrehold = builder.entropyThrehold;
    var maxTreeDepth = builder.maxTreeDepth;
    var ignoredAttributes = builder.ignoredAttributes;

    if ((maxTreeDepth === 0) || (trainingSet.length <= minItemsCount)) {
        // restriction by maximal depth of tree
        // or size of training set is to small
        // so we have to terminate process of building tree
        return {
            category: mostFrequentValue(trainingSet, categoryAttr)
        };
    }

    var initialEntropy = entropy(trainingSet, categoryAttr);

    if (initialEntropy <= entropyThrehold) {
        // entropy of training set too small
        // (it means that training set is almost homogeneous),
        // so we have to terminate process of building tree
        return {
            category: mostFrequentValue(trainingSet, categoryAttr)
        };
    }

    // used as hash-set for avoiding the checking of split by rules
    // with the same 'attribute-predicate-pivot' more than once
    var alreadyChecked = {};

    // this variable expected to contain rule, which splits training set
    // into subsets with smaller values of entropy (produces informational gain)
    var bestSplit = {gain: 0};

    for (var i = trainingSet.length - 1; i >= 0; i--) {
        var item = trainingSet[i];

        // iterating over all attributes of item
        for (var attr in item) {
            if ((attr == categoryAttr) || ignoredAttributes[attr]) {
                continue;
            }

            // let the value of current attribute be the pivot
            var pivot = item[attr];

            // pick the predicate
            // depending on the type of the attribute value
            var predicateName;
            if (typeof pivot == 'number') {
                predicateName = '>=';
            } else {
                // there is no sense to compare non-numeric attributes
                // so we will check only equality of such attributes
                predicateName = '==';
            }

            var attrPredPivot = attr + predicateName + pivot;
            if (alreadyChecked[attrPredPivot]) {
                // skip such pairs of 'attribute-predicate-pivot',
                // which been already checked
                continue;
            }
            alreadyChecked[attrPredPivot] = true;

            var predicate = predicates[predicateName];

            // splitting training set by given 'attribute-predicate-value'
            var currSplit = split(trainingSet, attr, predicate, pivot);

            // calculating entropy of subsets
            var matchEntropy = entropy(currSplit.match, categoryAttr);
            var notMatchEntropy = entropy(currSplit.notMatch, categoryAttr);

            // calculating informational gain
            var newEntropy = 0;
            newEntropy += matchEntropy * currSplit.match.length;
            newEntropy += notMatchEntropy * currSplit.notMatch.length;
            newEntropy /= trainingSet.length;
            var currGain = initialEntropy - newEntropy;

            if (currGain > bestSplit.gain) {
                // remember pairs 'attribute-predicate-value'
                // which provides informational gain
                bestSplit = currSplit;
                bestSplit.predicateName = predicateName;
                bestSplit.predicate = predicate;
                bestSplit.attribute = attr;
                bestSplit.pivot = pivot;
                bestSplit.gain = currGain;
            }
        }
    }

    if (!bestSplit.gain) {
        // can't find optimal split
        return {category: mostFrequentValue(trainingSet, categoryAttr)};
    }

    // building subtrees

    builder.maxTreeDepth = maxTreeDepth - 1;

    builder.trainingSet = bestSplit.match;
    var matchSubTree = buildDecisionTree(builder);

    builder.trainingSet = bestSplit.notMatch;
    var notMatchSubTree = buildDecisionTree(builder);

    return {
        attribute: bestSplit.attribute,
        predicate: bestSplit.predicate,
        predicateName: bestSplit.predicateName,
        pivot: bestSplit.pivot,
        match: matchSubTree,
        notMatch: notMatchSubTree,
        matchedCount: bestSplit.match.length,
        notMatchedCount: bestSplit.notMatch.length
    };
}

/**
 * Classifying item, using decision tree
 */
function predict(tree, item) {
    var attr,
        value,
        predicate,
        pivot;

    // Traversing tree from the root to leaf
    while (true) {
        if (tree.category) {
            // only leafs contains predicted category
            return tree.category;
        }

        attr = tree.attribute;
        value = item[attr];

        predicate = tree.predicate;
        pivot = tree.pivot;

        // move to one of subtrees
        if (predicate(value, pivot)) {
            tree = tree.match;
        } else {
            tree = tree.notMatch;
        }
    }
}

module.exports = DecisionTree;

},{"zero-lang":16,"zero-oop/declare":22}],2:[function(require,module,exports){
require('./visualizeID3');

},{"./visualizeID3":3}],3:[function(require,module,exports){
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

},{"./id3":1,"zero-colors/Color":4,"zero-crypto/uuid":6,"zero-dom/data":7,"zero-dom/event":8,"zero-dom/query":10,"zero-dom/style":11,"zero-fmt/sprintf":13,"zero-lang/array":14}],4:[function(require,module,exports){
'use strict';

/* jshint node: true, esnext: true, loopfunc: true, undef: true, unused: true */

var namedColor = require('./named');
var lang = require('zero-lang');
var declare = require('zero-oop/declare');

var round = Math.round;

function confine(c, low, high) {
    c = Number(c);
    return lang.isFinite(c) ? c < low ? low : c > high ? high : c : high;
}
function hue2rgb(m1, m2, h) {
    if (h < 0) {
        ++h;
    }
    if (h > 1) {
        --h;
    }
    var h6 = 6 * h;
    if (h6 < 1) {
        return m1 + (m2 - m1) * h6;
    }
    if (2 * h < 1) {
        return m2;
    }
    if (3 * h < 2) {
        return m1 + (m2 - m1) * (2 / 3 - h) * 6;
    }
    return m1;
}
function rgb2hsl(r, g, b, a) {
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h = undefined,
        s = undefined;
    var l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);break;
            case g:
                h = (b - r) / d + 2;break;
            case b:
                h = (r - g) / d + 4;break;
        }
        h /= 6;
    }
    return [h, s, l, a];
}

var Color = declare({
    // init props {
    r: 255,
    g: 255,
    b: 255,
    a: 1,
    // }
    constructor: function constructor( /*Array|String|Object*/color) {
        var me = this;
        if (color) {
            if (lang.isString(color)) {
                me = Color.fromString(color);
            } else if (lang.isArray(color)) {
                me = Color.fromArray(color, me);
            } else {
                me.set(color.r, color.g, color.b, color.a);
                if (!(color instanceof Color)) {
                    me.sanitize();
                }
            }
        }
        return me;
    },
    set: function set(r, g, b, a) {
        var me = this;
        me.r = r;
        me.g = g;
        me.b = b;
        me.a = a;
    },
    sanitize: function sanitize() {
        var me = this;
        me.r = round(confine(me.r, 0, 255));
        me.g = round(confine(me.g, 0, 255));
        me.b = round(confine(me.b, 0, 255));
        me.a = confine(me.a, 0, 1);
    },
    toRgba: function toRgba() {
        var me = this;
        return [me.r, me.g, me.b, me.a];
    },
    toHsla: function toHsla() {
        var me = this;
        return rgb2hsl(me.r, me.g, me.b, me.a);
    },
    toHex: function toHex() {
        var me = this;
        var arr = lang.map(['r', 'g', 'b'], function (x) {
            var str = me[x].toString(16);
            return str.length < 2 ? '0' + str : str;
        });
        return '#' + arr.join('');
    },
    toCss: function toCss( /*Boolean?*/includeAlpha) {
        var me = this;
        var rgb = me.r + ', ' + me.g + ', ' + me.b;
        return (includeAlpha ? 'rgba(' + rgb + ',' + me.a : 'rgb(' + rgb) + ')';
    },
    toString: function toString() {
        return this.toCss(true);
    },
    toGrey: function toGrey() {
        var me = this;
        var g = round((me.r + me.g + me.b) / 3);
        return Color.makeGrey(g, me.a);
    },
    destroy: function destroy() {
        lang.destroy(this);
    }
});

lang.extend(Color, {
    hexByName: namedColor,

    makeGrey: function makeGrey( /*Number*/g, /*Number?*/a) {
        return Color.fromArray([g, g, g, a]);
    },

    blendColors: function blendColors( /*Color*/start, /*Color*/end, /*Number*/weight, /*Color?*/obj) {
        var t = obj || new Color();
        lang.each(['r', 'g', 'b', 'a'], function (x) {
            t[x] = start[x] + (end[x] - start[x]) * weight;
            if (x !== 'a') {
                t[x] = Math.round(t[x]);
            }
        });
        return t.sanitize();
    },

    fromHex: function fromHex( /*String*/color) {
        var result = new Color();
        var bits = color.length === 4 ? 4 : 8;
        var mask = (1 << bits) - 1;

        color = Number('0x' + color.substr(1));

        if (lang.isNaN(color)) {
            return null;
        }
        lang.each(['b', 'g', 'r'], function (x) {
            var c = color & mask;
            color >>= bits;
            result[x] = bits === 4 ? 17 * c : c;
        });
        return result;
    },
    fromRgb: function fromRgb( /*String*/color) {
        var matches = lang.lc(color).match(/^rgba?\(([\s\.,0-9]+)\)/);
        return matches && Color.fromArray(matches[1].split(/\s*,\s*/));
    },
    fromHsl: function fromHsl( /*String*/color) {
        var matches = lang.lc(color).match(/^hsla?\(([\s\.,0-9]+)\)/);
        if (matches) {
            var c = matches[2].split(/\s*,\s*/);
            var l = c.length;
            var H = (parseFloat(c[0]) % 360 + 360) % 360 / 360;
            var S = parseFloat(c[1]) / 100;
            var L = parseFloat(c[2]) / 100;
            var m2 = L <= 0.5 ? L * (S + 1) : L + S - L * S;
            var m1 = 2 * L - m2;
            var a = [hue2rgb(m1, m2, H + 1 / 3) * 256, hue2rgb(m1, m2, H) * 256, hue2rgb(m1, m2, H - 1 / 3) * 256, 1];
            if (l === 4) {
                a[3] = c[3];
            }
            return Color.fromArray(a);
        }
    },
    fromArray: function fromArray( /*Array*/arr) {
        var result = new Color();
        result.set(Number(arr[0]), Number(arr[1]), Number(arr[2]), Number(arr[3]));
        if (lang.isNaN(result.a)) {
            result.a = 1;
        }
        return result.sanitize();
    },
    fromString: function fromString( /*String*/str) {
        var s = Color.hexByName[str];
        return s && Color.fromHex(s) || Color.fromRgb(str) || Color.fromHex(str) || Color.fromHsl(str);
    }
});

module.exports = Color;
},{"./named":5,"zero-lang":16,"zero-oop/declare":22}],5:[function(require,module,exports){
"use strict";

/* jshint esnext: true, loopfunc: true */

module.exports = {
    "aliceblue": "#f0f8ff",
    "antiquewhite": "#faebd7",
    "aqua": "#00ffff",
    "aquamarine": "#7fffd4",
    "azure": "#f0ffff",
    "beige": "#f5f5dc",
    "bisque": "#ffe4c4",
    "black": "#000000",
    "blanchedalmond": "#ffebcd",
    "blue": "#0000ff",
    "blueviolet": "#8a2be2",
    "brown": "#a52a2a",
    "burlywood": "#deb887",
    "burntsienna": "#ea7e5d",
    "cadetblue": "#5f9ea0",
    "chartreuse": "#7fff00",
    "chocolate": "#d2691e",
    "coral": "#ff7f50",
    "cornflowerblue": "#6495ed",
    "cornsilk": "#fff8dc",
    "crimson": "#dc143c",
    "cyan": "#00ffff",
    "darkblue": "#00008b",
    "darkcyan": "#008b8b",
    "darkgoldenrod": "#b8860b",
    "darkgray": "#a9a9a9",
    "darkgreen": "#006400",
    "darkgrey": "#a9a9a9",
    "darkkhaki": "#bdb76b",
    "darkmagenta": "#8b008b",
    "darkolivegreen": "#556b2f",
    "darkorange": "#ff8c00",
    "darkorchid": "#9932cc",
    "darkred": "#8b0000",
    "darksalmon": "#e9967a",
    "darkseagreen": "#8fbc8f",
    "darkslateblue": "#483d8b",
    "darkslategray": "#2f4f4f",
    "darkslategrey": "#2f4f4f",
    "darkturquoise": "#00ced1",
    "darkviolet": "#9400d3",
    "deeppink": "#ff1493",
    "deepskyblue": "#00bfff",
    "dimgray": "#696969",
    "dimgrey": "#696969",
    "dodgerblue": "#1e90ff",
    "firebrick": "#b22222",
    "floralwhite": "#fffaf0",
    "forestgreen": "#228b22",
    "fuchsia": "#ff00ff",
    "gainsboro": "#dcdcdc",
    "ghostwhite": "#f8f8ff",
    "gold": "#ffd700",
    "goldenrod": "#daa520",
    "gray": "#808080",
    "green": "#008000",
    "greenyellow": "#adff2f",
    "grey": "#808080",
    "honeydew": "#f0fff0",
    "hotpink": "#ff69b4",
    "indianred": "#cd5c5c",
    "indigo": "#4b0082",
    "ivory": "#fffff0",
    "khaki": "#f0e68c",
    "lavender": "#e6e6fa",
    "lavenderblush": "#fff0f5",
    "lawngreen": "#7cfc00",
    "lemonchiffon": "#fffacd",
    "lightblue": "#add8e6",
    "lightcoral": "#f08080",
    "lightcyan": "#e0ffff",
    "lightgoldenrodyellow": "#fafad2",
    "lightgray": "#d3d3d3",
    "lightgreen": "#90ee90",
    "lightgrey": "#d3d3d3",
    "lightpink": "#ffb6c1",
    "lightsalmon": "#ffa07a",
    "lightseagreen": "#20b2aa",
    "lightskyblue": "#87cefa",
    "lightslategray": "#778899",
    "lightslategrey": "#778899",
    "lightsteelblue": "#b0c4de",
    "lightyellow": "#ffffe0",
    "lime": "#00ff00",
    "limegreen": "#32cd32",
    "linen": "#faf0e6",
    "magenta": "#ff00ff",
    "maroon": "#800000",
    "mediumaquamarine": "#66cdaa",
    "mediumblue": "#0000cd",
    "mediumorchid": "#ba55d3",
    "mediumpurple": "#9370db",
    "mediumseagreen": "#3cb371",
    "mediumslateblue": "#7b68ee",
    "mediumspringgreen": "#00fa9a",
    "mediumturquoise": "#48d1cc",
    "mediumvioletred": "#c71585",
    "midnightblue": "#191970",
    "mintcream": "#f5fffa",
    "mistyrose": "#ffe4e1",
    "moccasin": "#ffe4b5",
    "navajowhite": "#ffdead",
    "navy": "#000080",
    "oldlace": "#fdf5e6",
    "olive": "#808000",
    "olivedrab": "#6b8e23",
    "orange": "#ffa500",
    "orangered": "#ff4500",
    "orchid": "#da70d6",
    "palegoldenrod": "#eee8aa",
    "palegreen": "#98fb98",
    "paleturquoise": "#afeeee",
    "palevioletred": "#db7093",
    "papayawhip": "#ffefd5",
    "peachpuff": "#ffdab9",
    "peru": "#cd853f",
    "pink": "#ffc0cb",
    "plum": "#dda0dd",
    "powderblue": "#b0e0e6",
    "purple": "#800080",
    "rebeccapurple": "#663399",
    "red": "#ff0000",
    "rosybrown": "#bc8f8f",
    "royalblue": "#4169e1",
    "saddlebrown": "#8b4513",
    "salmon": "#fa8072",
    "sandybrown": "#f4a460",
    "seagreen": "#2e8b57",
    "seashell": "#fff5ee",
    "sienna": "#a0522d",
    "silver": "#c0c0c0",
    "skyblue": "#87ceeb",
    "slateblue": "#6a5acd",
    "slategray": "#708090",
    "slategrey": "#708090",
    "snow": "#fffafa",
    "springgreen": "#00ff7f",
    "steelblue": "#4682b4",
    "tan": "#d2b48c",
    "teal": "#008080",
    "thistle": "#d8bfd8",
    "tomato": "#ff6347",
    "turquoise": "#40e0d0",
    "violet": "#ee82ee",
    "wheat": "#f5deb3",
    "white": "#ffffff",
    "whitesmoke": "#f5f5f5",
    "yellow": "#ffff00",
    "yellowgreen": "#9acd32"
};
},{}],6:[function(require,module,exports){
'use strict';

/* jshint esnext: true, loopfunc: true */

module.exports = function () {
    var prefix = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];
    return prefix + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c === 'x' ? r : r & 0x3 | 0x8,
            result = v.toString(16);
        return result;
    });
};
},{}],7:[function(require,module,exports){
'use strict';

/* jshint node: true, esnext: true, loopfunc: true, undef: true, unused: true */
///* global */

var domUtils = require('./utils');
var domQuery = require('./query');

var queryOne = domQuery.one;

/*
 * @author: 绝云（wensen.lws）
 * @description: dom dataSet related
 * @note: if DataSet is supported, use DataSet
 */

var dataSetStr = 'dataset';
var dataPrefix = 'data-';

function toDashed(name) {
    return name.replace(/([A-Z])/g, function (u) {
        return '-' + u.toLowerCase();
    });
}

var dataset = domUtils.hasDataSet ? {
    set: function set(node, attr, value) {
        node = queryOne(node);
        node[dataSetStr][attr] = value;
    },
    get: function get(node, attr) {
        node = queryOne(node);
        return node[dataSetStr][attr];
    },
    remove: function remove(node, attr) {
        node = queryOne(node);
        delete node[dataSetStr][attr];
    }
} : {
    set: function set(node, attr, value) {
        node = queryOne(node);
        node.setAttribute(dataPrefix + toDashed(attr), value);
    },
    get: function get(node, attr) {
        node = queryOne(node);
        return node.getAttribute(dataPrefix + toDashed(attr));
    },
    remove: function remove(node, attr) {
        node = queryOne(node);
        node.removeAttribute(dataPrefix + toDashed(attr));
    }

};

module.exports = dataset;
},{"./query":10,"./utils":12}],8:[function(require,module,exports){
'use strict';

/* jshint node: true, esnext: true, loopfunc: true, undef: true, unused: true */
/* global document, window */

/*
 * @author: 绝云（wensen.lws）
 * @description: event firing
 * @reference: http://dean.edwards.name/weblog/2005/10/add-event/
 */

var checkType = require('zero-lang/type');
var domQuery = require('./query');
var domUtils = require('./utils');

var doc = document;
var win = window;

function addEvent(element, type, handler) {
    element = domQuery.one(element);
    if (element.addEventListener) {
        element.addEventListener(type, handler, false);
    } else {
        // assign each event handler a unique ID
        if (!handler.$$guid) {
            handler.$$guid = addEvent.guid++;
        }
        // create a hash table of event types for the element
        if (!element.events) {
            element.events = {};
        }
        // create a hash table of event handlers for each element/event pair
        var handlers = element.events[type];
        if (!handlers) {
            handlers = element.events[type] = {};
            // store the existing event handler (if there is one)
            if (element['on' + type]) {
                handlers[0] = element["on" + type];
            }
        }
        // store the event handler in the hash table
        handlers[handler.$$guid] = handler;
        // assign a global event handler to do all the work
        element['on' + type] = handleEvent;
    }
}
// a counter used to create unique IDs
addEvent.guid = 1;

function removeEvent(element, type, handler) {
    var delegateWrapper = handler._delegateWrapper;
    element = domQuery.one(element);
    if (element.removeEventListener) {
        element.removeEventListener(type, handler, false);
        element.removeEventListener(type, delegateWrapper, false);
    } else {
        // delete the event handler from the hash table
        if (element.events && element.events[type]) {
            delete element.events[type][handler.$$guid];
            delete element.events[type][delegateWrapper.$$guid];
        }
    }
}

function handleEvent(event) {
    /* jshint validthis:true */
    var returnValue = true;
    var elem = this;
    // grab the event object (IE uses a global event object)
    event = event || fixEvent((doc.parentWindow || win).event);
    // get a reference to the hash table of event handlers
    var handlers = elem.events[event.type];
    // execute each event handler
    for (var i in handlers) {
        elem.$$handleEvent = handlers[i];
        if (elem.$$handleEvent(event) === false) {
            returnValue = false;
        }
    }
    return returnValue;
}

function fixEvent(event) {
    // add W3C standard event methods
    event.preventDefault = fixEvent.preventDefault;
    event.stopPropagation = fixEvent.stopPropagation;
    return event;
}
fixEvent.preventDefault = function () {
    this.returnValue = false;
};
fixEvent.stopPropagation = function () {
    this.cancelBubble = true;
};

function delegate(element, type, selector, handler, capture, once) {
    if (checkType.isFunction(selector)) {
        addEvent(element, type, selector);
        return;
    }
    element = domQuery.one(element); // delegation is only for one element
    if (!domUtils.isDomNode(element)) {
        throw 'cannot bind events to non-elements: ' + element;
    }
    function wrapper(e) {
        // if this event has a delegateTarget, then we add it to the event
        // object (so that handlers may have a reference to the delegator
        // element) and fire the callback
        /*jshint -W084 */
        if (e.delegateTarget = _getDelegateTarget(element, e.target, selector)) {
            if (once === true) {
                removeEvent(element, type, wrapper);
            }
            handler.call(element, e);
        }
    }
    handler._delegateWrapper = wrapper;
    addEvent(element, type, wrapper, capture || false);
    return handler;
}
function _getDelegateTarget(element, target, selector) {
    while (target && target !== element) {
        if (domQuery.match(target, selector)) {
            return target;
        }
        target = target.parentElement;
    }
    return null;
}

function once(element, type, selector, callback, capture) {
    delegate(element, type, selector, callback, capture, true);
}

module.exports = {
    on: delegate,
    off: removeEvent,
    once: once
};
},{"./query":10,"./utils":12,"zero-lang/type":20}],9:[function(require,module,exports){
'use strict';

/* jshint node: true, esnext: true, loopfunc: true, undef: true, unused: true */
/* global window, location, navigator, ActiveXObject */

var lang = require('zero-lang');

/*
 * @author      : 绝云 (wensen.lws@alibaba-inc.com)
 * @description : 记录各种浏览器相关的版本号
 * @note        : browser only
 */
var nav = navigator || {};
var userAgent = nav.userAgent;
var platform = nav.platform;
var plugins = nav.plugins;
var versions = {};
var detectedPlatform = undefined;
var detectedPlugins = undefined;

function setVerInt(versions, key, strVal) {
    versions[key] = lang.toInteger(strVal);
}
function setVer(versions, str, reg) {
    var matched = str.match(reg);
    if (matched) {
        setVerInt(versions, matched[0].match(/\w*/)[0], matched[1] || 0);
    }
}
function detectPlatform(str) {
    /*
     * @description : detect platform
     * @param       : {string} platformStr, platform defined string.
     * @syntax      : detectPlatform(platformStr)
     * @return      : {string} platform. (mac|windows|linux...)
     */
    if (!str) {
        return;
    }
    var result = lang.lc(str).match(/mac|win|linux|ipad|ipod|iphone|android/);
    return lang.isArray(result) ? result[0] : result;
}
function detectPlugin(arr) {
    /*
     * @description : detect plugins (now flash only)
     * @param       : {array } plugins, plugin list
     * @syntax      : detectPlugin(plugins)
     * @return      : {object} { 'flash' : 0|xx }
     */

    return {
        flash: (function () {
            var flash = undefined,
                v = 0,
                startV = 13;
            if (arr && arr.length) {
                flash = arr['Shockwave Flash'];
                if (flash && flash.description) {
                    v = flash.description.match(/\b(\d+)\.\d+\b/)[1] || v;
                }
            } else {
                while (startV--) {
                    try {
                        new ActiveXObject('ShockwaveFlash.ShockwaveFlash.' + startV);
                        v = startV;
                        break;
                    } catch (e) {}
                }
            }
            return lang.toInteger(v);
        })()
    };
}
function detectVersion(str) {
    /*
     * @description : detect versions
     * @param       : {string} userAgent, window.navigator.userAgent
     * @syntax      : detectVerion(userAgent)
     * @return      : {object} { 'flash' : 0|xx }
     */

    if (!str) {
        return;
    }
    str = lang.lc(str);
    var ieVer = undefined;
    var matched = undefined;
    var result = {};

    // browser result {
    lang.each([/msie ([\d.]+)/, /firefox\/([\d.]+)/, /chrome\/([\d.]+)/, /crios\/([\d.]+)/, /opera.([\d.]+)/, /adobeair\/([\d.]+)/], function (reg) {
        setVer(result, str, reg);
    });
    // }
    // chrome {
    if (result.crios) {
        result.chrome = result.crios;
    }
    // }
    // safari {
    matched = str.match(/version\/([\d.]+).*safari/);
    if (matched) {
        setVerInt(result, 'safari', matched[1] || 0);
    }
    // }
    // safari mobile {
    matched = str.match(/version\/([\d.]+).*mobile.*safari/);
    if (matched) {
        setVerInt(result, 'mobilesafari', matched[1] || 0);
    }
    // }
    // engine result {
    lang.each([/trident\/([\d.]+)/, /gecko\/([\d.]+)/, /applewebkit\/([\d.]+)/, /webkit\/([\d.]+)/, // 单独存储 webkit 字段
    /presto\/([\d.]+)/], function (reg) {
        setVer(result, str, reg);
    });
    // IE {
    ieVer = result.msie;
    if (ieVer === 6) {
        result.trident = 4;
    } else if (ieVer === 7 || ieVer === 8) {
        result.trident = 5;
    }
    // }
    // }
    return result;
}

detectedPlugins = detectPlugin(plugins);
detectedPlatform = detectPlatform(platform) || detectPlatform(userAgent) || 'unknown';

lang.extend(versions, detectVersion(userAgent), detectedPlugins);

module.exports = {
    host: location.host,
    platform: detectPlatform,
    plugins: detectedPlugins,
    userAgent: userAgent,
    versions: versions,
    isWebkit: !!versions.webkit,
    isIE: !!versions.msie,
    isOpera: !!window.opera,
    isApple: detectedPlatform.mac || detectedPlatform.ipad || detectedPlatform.ipod || detectedPlatform.iphone
};
},{"zero-lang":16}],10:[function(require,module,exports){
'use strict';

/* jshint node: true, esnext: true, loopfunc: true, undef: true, unused: true */
/* global document, window */

var arrayUtils = require('zero-lang/array');
var isArrayLike = arrayUtils.isArrayLike;
var contains = arrayUtils.contains;
var toArray = arrayUtils.toArray;
var some = arrayUtils.some;
var flatten = arrayUtils.flatten;

var checkType = require('zero-lang/type');
var isString = checkType.isString;

var domUtils = require('./utils');
var testDiv = domUtils.testDiv;
var isDomNode = domUtils.isDomNode;

/*
 * @author      : 绝云（wensen.lws）
 * @description : selector
 * @note        : browser only
 * @note        : MODERN browsers only
 */

var doc = document;
var win = window;
var nodeTypeStr = 'nodeType';
var re_quick = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/; // 匹配快速选择器
var matchesSelector = testDiv.matches || testDiv.webkitMatchesSelector || testDiv.mozMatchesSelector || testDiv.msMatchesSelector || testDiv.oMatchesSelector;
var hasMatchesSelector = matchesSelector && matchesSelector.call(testDiv, 'div');

function normalizeRoot(root) {
    if (!root) {
        return doc;
    }
    if (isString(root)) {
        return query(root)[0];
    }
    if (!root[nodeTypeStr] && isArrayLike(root)) {
        return root[0];
    }
    return root;
}
function query(selector, optRoot) {
    /*
     * description: 选择器
     */
    var root = normalizeRoot(optRoot);
    var match = undefined;

    if (!root || !selector) {
        return [];
    }
    if (selector === win || isDomNode(selector)) {
        return !optRoot || selector !== win && isDomNode(root) && contains(selector, root) ? [selector] : [];
    }
    if (selector.nodeType === 11) {
        // document fragment
        return toArray(selector.childNodes);
    }
    if (selector && isArrayLike(selector)) {
        return flatten(selector);
    }

    // 简单查询使用快速查询方法 {
    if (isString(selector) && (match = re_quick.exec(selector))) {
        if (match[1]) {
            return [root.getElementById(match[1])];
        } else if (match[2]) {
            return toArray(root.getElementsByTagName(match[2]));
        } else if (match[3]) {
            return toArray(root.getElementsByClassName(match[3]));
        }
    }
    // }
    if (selector && (selector.document || selector[nodeTypeStr] && selector[nodeTypeStr] === 9)) {
        return !optRoot ? [selector] : [];
    }
    return toArray(root.querySelectorAll(selector));
}
function queryOne(selector, optRoot) {
    return query(selector, optRoot)[0];
}

function match(element, selector) {
    /*
     * @matches selector
     */
    if (hasMatchesSelector) {
        return matchesSelector.call(element, selector);
    }
    var parentElem = element.parentNode;
    var nodes = undefined;

    // if the element is an orphan, and the browser doesn't support matching
    // orphans, append it to a documentFragment
    if (!parentElem && !hasMatchesSelector) {
        parentElem = document.createDocumentFragment();
        parentElem.appendChild(element);
    }
    // from the parent element's context, get all nodes that match the selector
    nodes = query(selector, parentElem);

    // since support for `matches()` is missing, we need to check to see if
    // any of the nodes returned by our query match the given element
    return some(nodes, function (node) {
        return node === element;
    });
}

module.exports = {
    all: query,
    one: queryOne,
    match: match
};
},{"./utils":12,"zero-lang/array":14,"zero-lang/type":20}],11:[function(require,module,exports){
'use strict';

/* jshint node: true, esnext: true, loopfunc: true, undef: true, unused: true */
///* global */

/*
 * @author: 绝云（wensen.lws）
 * @description: dom style
 */
var arrayUtils = require('zero-lang/array');
var stringUtils = require('zero-lang/string');
var bomUtils = require('zero-bom/utils');

var domData = require('./data');
var domUtils = require('./utils');
var domQuery = require('./query');

var ieVersion = bomUtils.versions.msie || 0;
var astr = 'DXImageTransform.Microsoft.Alpha';
var RE_pixel = /margin|padding|width|height|max|min|offset/; // |border
var pixelNamesCache = {
    left: true,
    top: true
};
var floatAlias = {
    cssFloat: 1,
    styleFloat: 1,
    'float': 1
};

var getComputedStyle = undefined;
var toPixel = undefined;
var domStyle = undefined;
var getOpacity = undefined;
var _setOpacity = undefined;

function af(n, f) {
    try {
        return n.filters.item(astr);
    } catch (e) {
        return f ? {} : null;
    }
}
function isHidden(element) {
    return domStyle.get(element, 'display') === 'none' || domUtils.contains(element.ownerDocument, element);
}
function showHide(elements, show) {
    var display = undefined,
        hidden = undefined;
    var values = [];

    arrayUtils.each(elements, function (elem, index) {
        if (elem.style) {
            values[index] = domData.get(elem, 'olddisplay');
            display = elem.style.display;
            if (show) {
                // Reset the inline display of this element to learn if it is
                // being hidden by cascaded rules or not
                if (!values[index] && display === 'none') {
                    elem.style.display = '';
                }

                // Set elements which have been overridden with display: none
                // in a stylesheet to whatever the default browser style is
                // for such an element
                if (elem.style.display === '' && isHidden(elem)) {
                    values[index] = domData.set(elem, 'olddisplay', domStyle.get(elem, 'display'));
                }
            } else {
                hidden = isHidden(elem);

                if (display !== 'none' || !hidden) {
                    domData.set(elem, 'olddisplay', hidden ? display : domStyle.get(elem, 'display'));
                }
            }
        }
    });

    // Set the display of most of the elements in a second loop
    // to avoid the constant reflow
    arrayUtils.each(elements, function (elem, index) {
        if (elem.style) {
            if (!show || elem.style.display === 'none' || elem.style.display === '') {
                elem.style.display = show ? values[index] || '' : 'none';
            }
        }
    });
    return elements;
}
function toStyleValue(node, type, value) {
    type = stringUtils.lc(type);
    if (ieVersion || bomUtils.versions.trident) {
        if (value === 'auto') {
            if (type === 'height') {
                return node.offsetHeight;
            }
            if (type === 'width') {
                return node.offsetWidth;
            }
        }
        if (type === 'fontweight') {
            switch (value) {
                case 700:
                    return 'bold';
                // case 400:
                default:
                    return 'normal';
            }
        }
    }
    if (!(type in pixelNamesCache)) {
        pixelNamesCache[type] = RE_pixel.test(type);
    }
    return pixelNamesCache[type] ? toPixel(node, value) : value;
}

if (ieVersion && (ieVersion < 9 || ieVersion < 10 && bomUtils.isQuirks)) {
    getOpacity = function getOpacity(node) {
        try {
            return af(node).Opacity / 100; // Number
        } catch (e) {
            return 1; // Number
        }
    };
    _setOpacity = function setOpacity( /*DomNode*/node, /*Number*/opacity) {
        if (opacity === '') {
            opacity = 1;
        }
        var ov = opacity * 100;
        var fullyOpaque = opacity === 1;

        // on IE7 Alpha(Filter opacity=100) makes text look fuzzy so disable it altogether (bug #2661),
        // but still update the opacity value so we can get a correct reading if it is read later:
        // af(node, 1).Enabled = !fullyOpaque;
        if (fullyOpaque) {
            node.style.zoom = '';
            if (af(node)) {
                node.style.filter = node.style.filter.replace(new RegExp('\\s*progid:' + astr + '\\([^\\)]+?\\)', 'i'), '');
            }
        } else {
            node.style.zoom = 1;
            if (af(node)) {
                af(node, 1).Opacity = ov;
            } else {
                node.style.filter += ' progid:' + astr + '(Opacity=' + ov + ')';
            }
            af(node, 1).Enabled = true;
        }

        if (node.tagName.toLowerCase() === 'tr') {
            for (var td = node.firstChild; td; td = td.nextSibling) {
                if (td.tagName.toLowerCase() === 'td') {
                    _setOpacity(td, opacity);
                }
            }
        }
        return opacity;
    };
} else {
    getOpacity = function getOpacity(node) {
        return getComputedStyle(node).opacity;
    };
    _setOpacity = function _setOpacity(node, opacity) {
        node.style.opacity = opacity;
        return opacity;
    };
}

// getComputedStyle {
if (bomUtils.isWebkit) {
    getComputedStyle = function getComputedStyle(node) {
        var style = undefined;
        if (node.nodeType === 1) {
            var dv = node.ownerDocument.defaultView;
            var oldDisplay = undefined;
            style = dv.getComputedStyle(node, null);
            if (!style && node.style) {
                /*
                 * early version safari (2.0?) has this bug: when element is display:none,
                 * getComputedStyle returns null
                 */
                oldDisplay = node.style.display;
                node.style.display = '';
                style = dv.getComputedStyle(node, null);
            }
            node.style.display = oldDisplay; // and we should change it back.
        }
        return style || {};
    };
} else if (ieVersion && ieVersion < 9 || bomUtils.isQuirks) {
    getComputedStyle = function getComputedStyle(node) {
        return node.nodeType === 1 && node.currentStyle ? node.currentStyle : {};
    };
} else {
    getComputedStyle = function getComputedStyle(node) {
        return node.nodeType === 1 ? node.ownerDocument.defaultView.getComputedStyle(node, null) : {};
    };
}
// }
// toPixel {
if (ieVersion) {
    toPixel = function toPixel(element, avalue) {
        if (!avalue) {
            return 0;
        }
        // on IE7, medium is usually 4 pixels
        if (avalue === 'medium') {
            return 4;
        }
        // style values can be floats, client code may
        // want to round this value for integer pixels.
        if (avalue.slice && avalue.slice(-2) === 'px') {
            return parseFloat(avalue);
        }
        var s = element.style;
        var rs = element.runtimeStyle;
        var cs = element.currentStyle;
        var sLeft = s.left;
        var rsLeft = rs.left;
        rs.left = cs.left;
        try {
            // 'avalue' may be incompatible with style.left, which can cause IE to throw
            // this has been observed for border widths using 'thin', 'medium', 'thick' constants
            // those particular constants could be trapped by a lookup
            // but perhaps there are more
            s.left = avalue;
            avalue = s.pixelLeft;
        } catch (e) {
            avalue = 0;
        }
        s.left = sLeft;
        rs.left = rsLeft;
        return avalue;
    };
} else {
    toPixel = function toPixel(element, value) {
        return parseFloat(value) || 0;
    };
}
// }

domStyle = {
    getComputedStyle: getComputedStyle,
    toPixel: toPixel,

    get: function get(node, name) {
        var n = domQuery.one(node);
        var l = arguments.length;
        var op = name === 'opacity';
        var style = undefined;
        if (l === 2 && op) {
            return getOpacity(n);
        }
        name = floatAlias[name] ? 'cssFloat' in n.style ? 'cssFloat' : 'styleFloat' : name;
        style = domStyle.getComputedStyle(n);
        return l === 1 ? style : toStyleValue(n, name, style[name] || n.style[name]);
    },
    set: function set(node, name, value) {
        var n = domQuery.one(node);
        var l = arguments.length;
        var op = name === 'opacity';

        name = floatAlias[name] ? 'cssFloat' in n.style ? 'cssFloat' : 'styleFloat' : name;
        if (l === 3) {
            return op ? _setOpacity(n, value) : n.style[name] = value;
        }
        for (var x in name) {
            domStyle.set(node, x, name[x]);
        }
        return domStyle.getComputedStyle(n);
    },

    // TODO use animation-version instead
    show: function show(node) {
        showHide(domQuery.all(node), true);
    },
    hide: function hide(node) {
        showHide(domQuery.all(node), false);
    },
    toggle: function toggle(node) {
        return domStyle.get(node, 'display') === 'none' ? domStyle.show(node) : domStyle.hide(node);
    }
};

module.exports = domStyle;
},{"./data":7,"./query":10,"./utils":12,"zero-bom/utils":9,"zero-lang/array":14,"zero-lang/string":19}],12:[function(require,module,exports){
'use strict';

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

/* jshint node: true, esnext: true, loopfunc: true, undef: true, unused: true */
/* global document, window */

var stringUtils = require('zero-lang/string');

var doc = document;
var html = doc.documentElement;
var testDiv = doc.createElement('div');

module.exports = {
    hasTextContent: 'textContent' in testDiv,
    hasClassList: 'classList' in testDiv,
    hasDataSet: 'dataset' in testDiv,
    canDnD: 'draggable' in testDiv,
    isQuirks: stringUtils.lc(doc.compatMode) === 'backcompat' || doc.documentMode === 5, // 怪异模式
    testDiv: testDiv,
    contains: 'compareDocumentPosition' in html ? function (element, container) {
        return (container.compareDocumentPosition(element) & 16) === 16;
    } : function (element, container) {
        container = container === doc || container === window ? html : container;
        return container !== element && container.contains(element);
    },
    isDomNode: function isDomNode(element) {
        var t = element.nodeType;
        return element && (typeof element === 'undefined' ? 'undefined' : _typeof(element)) === 'object' && (t === 1 || t === 9);
    }
};
},{"zero-lang/string":19}],13:[function(require,module,exports){
'use strict';

/* jshint node: true, esnext: true, loopfunc: true, undef: true, unused: true, boss: true */

var lang = require('zero-lang');
var abs = Math.abs;

module.exports = function (format) {
    if (!lang.isString(format)) {
        throw 'sprintf: The first arguments need to be a valid format string.';
    }

    var reg = /%(\+)?([0 ]|'(.))?(-)?([0-9]+)?(\.([0-9]+))?([%bcdfosxX])/g;
    var part = undefined;
    var parts = [];
    var paramIndex = 1;
    var args = lang.toArray(arguments);

    while (part = reg.exec(format)) {
        if (paramIndex >= args.length && part[8] !== '%') {
            throw 'sprintf: At least one argument was missing.';
        }

        parts[parts.length] = {
            begin: part.index,
            end: part.index + part[0].length,
            sign: part[1] === '+',
            negative: parseFloat(args[paramIndex]) < 0 ? true : false,
            padding: lang.isUndefined(part[2]) ? ' ' : part[2].substring(0, 1) === "'" ? part[3] : part[2],
            alignLeft: part[4] === '-',
            width: !lang.isUndefined(part[5]) ? part[5] : false,
            precision: !lang.isUndefined(part[7]) ? part[7] : false,
            type: part[8],
            data: part[8] !== '%' ? String(args[paramIndex++]) : false
        };
    }

    var i,
        j,
        preSubStr,
        origLength,
        newString = '',
        start = 0;

    for (i = 0; i < parts.length; i++) {
        newString += format.substring(start, parts[i].begin);

        start = parts[i].end;

        preSubStr = '';
        switch (parts[i].type) {
            case '%':
                preSubStr = '%';
                break;
            case 'b':
                preSubStr = abs(lang.toInteger(parts[i].data)).toString(2);
                break;
            case 'c':
                preSubStr = String.fromCharCode(abs(lang.toInteger(parts[i].data)));
                break;
            case 'd':
                preSubStr = String(abs(lang.toInteger(parts[i].data)));
                break;
            case 'f':
                preSubStr = parts[i].precision === false ? String(abs(parseFloat(parts[i].data))) : abs(parseFloat(parts[i].data)).toFixed(parts[i].precision);
                break;
            case 'o':
                preSubStr = abs(lang.toInteger(parts[i].data)).toString(8);
                break;
            case 's':
                preSubStr = parts[i].data.substring(0, parts[i].precision ? parts[i].precision : parts[i].data.length);
                break;
            case 'x':
                preSubStr = lang.lc(abs(lang.toInteger(parts[i].data)).toString(16));
                break;
            case 'X':
                preSubStr = lang.uc(abs(lang.toInteger(parts[i].data)).toString(16));
                break;
            default:
                throw 'sprintf: Unknown type "' + parts[i].type + '" detected. This should never happen. Maybe the regex is wrong.';
        }

        if (parts[i].type === '%') {
            newString += preSubStr;
            continue;
        }

        if (parts[i].width !== false) {
            if (parts[i].width > preSubStr.length) {
                origLength = preSubStr.length;
                for (j = 0; j < parts[i].width - origLength; ++j) {
                    preSubStr = parts[i].alignLeft === true ? preSubStr + parts[i].padding : parts[i].padding + preSubStr;
                }
            }
        }

        /*jshint -W083 */ // make function in loop
        if (lang.some(['b', 'd', 'o', 'f', 'x', 'X'], function (type) {
            return type === parts[i].type;
        })) {
            if (parts[i].negative === true) {
                preSubStr = '-' + preSubStr;
            } else if (parts[i].sign === true) {
                preSubStr = '+' + preSubStr;
            }
        }
        newString += preSubStr;
    }

    newString += format.substring(start, format.length);
    return newString;
};
},{"zero-lang":16}],14:[function(require,module,exports){
'use strict';

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

/* jshint esnext: true, loopfunc: true */

var checkType = require('./type');
var numberUtils = require('./number');

var isArray = checkType.isArray;
var AP = Array.prototype;
var slice = AP.slice;

function isArrayLike(arr) {
    return (typeof arr === 'undefined' ? 'undefined' : _typeof(arr)) === 'object' && numberUtils.isFinite(arr.length);
}
function toArray(arr) {
    return isArrayLike(arr) ? slice.call(arr) : [];
}

function arrayFromSecondElement(arr) {
    return slice.call(arr, 1);
}
function applyNativeFunction(nativeFunction, target, args) {
    return nativeFunction.apply(target, arrayFromSecondElement(args));
}

// index
var index = function index(up) {
    return function (arr, searchElement, fromIndex) {
        var i = undefined;
        var len = arr.length >>> 0;
        if (len === 0) {
            return -1;
        }
        if (!fromIndex) {
            fromIndex = up ? 0 : arr.length;
        } else if (fromIndex < 0) {
            fromIndex = Math.max(0, arr.length + fromIndex);
        }
        if (up) {
            for (i = fromIndex; i < arr.length; i++) {
                if (arr[i] === searchElement) {
                    return i;
                }
            }
        } else {
            for (i = fromIndex; i >= 0; i--) {
                if (arr[i] === searchElement) {
                    return i;
                }
            }
        }
        return -1;
    };
};
var indexOf = AP.indexOf ? function (arr) {
    return applyNativeFunction(AP.indexOf, arr, arguments);
} : index(true);
var lastIndexOf = AP.lastIndexOf ? function (arr) {
    return applyNativeFunction(AP.lastIndexOf, arr, arguments);
} : index();

// each
var each = AP.forEach ? function (arr, callback, thisObj) {
    applyNativeFunction(AP.forEach, arr, arguments);
} : function (arr, callback, thisObj) {
    var a = toArray(arr);
    for (var i = 0; i < a.length; i++) {
        callback.call(thisObj, a[i], i, arr);
    }
};

// every
var every = AP.every ? function (arr) {
    return applyNativeFunction(AP.every, arr, arguments);
} : function (arr, callback, thisObj) {
    a = toArray(arr);
    for (var i = 0; i < a.length; i++) {
        if (!callback.call(thisObj, a[i], i, arr)) {
            return false;
        }
    }
    return true;
};

// filter
var filter = AP.filter ? function (arr) {
    return applyNativeFunction(AP.filter, arr, arguments);
} : function (arr, callback, thisObj) {
    var res = [];
    each(arr, function (element, key) {
        if (callback.call(thisObj, element, key, arr)) {
            res.push(element);
        }
    });
    return res;
};

// map
var map = AP.map ? function (arr) {
    return applyNativeFunction(AP.map, arr, arguments);
} : function (arr, callback, thisObj) {
    var res = [];
    each(arr, function (element, key) {
        res.push(callback.call(thisObj, element, key, arr));
    });
    return res;
};

// some
var some = AP.some ? function (arr) {
    return applyNativeFunction(AP.some, arr, arguments);
} : function (arr, callback, thisObj) {
    var i = undefined;
    for (i = 0; i < arr.length; i++) {
        if (callback.call(thisObj, arr[i], i, arr)) {
            return true;
        }
    }
    return false;
};

// reduce
var reduce = AP.reduce ? function (arr) {
    return applyNativeFunction(AP.reduce, arr, arguments);
} : function (arr, callback, thisObj) {
    var value = undefined;
    if (thisObj) {
        value = thisObj;
    }
    for (var i = 0; i < arr.length; i++) {
        if (value) {
            value = callback(value, arr[i], i, arr);
        } else {
            value = arr[i];
        }
    }
    return value;
};

// reduceRight
var reduceRight = AP.reduceRight ? function (arr) {
    return applyNativeFunction(AP.reduceRight, arr, arguments);
} : function (arr, callback, thisObj) {
    var value = undefined;
    if (thisObj) {
        value = thisObj;
    }
    for (var i = arr.length - 1; i >= 0; i--) {
        if (value) {
            value = callback(value, arr[i], i, arr);
        } else {
            value = arr[i];
        }
    }
    return value;
};

// contains
function contains(arr, value) {
    return indexOf(toArray(arr), value) > -1;
}

// uniq
function uniq(arr) {
    var resultArr = [];
    each(arr, function (element) {
        if (!contains(resultArr, element)) {
            resultArr.push(element);
        }
    });
    return resultArr;
}

// flatten
function flatten(arr) {
    var a = toArray(arr);
    var r = [];
    for (var i = 0, l = a.length; i < l; ++i) {
        if (isArrayLike(a[i])) {
            r = r.concat(a[i]);
        } else {
            r[r.length] = a[i];
        }
    }
    return r;
}

var arrayUtils = {
    contains: contains,
    each: each,
    every: every,
    filter: filter,
    flatten: flatten,
    forEach: each,
    index: index,
    indexOf: indexOf,
    isArray: isArray,
    isArrayLike: isArrayLike,
    lastIndexOf: lastIndexOf,
    map: map,
    reduce: reduce,
    reduceRight: reduceRight,
    some: some,
    toArray: toArray,
    uniq: uniq,
    difference: function difference(arr) {
        var rest = flatten(arrayFromSecondElement(arguments));
        return filter(arr, function (value) {
            return !contains(rest, value);
        });
    },
    eachReverse: function eachReverse(arr, callback, thisObj) {
        var a = toArray(arr);
        var i = a.length - 1;
        for (; i > -1; i -= 1) {
            callback.call(thisObj, a[i], i, arr);
        }
    },
    intersect: function intersect(a, b) {
        var result = [];
        each(a, function (value) {
            if (contains(b, value)) {
                result.push(value);
            }
        });
        return result;
    },
    range: function range() {
        var start = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];
        var stop = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];
        var step = arguments.length <= 2 || arguments[2] === undefined ? 1 : arguments[2];

        var length = Math.max(Math.ceil((stop - start) / step), 0);
        var range = new Array(length);
        for (var i = 0; i < length; i++, start += step) {
            range[i] = start;
        }
        return range;
    },
    remove: function remove(arr, fromIndex, toIndex) {
        var rest = undefined;
        var len = arr.length;
        if (!numberUtils.isNumber(fromIndex)) {
            return arr;
        }
        rest = arr.slice((toIndex || fromIndex) + 1 || len);
        arr.length = fromIndex < 0 ? len + fromIndex : fromIndex;
        return arr.push.apply(arr, rest);
    },
    union: function union() {
        var resultArr = [];
        var sourceArrs = toArray(arguments);
        each(sourceArrs, function (arr) {
            resultArr = resultArr.concat(arr);
        });
        return uniq(resultArr);
    }
};

module.exports = arrayUtils;
},{"./number":17,"./type":20}],15:[function(require,module,exports){
(function (global){
'use strict';

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

/* jshint node: true, esnext: true, loopfunc: true, undef: true, unused: true */
/* global window, global, self */

var undefStr = 'undefined';

module.exports = (typeof window === 'undefined' ? 'undefined' : _typeof(window)) !== undefStr ? window : (typeof global === 'undefined' ? 'undefined' : _typeof(global)) !== undefStr ? global : (typeof self === 'undefined' ? 'undefined' : _typeof(self)) !== undefStr ? self : {};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],16:[function(require,module,exports){
'use strict';

/* jshint esnext: true, loopfunc: true */

var objectUtils = require('./object');

module.exports = objectUtils.extend({
        global: require('./global')
}, objectUtils, require('./array'), require('./number'), require('./string'), require('./type'));
},{"./array":14,"./global":15,"./number":17,"./object":18,"./string":19,"./type":20}],17:[function(require,module,exports){
'use strict';

/* jshint esnext: true, loopfunc: true */

var checkType = require('./type');

var isNumber = checkType.isNumber;
var nativeMin = Math.min;
var nativeMax = Math.max;

var numberUtils = {
    isDecimal: function isDecimal(num) {
        return isNumber(num) && num % 1 !== 0;
    },
    isEven: function isEven(num) {
        return isNumber(num) && num % 2 === 0;
    },
    isFinite: isFinite,
    isInteger: Number.isInteger ? Number.isInteger : function (num) {
        return isNumber(num) && num % 1 === 0;
    },
    isNaN: isNaN,
    isNegative: function isNegative(num) {
        return isNumber(num) && num < 0;
    },
    isNumber: isNumber,
    isOdd: function isOdd(num) {
        return isNumber(num) && num % 2 !== 0;
    },
    isPositive: function isPositive(num) {
        return isNumber(num) && num > 0;
    },
    toFloat: function toFloat(str) {
        return parseFloat(str);
    },
    toInteger: function toInteger(str, radix) {
        return parseInt(str, radix || 10);
    },
    isInRange: function isInRange(value, start, end) {
        start = +start || 0;
        if (end === undefined) {
            end = start;
            start = 0;
        } else {
            end = +end || 0;
        }
        return value >= nativeMin(start, end) && value < nativeMax(start, end);
    }
};

numberUtils.isInFinite = function (num) {
    return !numberUtils.isFinite(num);
};

module.exports = numberUtils;
},{"./type":20}],18:[function(require,module,exports){
'use strict';

/* jshint node: true, esnext: true, loopfunc: true, undef: true, unused: true */

var checkType = require('./type');
var getType = checkType.getType;
var isFunction = checkType.isFunction;
var isObject = checkType.isObject;
var isPlainObject = checkType.isPlainObject;

var arrayUtils = require('./array');
var contains = arrayUtils.contains;
var each = arrayUtils.each;
var isArrayLike = arrayUtils.isArrayLike;
var toArray = arrayUtils.toArray;

function toPlainObject(obj) {
    return isPlainObject(obj) ? obj : {};
}
function forIn(obj, callback, thisObj) {
    var plainObj = toPlainObject(obj);
    for (var key in plainObj) {
        callback.call(thisObj, plainObj[key], key, obj);
    }
}

var keys = Object.keys ? function (obj) {
    return Object.keys(obj);
} : function (obj) {
    var result = [];
    forIn(obj, function (value, key) {
        if (!(isFunction(obj) && key === 'prototype')) {
            result.push(key);
        }
    });
    return result;
};

function values(obj) {
    var result = [];
    forIn(obj, function (value) {
        return result.push(value);
    });
    return result;
}

function extend(dest) {
    dest = dest || {};
    each(toArray(arguments).slice(1), function (source) {
        if (source) {
            for (var prop in source) {
                dest[prop] = source[prop];
            }
        }
    });
    return dest;
}

function merge(dest) {
    dest = dest || {};
    each(toArray(arguments).slice(1), function (source) {
        for (var prop in source) {
            if (getType(source[prop]) !== getType(dest[prop])) {
                if (isPlainObject(source[prop])) {
                    dest[prop] = {};
                    merge(dest[prop], source[prop]);
                } else {
                    dest[prop] = source[prop];
                }
            } else {
                if (isPlainObject(source[prop])) {
                    merge(dest[prop], source[prop]);
                } else {
                    dest[prop] = source[prop];
                }
            }
        }
    });
    return dest;
}

var objectUtils = {
    assign: extend,
    forIn: forIn,
    extend: extend,
    hasKey: function hasKey(obj, key) {
        return obj.hasOwnProperty(key);
    },
    hasValue: function hasValue(obj, value) {
        return contains(values(obj), value);
    },
    isObject: isObject,
    isPlainObject: isPlainObject,
    keys: keys,
    merge: merge,
    values: values,
    invert: function invert(obj) {
        var result = {};
        forIn(obj, function (value, key) {
            result[value] = key;
        });
        return result;
    },
    clone: function clone(obj) {
        if (isArrayLike(obj)) {
            return toArray(obj);
        }
        if (isPlainObject(obj)) {
            return merge({}, obj);
        }
        return obj;
    },
    destroy: function destroy(obj) {
        for (var p in obj) {
            delete obj[p];
        }
        obj.prototype = null;
        obj = null;
    }
};

module.exports = objectUtils;
},{"./array":14,"./type":20}],19:[function(require,module,exports){
'use strict';

/* jshint esnext: true, loopfunc: true */

var checkType = require('./type');

var isString = checkType.isString;
var stringPrototype = String.prototype;

function toString(a) {
    return a.toString();
}

var stringUtils = {
    isString: isString,
    trim: function trim(str) {
        str = toString(str);
        return stringPrototype.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
    },
    trimLeft: function trimLeft(str) {
        str = toString(str);
        return stringPrototype.trimLeft ? str.trimLeft() : str.replace(/^\s+/g, '');
    },
    trimRight: function trimRight(str) {
        str = toString(str);
        return stringPrototype.trimRight ? str.trimRight() : str.replace(/^\s+/g, '');
    },
    lc: function lc(str) {
        return toString(str).toLowerCase();
    },
    uc: function uc(str) {
        return toString(str).toUpperCase();
    },
    hasSubString: function hasSubString(str, subStr) {
        return toString(str).indexOf(toString(subStr)) > -1;
    }
};

module.exports = stringUtils;
},{"./type":20}],20:[function(require,module,exports){
'use strict';

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

/* jshint esnext: true, loopfunc: true */

var toString = ({}).toString;
var isType = function isType(obj, type) {
    return toString.call(obj) === '[object ' + type + ']';
};

var checkType = {
    isArguments: function isArguments(obj) {
        return isType(obj, 'Arguments');
    },
    isArray: Array.isArray ? Array.isArray : function (obj) {
        return isType(obj, 'Array');
    },
    isArrayLike: function isArrayLike(obj) {
        return (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object' && isFinite(obj.length);
    },
    isBoolean: function isBoolean(obj) {
        return isType(obj, 'Boolean');
    },
    isDate: function isDate(obj) {
        return isType(obj, 'Date');
    },
    isError: function isError(obj) {
        return isType(obj, 'Error');
    },
    isFunction: function isFunction(obj) {
        return isType(obj, 'Function');
    },
    isNull: function isNull(obj) {
        return obj === null;
    },
    isNumber: function isNumber(obj) {
        return isType(obj, 'Number');
    },
    isPlainObject: function isPlainObject(obj) {
        return isType(obj, 'Object');
    },
    isRegExp: function isRegExp(obj) {
        return isType(obj, 'RegExp');
    },
    isString: function isString(obj) {
        return isType(obj, 'String');
    },
    isType: isType,
    isUndefined: function isUndefined(obj) {
        return obj === undefined;
    },
    getType: function getType(obj) {
        var typeStr = toString.call(obj);
        return typeStr.replace(/^\[object /, '').replace(/\]$/, '');
    },
    isObject: function isObject(obj) {
        var type = typeof obj === 'undefined' ? 'undefined' : _typeof(obj);
        return type === 'function' || type === 'object' && !!obj;
    }
};

module.exports = checkType;
},{}],21:[function(require,module,exports){
'use strict';

/* jshint node: true, esnext: true, loopfunc: true, undef: true, unused: true */

var arrayUtils = require('zero-lang/array');

function isGoodHead(head, rest) {
    var isGood = true;
    arrayUtils.some(rest, function (lin) {
        if (arrayUtils.indexOf(lin, head) > 0) {
            isGood = false;
        }
    });

    if (isGood) {
        arrayUtils.each(rest, function (lin) {
            if (arrayUtils.indexOf(lin, head) === 0) {
                lin.shift();
            }
        });
    }
    return isGood;
}

function eachHead(bases) {
    var result = [];
    var badLinearization = 0;

    while (bases.length) {
        var base = bases.shift();
        if (!base.length) {
            continue;
        }

        if (isGoodHead(base[0], bases)) {
            result.push(base.shift());
            badLinearization = 0;
        } else {
            badLinearization += 1;
            if (badLinearization === bases.length) {
                throw 'Bad Linearization';
            }
        }
        if (base.length) {
            bases.push(base);
        }
    }
    return result;
}

module.exports = function () {
    return eachHead(arrayUtils.map(arrayUtils.toArray(arguments), arrayUtils.toArray));
};
},{"zero-lang/array":14}],22:[function(require,module,exports){
'use strict';

/* jshint node: true, esnext: true, loopfunc: true, undef: true, unused: true */

var lang = require('zero-lang');
var c3mroMerge = require('./c3mro');

module.exports = function () /*name, superClasses, protoObj*/{
    var uberClass = undefined;
    var tempConstructor = undefined;
    var lin = '_linearization';
    var args = lang.toArray(arguments);
    var name = lang.isString(args[0]) ? args.shift() : '';
    var superClasses = args.length > 1 ? args.shift() : [];
    var protoObj = args[0] ? args.shift() : {};
    var bases = [];
    var hasCtor = false;
    var Tmp = function Tmp() {};
    var ctor = function ctor() {};

    superClasses = lang.isArray(superClasses) ? superClasses : [superClasses];
    lang.each(superClasses, function (clazz) {
        clazz[lin] = clazz[lin] || [clazz];
        bases.push(clazz[lin]);
    });

    if (bases.length) {
        bases.push(superClasses);
        bases = c3mroMerge.apply(null, bases);
    }

    tempConstructor = protoObj.constructor;
    if (tempConstructor !== Object.prototype.constructor) {
        hasCtor = true;
        ctor = tempConstructor;
    }

    ctor[lin] = [ctor].concat(bases);
    ctor.parents = lang.toArray(bases);

    protoObj.constructor = ctor;
    while (uberClass = bases.shift()) {
        protoObj = lang.extend({}, uberClass.prototype, protoObj);
        Tmp.prototype = protoObj;
        if (!hasCtor) {
            protoObj.constructor = ctor;
        }
        protoObj = new Tmp();
    }

    ctor.className = name;
    ctor.prototype = protoObj;
    ctor.prototype.constructor = ctor;

    return ctor;
};
},{"./c3mro":21,"zero-lang":16}]},{},[2]);
