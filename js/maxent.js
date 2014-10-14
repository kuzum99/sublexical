
var Maxent = (function($, undefined){

    var initialized = false;
    var iterationCount = 10000;
    var learningRate = 1;
    var noPositiveWeights = true;
    var initialWeight = 0;

    var _log = function (message) {
        console.log(message);
        //GUI.log(message);
    }

    var initialize = function (obj) {

        _log("Initializing Maximum Entropy module.");
        var obj = obj || {};

        iterationCount = obj.iterationCount || 10000;
        learningRate = obj.learningRate || 1;
        if ("noPositiveWeights" in obj) {
            noPositiveWeights = obj.noPositiveWeights;
        } else {
            noPositiveWeights = true;
        }
        initialWeight = obj.initialWeight || 0;

        _log("Maximum Entropy module initialized.");

    };


    var learnWeights = function(gatekeeper) {
        /* Calculate constraint weights based on violation matrix in
         * `gatekeeper`.  Return gatekeeper */
        var startTime = new Date();

        var mulMV = function (m, v) {
            var acc = [];
            for (var i=0;i<m.length;i++) {
                acc.push(numeric.mul(m[i], v[i]));
            }
            return acc;
        };

        var sumCols = function (m) {
            var current = m[0];
            for (var i=1;i<m.length;i++) {
                current = numeric.add(current, m[i]);
            }
            return current;
        };

        var predProb = function (T, w) {
            var prob = numeric.exp(numeric.dotMV(T.violn, w));
            var psum = numeric.sum(prob);
            prob = numeric.div(prob, psum);
            return prob;
        };

        var observed = function (T, w) {
            return sumCols(mulMV(T.violn, T.winProb));
        };

        var expected = function (T, w) {
            var prob = predProb(T, w);
            return sumCols(mulMV(T.violn, prob));
        };

        var gradient = function (T, w) {
            var priorPenaltyTerm = calculatePriorPenaltyTerm(T,w);
            return numeric.neg(numeric.sub(numeric.sub(observed(T,w), expected(T,w)), priorPenaltyTerm));
        };

        var calculatePriorPenaltyTerm = function(T, w) {
            if (gatekeeper.useGaussianPriors) {
                var terms = [];
                for (var j=0; j<gatekeeper.constraints.length;j++) {
                    var term = weights[j] - gatekeeper.constraints[j].mu
                    term = term / Math.pow(gatekeeper.constraints[j].sigma, 2);
                    terms.push(term);
                }
                return terms;
            } else {
                return $.map(gatekeeper.constraints, function(e){return 0;});
            }
        };


        var violVectors = [];
        for (var i=0;i<gatekeeper.forms.length;i++) {
            violVectors.push(gatekeeper.forms[i].violationVector);
        }
        var probs = $.map(gatekeeper.forms, function(f){return f.probability;});
        var probSum = numeric.sum(probs);
        probs = $.map(probs, function(p){return p / probSum;});
        var tableau = {violn : violVectors, winProb : probs};
        var weights = $.map(gatekeeper.constraints, function(c){return initialWeight;});

        for (var i=0;i<iterationCount;i++) {
            var grad = gradient(tableau, weights);
            weights = numeric.sub(weights, numeric.mul(learningRate, grad));
            if (noPositiveWeights) {
                weights = $.map(weights, function(w){
                    if (w > 0) {return 0;} else {return w;}});
            }
        }

        for (var i=0;i<weights.length;i++) {
            gatekeeper.constraints[i].weight = weights[i];
            gatekeeper.constraints[i].weightAbsVal = Math.abs(weights[i]);
        }

        var consCopy = gatekeeper.constraints.slice(0);
        gatekeeper.constraints = consCopy;

    };




        /* ---- The commented section below includes functions and their calls
         * for manipulating weights based on their mean and standard deviation,
         * and may not be useful.  Keep for now until we're certain all
         * predicted probabilities are in line with expectations.
         * If to be put back in, they go right before the end of learnWeights */

        //~ var mean = function(array) {
            //~ var sum = 0;
            //~ for (var i = 0; i < array.length; i++) {
               //~ sum += array[i];
            //~ }
            //~ return array.length ? sum / array.length : 0;
        //~ };
//~
        //~ var isArray = function (obj) {
            //~ return Object.prototype.toString.call(obj) === "[object Array]";
        //~ },
        //~ getNumWithSetDec = function( num, numOfDec ){
            //~ var pow10s = Math.pow( 10, numOfDec || 0 );
            //~ return ( numOfDec ) ? Math.round( pow10s * num ) / pow10s : num;
        //~ },
        //~ getAverageFromNumArr = function( numArr, numOfDec ){
            //~ if( !isArray( numArr ) ){ return false; }
            //~ var i = numArr.length,
            //~ sum = 0;
            //~ while( i-- ){
                //~ sum += numArr[ i ];
            //~ }
            //~ return getNumWithSetDec( (sum / numArr.length ), numOfDec );
        //~ },
        //~ getVariance = function( numArr, numOfDec ){
            //~ if( !isArray(numArr) ){ return false; }
            //~ var avg = getAverageFromNumArr( numArr, numOfDec ),
            //~ i = numArr.length,
            //~ v = 0;
//~
            //~ while( i-- ){
                //~ v += Math.pow( (numArr[ i ] - avg), 2 );
            //~ }
            //~ v /= numArr.length;
            //~ return getNumWithSetDec( v, numOfDec );
        //~ },
        //~ getStandardDeviation = function( numArr, numOfDec ){
            //~ if( !isArray(numArr) ){ return false; }
            //~ var stdDev = Math.sqrt( getVariance( numArr, numOfDec ) );
            //~ return getNumWithSetDec( stdDev, numOfDec );
        //~ };
//~
        //~ var weightsSd = getStandardDeviation(weights, 8);
        //~ var weightsMean = mean(weights);
//~
        //~ // Action happens here:
        //~ weights = numeric.div(weights, weightsSd);
        //~ weights = numeric.div(weights, -(weightsMean));
//~
        //~ for (var i=0;i<weights.length;i++) {
            //~ gatekeeper.constraints[i].weight = weights[i];
            //~ gatekeeper.constraints[i].weightAbsVal = Math.abs(weights[i]);
        //~ }
//~
        //~ var consCopy = gatekeeper.constraints.slice(0);
        //~ gatekeeper.constraints = sortThings(consCopy, "weightAbsVal");


    var sortThings = function (things, sortParameter, length, absVal) {
        /* Order hypotheses or other objects starting w/ those with the
         * highest count or evidence (or any other `sortParameter`). */
        length = length || false;

        var compareThings = function (a, b) {
          if (a[sortParameter] < b[sortParameter]) {
             return 1;}
          if (a[sortParameter] > b[sortParameter]) {
            return -1;}
          return 0;
        };

        var compareThingsLength = function (a, b) {
          if (a[sortParameter].length < b[sortParameter].length) {
             return 1;}
          if (a[sortParameter].length > b[sortParameter].length) {
            return -1;}
          return 0;
        };

        if (length) {
            return things.sort(compareThingsLength);
        } else {
            return things.sort(compareThings);
        }
    };


    return {
        initialize : initialize,
        learnWeights : learnWeights
    };

})(jQuery);
