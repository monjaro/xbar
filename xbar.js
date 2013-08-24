function xbar(obj, spec, spec_args, head, complements, adjuncts, adjunct_args) {
    function is_string(s) {
        return s && (typeof s == "string" || s instanceof String);
    };
    if (is_string(spec)) {
        spec = obj[spec];

        if (spec_args) {
            spec = spec.apply(obj, spec_args);
        }
    }

    var specd = spec ? spec(head, complements): {head:head,complements:complements};
    var func = obj[specd.head];

    for (var i = 0; i < adjuncts.length; i++) {
        var oldFunc = func;
        var adj;
        if (is_string(adjuncts[i])) {
            adj = oldFunc[adjuncts[i]];

            if (adjunct_args[i]) {
                adj = adj.apply(oldFunc, adjunct_args[i]);
            }
        } else {
            adj = adjuncts[i];
        }
        func = adj(func);

        for (var key in oldFunc) {
            if (!(key in func)) {
                func[key] = oldFunc[key];
            }
        }
    }
    return func.apply(obj, specd.complements);
};

function add(a, b) {
    return a + b;
};

Array.prototype.map.except = function(n) {
    return function(func) {
        return function() {
            return func.apply(this.filter(function(x) { return x != n; }), arguments);
        };
    };
};

Array.prototype.map.but_not = function(n) {
    return function(func) {
        return function(f) {
            return func.call(this, function(x) {
                if (x == n) {
                    return x;
                } else {
                    return f(x);
                }
            });
        };
    };
};

Array.prototype.each = function(head, complements) {
    return {
        head: "map",
        complements: [function(x) {
            return head.apply(null, [x].concat(complements));
        }]
    };
};

function lt(a, b) {
    return a - b;
};

function by(compFun) {
    return function(func) {
        return function(optCompFun) {
            func.call(this, compFun);
        };
    };
};
