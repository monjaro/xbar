function is_string(s) {
    return s && (typeof s == "string" || s instanceof String);
};

function xbar(obj, spec, spec_args, head, complements, adjuncts, adjunct_args) {
    if (is_string(spec)) {
        if (!(obj.__specifiers && obj.__specifiers[spec])) {
            throw "No such specifier \"" + spec + "\" on " + obj;
        }

        spec = obj.__specifiers[spec];

        if (spec_args) {
            spec = spec.apply(obj, spec_args);
        }
    }

    spec = spec || function(head, complements) {
        return {field: obj[head], complements: complements};
    };

    var specd = spec.call(obj, head, complements);
    var field = specd.field;

    for (var i = 0; i < adjuncts.length; i++) {
        var oldField = field;
        var adj;
        if (is_string(adjuncts[i])) {
            if (!(oldField.__adjuncts && oldField.__adjuncts[adjuncts[i]])) {
               throw "No such adjunct \"" + adjuncts[i] + "\" on " + oldField;
            }

            adj = oldField.__adjuncts[adjuncts[i]];

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

Array.prototype.map.__adjuncts = {
    except: function(n) {
        return function(func) {
            return function() {
                return func.apply(this.filter(function(x) { return x != n; }), arguments);
            };
        };
    },
    but_not: function(n) {
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
    }
};

Array.prototype.__specifiers = {
    each: function(head, complements) {
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
            field: this.map,
            complements: [func]
        };
    },
    the: function(acc) {
        function where(qualifier) {
            return function(func) {
                return function(options) {
                    var new_qualifier = qualifier;
                    if (options.qualifier) {
                        var qual = options.qualifier;
                        new_qualifier = function(x) {
                            return qualifier(x) && qual(x);
                        };
                    }
                    options.qualifier = new_qualifier;
                    return func.call(this, options);
                };
            };
        };

        function appearing_last(func) {
            return function(options) {
                options.last = true;
                return func.call(this, options);
            };
        };
        function appearing_first(func) {
            return function(options) {
                options.last = false;
                return func.call(this, options);
            };
        };

        function testQual(options, item) {
            return !options.qualifier || options.qualifier(item);
        }

        var selectors = {
            largest: function(options) {
                var largest = -Infinity;
                for (var i = 0; i < this.length; i++) {
                    if (testQual(options, this[i])) {
                        if (this[i] > largest) {
                            largest = this[i];
                        }
                    }
                }
                return largest;
            },
            smallest: function(options) {
                var smallest = Infinity;
                for (var i = 0; i < this.length; i++) {
                    if (testQual(options, this[i])) {
                        if (this[i] < smallest) {
                            smallest = this[i];
                        }
                    }
                }
                return smallest;
            },
            element: function(options) {
                if (options.last) {
                    for (var i = this.length - 1; i >= 0; i--) {
                        if (testQual(options, this[i])) {
                            return this[i];
                        }
                    }
                } else {
                    for (var i = 0; i < this.length; i++) {
                        if (testQual(options, this[i])) {
                            return this[i];
                        }
                    }
                }
                return undefined;
            },
            average: function(options) {
                var sum = 0;
                var count = 0;
                for (var i = 0; i < this.length; i++) {
                    if (testQual(options, this[i])) {
                        sum += this[i];
                        count++;
                    }
                }
                return sum / count;
            }
        };
        for(var sel in selectors) {
            selectors[sel].__adjuncts = {
                "where": where
            };
        }
        selectors.element.__adjuncts.appearing_last = appearing_last;
        selectors.element.__adjuncts.appearing_first = appearing_first;

        if (is_string(acc)) {
            return {field: selectors[acc], complements: [{}]};
        }
        return undefined;
    }
};

Array.prototype.sort.__adjuncts = {
    by: function(compFun) {
        return function(func) {
            return function(optCompFun) {
                func.call(this, compFun);
            };
        };
    }
};

xbar.first_wait = function(time) {
    return function(func) {
        return function() {
            var that = this;
            var args = arguments;
            setTimeout(function() { func.apply(that, args); }, time);
        };
    };
};

xbar.never = function(head) {
    function cancel(cond) {
        var old = this[head];
        this[head] = function() {
            if (cond && cond()) {
                return old.apply(this, arguments);
            }
            return undefined;
        };
    };

    function remove_adjuncts(f) {
        f.__adjuncts = undefined;
        return f;
    };

    cancel.__adjuncts = {
        unless: function(cond) {
            return function(func) {
                return remove_adjuncts(function() {
                    func.call(this, cond);
                });
            };
        },
        when: function(cond) {
            return function(func) {
                return remove_adjuncts(function() {
                    func.call(this, function() { return !cond(); });
                });
            };
        }
    };

    return {field: cancel, complements: []};
};

xbar.every = function(head) {
    var that = this;

    function transform(f, time, cond, cancel_cond) {
        return function() {
            var args = arguments;
            var id = setInterval(function() {
                if (cancel_cond()) {
                    clearInterval(id);
                    return;
                }
                if (cond()) {
                    f.apply(that, args);
                }
            }, time);
        };
    };

    function create(timeout, cond, cancel_cond) {
        var obj = Object.create(that);

        for (var field in obj) {
            obj[field] = transform(obj[field], timeout, cond, cancel_cond);
        }
        return obj;
    };

    create.__adjuncts = {
        except_if: function(cond) {
            return function(func) {
                return function(timeout, old_cond, cancel_cond) {
                    return func.call(this, timeout, function() {
                        return cond() && old_cond();
                    }, cancel_cond);
                };
            };
        },
        cancel_if: function(cancel_cond) {
            return function(func) {
                return function(timeout, cond, old_cancel_cond) {
                    return func.call(this, timeout, cond, function() {
                        return cancel_cond() && old_cancel_cond();
                    });
                };
            };
        }
    };

    function t() { return true; };
    return {field: create, complements: [head, t, t]};
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = xbar;
};
