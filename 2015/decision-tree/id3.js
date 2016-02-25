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
