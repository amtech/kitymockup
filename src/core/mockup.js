var Minder = KityMinder.Minder = kity.createClass('KityMinder', {
    constructor: function(options) {
        this._options = Utils.extend(window.KITYMINDER_CONFIG || {}, options);
        this.setDefaultOptions(KM.defaultOptions);

        this._initEvents();
        this._initMinder();
        this._initSelection();
        this._initStatus();
        this._initShortcutKey();
        this._initContextmenu();
        this._initModules();

        if (this.getOptions('readOnly') === true) {
            this.setDisabled();
        }
        this.getRoot().render().layout();
        this.fire('ready');
    },

    getOptions: function(key) {
        var val;
        if (key) {
            val = this.getPreferences(key);
            return val === null || val === undefined ? this._options[key] : val;
        } else {
            val = this.getPreferences();
            if (val) {
                return utils.extend(val, this._options, true);
            } else {
                return this._options;
            }
        }
    },

    setDefaultOptions: function(key, val, cover) {
        var obj = {};
        if (Utils.isString(key)) {
            obj[key] = val;
        } else {
            obj = key;
        }
        utils.extend(this._options, obj, !cover);
    },

    setOptions: function(key, val) {
        this.setPreferences(key, val);
    },

    _initMinder: function() {

        this._paper = new kity.Paper();
        this._paper.getNode().setAttribute('contenteditable', true);
        this._paper.getNode().ondragstart = function(e) {
            e.preventDefault();
        };
        this._paper.shapeNode.setAttribute('transform', 'translate(0.5, 0.5)');

        this._addRenderContainer();

        this.setRoot(this.createNode(this.getLang().maintopic));

        if (this._options.renderTo) {
            this.renderTo(this._options.renderTo);
        }
    },

    _addRenderContainer: function() {
        this._rc = new kity.Group().setId(KityMinder.uuid('minder'));
        this._paper.addShape(this._rc);
    },

    renderTo: function(target) {
        this._paper.renderTo(this._renderTarget = target);
        this._bindEvents();
    },

    getRenderContainer: function() {
        return this._rc;
    },

    getPaper: function() {
        return this._paper;
    },
    getRenderTarget: function() {
        return this._renderTarget;
    },
    _initShortcutKey: function() {
        this._shortcutkeys = {};
        this._bindshortcutKeys();
    },
    addShortcutKeys: function(cmd, keys) {
        var obj = {},
            km = this;
        if (keys) {
            obj[cmd] = keys;
        } else {
            obj = cmd;
        }
        utils.each(obj, function(k, v) {
            km._shortcutkeys[k.toLowerCase()] = v;
        });

    },
    getShortcutKey: function(cmdName) {
        return this._shortcutkeys[cmdName];
    },
    _bindshortcutKeys: function() {
        var me = this,
            shortcutkeys = this._shortcutkeys;

        function checkkey(key, keyCode, e) {
            switch (key) {
                case 'ctrl':
                case 'cmd':
                    if (e.ctrlKey || e.metaKey) {
                        return true;
                    }
                    break;
                case 'alt':
                    if (e.altKey) {
                        return true;
                    }
                    break;
                case 'shift':
                    if (e.shiftKey) {
                        return true;
                    }

            }
            if (keyCode == keymap[key]) {
                return true;
            }
            return false;
        }
        me.on('keydown', function(e) {

            var originEvent = e.originEvent;
            var keyCode = originEvent.keyCode || originEvent.which;
            for (var i in shortcutkeys) {
                var keys = shortcutkeys[i].toLowerCase().split('+');
                var current = 0;
                utils.each(keys, function(i, k) {
                    if (checkkey(k, keyCode, originEvent)) {
                        current++;
                    }
                });

                if (current == keys.length) {
                    if (me.queryCommandState(i) != -1)
                        me.execCommand(i);
                    originEvent.preventDefault();
                    break;
                }

            }
        });
    },
    _initContextmenu: function() {
        this.contextmenus = [];
    },
    addContextmenu: function(item) {
        if (utils.isArray(item)) {
            this.contextmenus = this.contextmenus.concat(item);
        } else {
            this.contextmenus.push(item);
        }

        return this;
    },
    getContextmenu: function() {
        return this.contextmenus;
    },
    _initStatus: function() {
        this._status = 'normal';
        this._rollbackStatus = 'normal';
    },
    setStatus: (function() {
        var sf = ~window.location.href.indexOf('status');
        var tf = ~window.location.href.indexOf('trace');

        return function(status) {
            if (status != this._status) {
                this._rollbackStatus = this._status;
                this._status = status;
                this.fire('statuschange', {
                    lastStatus: this._rollbackStatus,
                    currentStatus: this._status
                });
                if (sf) {
                    console.log(window.event.type, this._rollbackStatus, '->', this._status);
                    if (tf) {
                        console.trace();
                    }
                }
            }
            return this;
        };
    })(),
    rollbackStatus: function() {
        this.setStatus(this._rollbackStatus);
    },
    getStatus: function() {
        return this._status;
    },
    setDisabled: function() {
        var me = this;
        //禁用命令
        me.bkqueryCommandState = me.queryCommandState;
        me.bkqueryCommandValue = me.queryCommandValue;
        me.queryCommandState = function(type) {
            var cmd = this._getCommand(type);
            if (cmd && cmd.enableReadOnly === false) {
                return me.bkqueryCommandState.apply(me, arguments);
            }
            return -1;
        };
        me.queryCommandValue = function(type) {
            var cmd = this._getCommand(type);
            if (cmd && cmd.enableReadOnly === false) {
                return me.bkqueryCommandValue.apply(me, arguments);
            }
            return null;
        };
        this.setStatus('readonly');
        me.fire('interactchange');
    },
    setEnabled: function() {
        var me = this;

        if (me.bkqueryCommandState) {
            me.queryCommandState = me.bkqueryCommandState;
            delete me.bkqueryCommandState;
        }
        if (me.bkqueryCommandValue) {
            me.queryCommandValue = me.bkqueryCommandValue;
            delete me.bkqueryCommandValue;
        }

        this.rollbackStatus();

        me.fire('interactchange');
    }
});