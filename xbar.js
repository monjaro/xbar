function Range(start, end) {
    this.start = start;
    this.end = end;
};

Range.prototype.in = function(o) {
    return this.start >= o.start && this.end <= o.end;
};

function rangeFromList(list) {
    if (list == null || list.length == 0) {
        return "";
    } else {
        return new Range(list[0].start, list[list.length - 1].end);
    }
};
        
function desugar(text) {
    var opts = {locations: true};
    var parsed = acorn.parse(text, opts);


    var nodes = [];

    var list = [new Range(0, text.length)];

    acorn.walk.simple(parsed, {
        XBarExpression: function(node) {
            nodes.push(node);
        }
    });

    nodes.sort(function(a, b) {
        if (a.start < b.start) {
            return -1;
        } else if (a.start == b.start) {
            if (a.end > b.end) {
                return -1;
            } else {
                return 1;
            }
        } else {
            return 1;
        }
    });

    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var r = new Range(node.start, node.end);

        var found = false;
        for (var j = 0; j < list.length; j++) {
            var l = list[j];
            if (r instanceof Range && r.in(l)) {
                var ns = new Range(l.start, r.start);
                var ne = new Range(r.end, l.end);

                var objR = new Range(node.object.start, node.object.end);
                var specR = (node.specifier == null) ? "null": new Range(node.specifier.start, node.specifier.end);
                var headR = new Range(node.head.start, node.head.end);
                var complementsR = rangeFromList(node.complements);
                var adjunctsR = rangeFromList(node.adjuncts);

                list.splice(j, 1, ns, "(xbar(", objR, ", ", specR, ", ", headR, ", [", complementsR, "], [", adjunctsR, "]))", ne);
                found = true;
                break;
            }
        }
        if (!found) {
            window.console.log("ERROR!!");
        }
    }


    var res = "";
    for (var i = 0; i < list.length; i++) {
        var l = list[i];
        if (l instanceof Range) {
            res += text.slice(l.start, l.end);
        } else {
            res += l;
        }
    }

    window.console.log(res);
    window.console.log(eval(res));
}

function xbar(obj, spec, head, complements, adjuncts) {
    var specd = spec(head, complements);
    var func = obj[specd.head];
    for (var i = 0; i < adjuncts.length; i++) {
        func = adjuncts[i](func);
    }
    return func.apply(obj, specd.complements);
};

function add(a, b) {
    return a + b;
};

function except(n) {
    return function(func) {
        return function() {
            return func.apply(this.filter(function(x) { return x != n; }), arguments);
        };
    };
};

function butNot(n) {
    return function(func) {
        return function() {
            var oldFunc = arguments[0];
            return func.apply(this, [function(x) {
                if (x == n) {
                    return x;
                } else {
                    return oldFunc(x);
                }
            }]);
        };
    };
};

function each(head, complements) {
    return {
        head: "map",
        complements: [function(x) {
            return head.apply(null, [x].concat(complements));
        }]
    };
};
