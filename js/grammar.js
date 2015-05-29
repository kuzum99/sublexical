
var Grammar = (function($, undefined){

    var initialized = false;
    var FeatureManager = Aligner.FeatureManager;
    var constraints = [];
    var candidates = [];
    var useGaussianPriors = true;
    var defaultMu = 0;
    var defaultSigma = 100000;

    var _log = function (message) {
        console.log(message);
        //GUI.log(message);
    }

    var initialize = function (obj) {

        _log("Initializing Grammar.");
        var obj = obj || {};

        var constraintFile = obj.constraintFile || "constraints.txt";



		if (typeof constraintFile === "string") {
			_log("Loading constraint set: " + constraintFile);
			FileManager.loadText(constraintFile);
			if (FileManager.status()) {
				constraints = FileManager.get();
			}
		} else {
			// local file
			_log("Loading constraint set: " + constraintFile.name);
			constraints = constraintFile.content;
			for (var i=0; i< constraints.length; i++) {
				if (typeof constraints[i]==="string") {
					constraints[i] = [constraints[i]];
				}
			}
		}


        printConstraintTranslations();
        _log("Constraint set loaded.");

        if ("useGaussianPriors" in obj) {
            useGaussianPriors = obj.useGaussianPriors || false;
        }
        if ("defaultMu" in obj) {
            defaultMu = obj.defaultMu || 0;
        }
        if ("defaultSigma" in obj) {
            defaultSigma = obj.defaultSigma || 100000;
        }
        _log("Gaussian prior use set to: " + useGaussianPriors.toString());
        if (useGaussianPriors === true) {
            _log("Default mu: " + defaultMu);
            _log("Default sigma: " + defaultSigma);
        }

        _log("Grammar initialized.");

    };


    var convertConstraint = function (constraint, verbose) {
        /* Convert a constraint from its "name" (string) to a violation-
         * assessing function, either automatically (for Markedness
         * constraints, which become REs, and for Faithfulness constraints in
         * the standard format) or, for Faithfulness constraints, based on
         * the constraint dictionary file. */
        if (constraint[0] === 'F') { // Faithfulness constraint
            return Faithfulness.translateFaithfulnessConstraint(constraint);
        } else { //Markedness constraint

            var original = constraint;

            var replacementFn = function(match) {
                var sl = match.length - 1;
                var segments = FeatureManager.naturalClass(match.substring(1,sl).split(","));
                return "(" + segments + ")";
            }

            constraint = constraint.replace(/\[(\+|-|0)[^\]]*\]/g, replacementFn);
            constraint = constraint.replace(/\(\)/g, '(?!)') // empty specifications turn into "(?!)", which never matches anything
            var RE = new RegExp(constraint ,"g");

            if (verbose) {
                _log(original + "   ->   " + RE);
            }

            var regularMarkednessConstraint = function(stringOrAlignment) {
                // If argument is an alignment, it must be in the form of the
                // output from alignmentToArrays, i.e. length = 2.
                if (typeof stringOrAlignment !== "string") {
                    var string = Learner.linearizeWord(stringOrAlignment[1]);
                    // I think that if Gatekeeper constraints are accidentally fed alignments, they'll look at derivatives, not bases (the [1])... fix this.
                } else {
                    var string = stringOrAlignment;
                }

                var match = string.toString().match(RE);
                return match ? match.length : 0;
            }

            return regularMarkednessConstraint;

        }
    };


    var printConstraintTranslations = function() {
        /* Print the RE translation of each constraint name to the console. */
        for (var i=0;i<constraints.length;i++) {
            convertConstraint(constraints[i][0], verbose=true);
        }
    }


    var constructGatekeeper = function (hypothesis) {
        /* Assess constraint violations among the base forms in the given
         * hypothesis and weight constraints accordingly. Return the resulting
         * Gatekeeper grammmar. */
        var Gatekeeper = {};
        Gatekeeper.constraints = [];
        Gatekeeper.forms = [];
        Gatekeeper.useGaussianPriors = useGaussianPriors;
        Gatekeeper.z = 0;

        // make array of constraints
        for (var i=0; i<constraints.length; i++) {
            if (constraints[i][0][0] !== "F") { // no Faithfulness constraints in GK
                Gatekeeper.constraints.push({
                    name: constraints[i][0],
                    evaluate: convertConstraint(constraints[i][0]),
                    weight: 0,
                    mu: constraints[i][1] || defaultMu,
                    sigma: constraints[i][2] || defaultSigma
                });
            }
        }

        // make tableau, with constraint violations
        for (var i=0; i<hypothesis.length; i++) {
            Gatekeeper.forms[i] = {
                candidate: hypothesis[i].form,
                probability: hypothesis[i].probability,
                violationVector: [],
                predicted: function () {
                }
            }
            for (var j=0; j<Gatekeeper.constraints.length; j++) {
                Gatekeeper.forms[i].violationVector[j] = Gatekeeper.constraints[j].evaluate(Gatekeeper.forms[i].candidate);
            }
        }

        Gatekeeper.getWeights = function() {
            var arr = [];
            for (var i=0; i < this.constraints.length; i++) {
                arr[i] = this.constraints[i].weight;
                arr[i] = round(arr[i],2);
            }
            return arr;
        }

        Gatekeeper.printWeights = function(howMany) {
            var constraints = Learner.sortThings(this.constraints.slice(0), 'weightAbsVal');
            var weights = $.map(constraints, function(x){return x.weight;});

            var mostInfluentialCt = howMany || weights.length;
            mostInfluentialCt = constraints.length >= mostInfluentialCt ? mostInfluentialCt : constraints.length;
            for (var i=0; i<mostInfluentialCt; i++) {
                _log(constraints[i].name + ': ' + weights[i]);
            }
        }

        return Gatekeeper;
    };


    var constructGrammarProper = function (hypothesis) {
        /* Assess constraint violations among the alignments in the given
         * hypothesis and weight constraints accordingly. Return the resulting
         * Grammar Proper. */
        var GrammarProper = {};
        GrammarProper.constraints = [];
        GrammarProper.forms = [];
        GrammarProper.useGaussianPriors = useGaussianPriors;

        // make array of constraints
        for (var i=0; i<constraints.length; i++) {
            GrammarProper.constraints[i] = {
                name: constraints[i][0],
                evaluate: convertConstraint(constraints[i][0]),
                weight: 0,
                mu: constraints[i][1] || defaultMu,
                sigma: constraints[i][2] || defaultSigma
            };
        }

        // make tableau, with constraint violations
        for (var i=0; i<hypothesis.contexts.length; i++) {
            GrammarProper.forms[i] = {
                input: hypothesis.contexts[i].form,
                output: hypothesis.contexts[i].derivative,
                probability: hypothesis.contexts[i].probability,
                violationVector: [],
                predicted: function () {}
            };

            var thisAlignment = Learner.applyHypothesis(hypothesis.contexts[i].form, hypothesis, true);

            for (var j=0; j<GrammarProper.constraints.length; j++) {
                // Markedness constraint evaluations need str inputs, and Faith need alignments
                // console.log(thisAlignment);
                GrammarProper.forms[i].violationVector[j] = GrammarProper.constraints[j].evaluate(thisAlignment);
            }
        }
        console.log(GrammarProper);

        GrammarProper.getWeights = function() {
            var arr = [];
            for (var i=0; i < this.constraints.length; i++) {
                arr[i] = this.constraints[i].weight;
                arr[i] = round(arr[i],2);
            }
            return arr;
        }

        GrammarProper.printWeights = function(howMany) {
            var constraints = Learner.sortThings(this.constraints.slice(0), 'weightAbsVal');
            var weights = $.map(constraints, function(x){return x.weight;});

            var mostInfluentialCt = howMany || weights.length;
            mostInfluentialCt = constraints.length >= mostInfluentialCt ? mostInfluentialCt : constraints.length;
            for (var i=0; i<mostInfluentialCt; i++) {
                _log(constraints[i].name + ': ' + weights[i]);
            }
        }

        return GrammarProper;
    };


    var gatekeeperToHTML = function (gatekeeper, optionalWugs) {

        // wraps data in <TD>
        var td = function (param) {
            if (typeof param==="string" || typeof param==="number") {
                return "<td>" + param + "</td>";
            } else {
                return $.map( param , function(val, i) { return "<td>" + val + "</td>"; } ).join("");
            }
        }
        // wraps a training datum in <TR>
        var tr = function (form,i) {
            return "<tr>" +
                "<td>" + form.candidate.replace(/ /g,"&nbsp;") +  "</td>"+
                "<td>" + form.probability +  "</td>"+
                "<td>" + round(Math.exp(-1*getHarmony(gatekeeper,i)),2) +  "</td>"+
                "<td>" + getHarmony(gatekeeper,i) +  "</td>"+
                $.map( form.violationVector , function(val) {return td(val);} ).join("")
                "</tr>";
        }
        // wraps a wug in <TR>
        var wugTR = function (wug) {
            var obj = applyGatekeeper(gatekeeper,wug);
            return "<tr>" +
                "<td>" + wug.replace(/ /g,"&nbsp;") +  "</td>"+
                "<td>" + "n/a" +  "</td>"+
                "<td>" + round(Math.exp(-1* obj.harmony) ,2) +  "</td>"+
                "<td>" + obj.harmony +  "</td>"+
                $.map( obj.violationVector , function(val) {return td(val);} ).join("")
                "</tr>";
        }

        // print the training data in a tableau
        html = "<table class=gatekeeper border=1>" +
            "<tr>" + td(["","","",""]) +  td(gatekeeper.getWeights()) + "</tr>" +
            "<tr style='font-size: 8px;'>" + td(["","observed","predicted","H"]) +  $.map( gatekeeper.constraints , function(val) {return td(val.name);} ).join("") + "</tr>" +
            $.map( gatekeeper.forms , function(val,i) {return tr(val,i);} ).join("\n");

        // print wugs in the tableau
        if (Object.prototype.toString.call( optionalWugs ) === '[object Array]' ) {
            html += $.map( optionalWugs , function(val) {return wugTR(val);} ).join("\n");
        }

        html += "</table>";
        return html;
    }


    var getHarmony = function (gatekeeper, i) {
        /* Calculate harmony score for the form at index i based on
         * gatekeeper. */
        if (i < gatekeeper.forms.length) {
            var harmony = 0;
            for (var j=0; j<gatekeeper.constraints.length; j++) {
                harmony += gatekeeper.forms[i].violationVector[j] * gatekeeper.constraints[j].weight;
            }
            return round(harmony,3);
        } else {
            return NaN;
        }
    }


    var applyGatekeeper = function(gatekeeper, string) {
        /* Apply gatekeeper to the given base string, producing a
         * harmony score and constraint violations. */
        var harmony = 0;
        var arr = [];
        var violatedConstraints = {};
        for (var j=0; j<gatekeeper.constraints.length; j++) {
            var violationCount = gatekeeper.constraints[j].evaluate(string);
            arr.push(violationCount);
            harmony += violationCount * gatekeeper.constraints[j].weight;
            if (violationCount > 0) {
                violatedConstraints[constraints[j]] = violationCount;
            }
        }

        return {harmony: round(harmony,3), violationVector: arr, violatedConstraints: violatedConstraints,
                    constraints: gatekeeper.constraints};
    };


    var applyGrammarProper = function(grammar, alignment) {
        /* Apply grammar proper to the given alignment, producing a
         * harmony score and constraint violations */
        var harmony = 0;
        var arr = []
        var violatedConstraints = {};
        for (var j=0; j<grammar.constraints.length; j++) {
            var violationCount = grammar.constraints[j].evaluate(alignment);
            arr.push(violationCount);
            harmony += violationCount * grammar.constraints[j].weight;
            if (violationCount > 0) {
                violatedConstraints[constraints[j]] = violationCount;
            }
        }

        return {harmony: round(harmony,3), violationVector: arr, violatedConstraints: violatedConstraints,
                    constraints: grammar.constraints };
    };


    var round = function(number, digits) {
        return Math.round(number*Math.pow(10,digits))/Math.pow(10,digits);
    }

    var checkFaithPresence = function() {
        var allConstraintsStr = constraints.join();
        return ((allConstraintsStr.indexOf('Ident')>-1) || (allConstraintsStr.indexOf('Max')>-1) || (allConstraintsStr.indexOf('Dep')>-1));
    }

    return {
        initialize : initialize,
        convertConstraint : convertConstraint,
        constructGatekeeper : constructGatekeeper,
        constructGrammarProper : constructGrammarProper,

        applyGatekeeper : applyGatekeeper,
        applyGrammarProper : applyGrammarProper,
        round : round,

        checkFaithPresence : checkFaithPresence
    };

})(jQuery);
