function is_string(s) {
    return s && (typeof s == "string" || s instanceof String);
};

function xbar(obj, spec, spec_args, head, complements, adjuncts, adjunct_args) {
    if (is_string(spec)) {
        spec = obj[spec];

        if (spec_args) {
            spec = spec.apply(obj, spec_args);
        }
    }

    var specd = spec ? spec(head, complements): {head:head,complements:complements};
    var field = obj[specd.head];

    for (var i = 0; i < adjuncts.length; i++) {
        var oldField = field;
        var adj;
        if (is_string(adjuncts[i])) {
            adj = oldField[adjuncts[i]];

            if (adjunct_args[i]) {
                adj = adj.apply(oldField, adjunct_args[i]);
            }
        } else {
            adj = adjuncts[i];
        }
        field = adj(field);

        for (var key in oldField) {
            if (!(key in field)) {
                field[key] = oldField[key];
            }
        }
    }

    if (specd.complements) {
        return field.apply(obj, specd.complements);
    } else {
        return field;
    }
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
    var func;
    if (is_string(head)) {
        func = function(x) {
            return x[head].apply(x, complements);
        };
    } else {
        func = function(x) {
            return head.apply(null, [x].concat(complements));
        };
    }

    return {
        head: "map",
        complements: [func]
    };
};

Array.prototype.max = function() {
  return Math.max.apply(null, this);
};

Array.prototype.the = function(acc) {
    if (acc == "largest") {
        return {head: "max", complements: []};
    }
};

function lt(a, b) {
    return a - b;
};

Array.prototype.sort.by = function(compFun) {
    return function(func) {
        return function(optCompFun) {
            func.call(this, compFun);
        };
    };
};

function first_wait(time) {
    return function(func) {
        return function() {
            var that = this;
            var args = arguments;
            window.setTimeout(function() { func.apply(that, args); }, time);
        };
    };
};
