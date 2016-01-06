/*!
 * iScroll v4.2.5 ~ Copyright (c) 2012 Matteo Spinelli, http://cubiq.org
 * Released under MIT license, http://cubiq.org/license
 */
//window.jQuery = Zepto;
(function (window, doc) {
    var m = Math,
        dummyStyle = doc.createElement('div').style,
        vendor = (function () {
            var vendors = 't,webkitT,MozT,msT,OT'.split(','),
                t,
                i = 0,
                l = vendors.length;

            for (; i < l; i++) {
                t = vendors[i] + 'ransform';
                if (t in dummyStyle) {
                    return vendors[i].substr(0, vendors[i].length - 1);
                }
            }

            return false;
        })(),
        cssVendor = vendor ? '-' + vendor.toLowerCase() + '-' : '',

    // Style properties
        transform = prefixStyle('transform'),
        transitionProperty = prefixStyle('transitionProperty'),
        transitionDuration = prefixStyle('transitionDuration'),
        transformOrigin = prefixStyle('transformOrigin'),
        transitionTimingFunction = prefixStyle('transitionTimingFunction'),
        transitionDelay = prefixStyle('transitionDelay'),

    // Browser capabilities
        isAndroid = (/android/gi).test(navigator.appVersion),
        isIDevice = (/iphone|ipad/gi).test(navigator.appVersion),
        isTouchPad = (/hp-tablet/gi).test(navigator.appVersion),

        has3d = prefixStyle('perspective') in dummyStyle,
        hasTouch = 'ontouchstart' in window && !isTouchPad,
        hasTransform = vendor !== false,
        hasTransitionEnd = prefixStyle('transition') in dummyStyle,

        RESIZE_EV = 'onorientationchange' in window ? 'orientationchange' : 'resize',
        START_EV = hasTouch ? 'touchstart' : 'mousedown',
        MOVE_EV = hasTouch ? 'touchmove' : 'mousemove',
        END_EV = hasTouch ? 'touchend' : 'mouseup',
        CANCEL_EV = hasTouch ? 'touchcancel' : 'mouseup',
        TRNEND_EV = (function () {
            if (vendor === false) return false;

            var transitionEnd = {
                '': 'transitionend',
                'webkit': 'webkitTransitionEnd',
                'Moz': 'transitionend',
                'O': 'otransitionend',
                'ms': 'MSTransitionEnd'
            };

            return transitionEnd[vendor];
        })(),

        nextFrame = (function () {
            return window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimationFrame ||
                function (callback) {
                    return setTimeout(callback, 1);
                };
        })(),
        cancelFrame = (function () {
            return window.cancelRequestAnimationFrame ||
                window.webkitCancelAnimationFrame ||
                window.webkitCancelRequestAnimationFrame ||
                window.mozCancelRequestAnimationFrame ||
                window.oCancelRequestAnimationFrame ||
                window.msCancelRequestAnimationFrame ||
                clearTimeout;
        })(),

    // Helpers
        translateZ = has3d ? ' translateZ(0)' : '',

    // Constructor
        iScroll = function (el, options) {
            var that = this,
                i;

            that.wrapper = typeof el == 'object' ? el : doc.getElementById(el);
            that.wrapper.style.overflow = 'hidden';
            that.scroller = that.wrapper.children[0];
            // Default options
            that.options = {
                hScroll: true,
                vScroll: true,
                x: 0,
                y: 0,
                bounce: true,
                bounceLock: false,
                momentum: true,
                lockDirection: true,
                useTransform: true,
                useTransition: false,
                topOffset: 0,
                checkDOMChanges: false,     // Experimental
                handleClick: true,

                // Scrollbar
                hScrollbar: true,
                vScrollbar: true,
                fixedScrollbar: isAndroid,
                hideScrollbar: isIDevice,
                fadeScrollbar: isIDevice && has3d,
                scrollbarClass: '',

                // Zoom
                zoom: false,
                zoomMin: 1,
                zoomMax: 4,
                doubleTapZoom: 2,
                wheelAction: 'scroll',

                // Snap
                snap: false,
                snapThreshold: 1,

                // Events
                onRefresh: null,
                onBeforeScrollStart: function (e) {
                    e.preventDefault();
                },
                onScrollStart: null,
                onBeforeScrollMove: null,
                onScrollMove: null,
                onBeforeScrollEnd: null,
                onScrollEnd: null,
                onTouchEnd: null,
                onDestroy: null,
                onZoomStart: null,
                onZoom: null,
                onZoomEnd: null
            };

            // User defined options
            for (i in options) that.options[i] = options[i];

            // Set starting position
            that.x = that.options.x;
            that.y = that.options.y;

            // Normalize options
            that.options.useTransform = hasTransform && that.options.useTransform;
            that.options.hScrollbar = that.options.hScroll && that.options.hScrollbar;
            that.options.vScrollbar = that.options.vScroll && that.options.vScrollbar;
            that.options.zoom = that.options.useTransform && that.options.zoom;
            that.options.useTransition = hasTransitionEnd && that.options.useTransition;

            // Helpers FIX ANDROID BUG!
            // translate3d and scale doesn't work together!
            // Ignoring 3d ONLY WHEN YOU SET that.options.zoom
            if (that.options.zoom && isAndroid) {
                translateZ = '';
            }

            // Set some default styles
            that.scroller.style[transitionProperty] = that.options.useTransform ? cssVendor + 'transform' : 'top left';
            that.scroller.style[transitionDuration] = '0';
            that.scroller.style[transformOrigin] = '0 0';
            if (that.options.useTransition) that.scroller.style[transitionTimingFunction] = 'cubic-bezier(0.33,0.66,0.66,1)';

            if (that.options.useTransform) that.scroller.style[transform] = 'translate(' + that.x + 'px,' + that.y + 'px)' + translateZ;
            else that.scroller.style.cssText += ';position:absolute;top:' + that.y + 'px;left:' + that.x + 'px';

            if (that.options.useTransition) that.options.fixedScrollbar = true;

            that.refresh();

            that._bind(RESIZE_EV, window);
            that._bind(START_EV);
            if (!hasTouch) {
                if (that.options.wheelAction != 'none') {
                    that._bind('DOMMouseScroll');
                    that._bind('mousewheel');
                }
            }

            if (that.options.checkDOMChanges) that.checkDOMTime = setInterval(function () {
                that._checkDOMChanges();
            }, 500);
        };

// Prototype
    iScroll.prototype = {
        enabled: true,
        x: 0,
        y: 0,
        steps: [],
        scale: 1,
        currPageX: 0, currPageY: 0,
        pagesX: [], pagesY: [],
        aniTime: null,
        wheelZoomCount: 0,

        handleEvent: function (e) {
            var that = this;
            switch (e.type) {
                case START_EV:
                    if (!hasTouch && e.button !== 0) return;
                    that._start(e);
                    break;
                case MOVE_EV:
                    that._move(e);
                    break;
                case END_EV:
                case CANCEL_EV:
                    that._end(e);
                    break;
                case RESIZE_EV:
                    that._resize();
                    break;
                case 'DOMMouseScroll':
                case 'mousewheel':
                    that._wheel(e);
                    break;
                case TRNEND_EV:
                    that._transitionEnd(e);
                    break;
            }
        },

        _checkDOMChanges: function () {
            if (this.moved || this.zoomed || this.animating ||
                (this.scrollerW == this.scroller.offsetWidth * this.scale && this.scrollerH == this.scroller.offsetHeight * this.scale)) return;

            this.refresh();
        },

        _scrollbar: function (dir) {
            var that = this,
                bar;

            if (!that[dir + 'Scrollbar']) {
                if (that[dir + 'ScrollbarWrapper']) {
                    if (hasTransform) that[dir + 'ScrollbarIndicator'].style[transform] = '';
                    that[dir + 'ScrollbarWrapper'].parentNode.removeChild(that[dir + 'ScrollbarWrapper']);
                    that[dir + 'ScrollbarWrapper'] = null;
                    that[dir + 'ScrollbarIndicator'] = null;
                }

                return;
            }

            if (!that[dir + 'ScrollbarWrapper']) {
                // Create the scrollbar wrapper
                bar = doc.createElement('div');

                if (that.options.scrollbarClass) bar.className = that.options.scrollbarClass + dir.toUpperCase();
                else bar.style.cssText = 'position:absolute;z-index:100;' + (dir == 'h' ? 'height:7px;bottom:1px;left:2px;right:' + (that.vScrollbar ? '7' : '2') + 'px' : 'width:7px;bottom:' + (that.hScrollbar ? '7' : '2') + 'px;top:2px;right:1px');

                bar.style.cssText += ';pointer-events:none;' + cssVendor + 'transition-property:opacity;' + cssVendor + 'transition-duration:' + (that.options.fadeScrollbar ? '350ms' : '0') + ';overflow:hidden;opacity:' + (that.options.hideScrollbar ? '0' : '1');

                that.wrapper.appendChild(bar);
                that[dir + 'ScrollbarWrapper'] = bar;

                // Create the scrollbar indicator
                bar = doc.createElement('div');
                if (!that.options.scrollbarClass) {
                    bar.style.cssText = 'position:absolute;z-index:100;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.9);' + cssVendor + 'background-clip:padding-box;' + cssVendor + 'box-sizing:border-box;' + (dir == 'h' ? 'height:100%' : 'width:100%') + ';' + cssVendor + 'border-radius:3px;border-radius:3px';
                }
                bar.style.cssText += ';pointer-events:none;' + cssVendor + 'transition-property:' + cssVendor + 'transform;' + cssVendor + 'transition-timing-function:cubic-bezier(0.33,0.66,0.66,1);' + cssVendor + 'transition-duration:0;' + cssVendor + 'transform: translate(0,0)' + translateZ;
                if (that.options.useTransition) bar.style.cssText += ';' + cssVendor + 'transition-timing-function:cubic-bezier(0.33,0.66,0.66,1)';

                that[dir + 'ScrollbarWrapper'].appendChild(bar);
                that[dir + 'ScrollbarIndicator'] = bar;
            }

            if (dir == 'h') {
                that.hScrollbarSize = that.hScrollbarWrapper.clientWidth;
                that.hScrollbarIndicatorSize = m.max(m.round(that.hScrollbarSize * that.hScrollbarSize / that.scrollerW), 8);
                that.hScrollbarIndicator.style.width = that.hScrollbarIndicatorSize + 'px';
                that.hScrollbarMaxScroll = that.hScrollbarSize - that.hScrollbarIndicatorSize;
                that.hScrollbarProp = that.hScrollbarMaxScroll / that.maxScrollX;
            } else {
                that.vScrollbarSize = that.vScrollbarWrapper.clientHeight;
                that.vScrollbarIndicatorSize = m.max(m.round(that.vScrollbarSize * that.vScrollbarSize / that.scrollerH), 8);
                that.vScrollbarIndicator.style.height = that.vScrollbarIndicatorSize + 'px';
                that.vScrollbarMaxScroll = that.vScrollbarSize - that.vScrollbarIndicatorSize;
                that.vScrollbarProp = that.vScrollbarMaxScroll / that.maxScrollY;
            }

            // Reset position
            that._scrollbarPos(dir, true);
        },

        _resize: function () {
            var that = this;
            setTimeout(function () {
                that.refresh();
            }, isAndroid ? 200 : 0);
        },

        _pos: function (x, y) {
            if (this.zoomed) return;

            x = this.hScroll ? x : 0;
            y = this.vScroll ? y : 0;

            if (this.options.useTransform) {
                this.scroller.style[transform] = 'translate(' + x + 'px,' + y + 'px) scale(' + this.scale + ')' + translateZ;
            } else {
                x = m.round(x);
                y = m.round(y);
                this.scroller.style.left = x + 'px';
                this.scroller.style.top = y + 'px';
            }

            this.x = x;
            this.y = y;

            this._scrollbarPos('h');
            this._scrollbarPos('v');
        },

        _scrollbarPos: function (dir, hidden) {
            var that = this,
                pos = dir == 'h' ? that.x : that.y,
                size;

            if (!that[dir + 'Scrollbar']) return;

            pos = that[dir + 'ScrollbarProp'] * pos;

            if (pos < 0) {
                if (!that.options.fixedScrollbar) {
                    size = that[dir + 'ScrollbarIndicatorSize'] + m.round(pos * 3);
                    if (size < 8) size = 8;
                    that[dir + 'ScrollbarIndicator'].style[dir == 'h' ? 'width' : 'height'] = size + 'px';
                }
                pos = 0;
            } else if (pos > that[dir + 'ScrollbarMaxScroll']) {
                if (!that.options.fixedScrollbar) {
                    size = that[dir + 'ScrollbarIndicatorSize'] - m.round((pos - that[dir + 'ScrollbarMaxScroll']) * 3);
                    if (size < 8) size = 8;
                    that[dir + 'ScrollbarIndicator'].style[dir == 'h' ? 'width' : 'height'] = size + 'px';
                    pos = that[dir + 'ScrollbarMaxScroll'] + (that[dir + 'ScrollbarIndicatorSize'] - size);
                } else {
                    pos = that[dir + 'ScrollbarMaxScroll'];
                }
            }

            that[dir + 'ScrollbarWrapper'].style[transitionDelay] = '0';
            that[dir + 'ScrollbarWrapper'].style.opacity = hidden && that.options.hideScrollbar ? '0' : '1';
            that[dir + 'ScrollbarIndicator'].style[transform] = 'translate(' + (dir == 'h' ? pos + 'px,0)' : '0,' + pos + 'px)') + translateZ;
        },

        _start: function (e) {
            var that = this,
                point = hasTouch ? e.touches[0] : e,
                matrix, x, y,
                c1, c2;

            if (!that.enabled) return;

            if (that.options.onBeforeScrollStart) that.options.onBeforeScrollStart.call(that, e);

            if (that.options.useTransition || that.options.zoom) that._transitionTime(0);

            that.moved = false;
            that.animating = false;
            that.zoomed = false;
            that.distX = 0;
            that.distY = 0;
            that.absDistX = 0;
            that.absDistY = 0;
            that.dirX = 0;
            that.dirY = 0;

            // Gesture start
            if (that.options.zoom && hasTouch && e.touches.length > 1) {
                c1 = m.abs(e.touches[0].pageX - e.touches[1].pageX);
                c2 = m.abs(e.touches[0].pageY - e.touches[1].pageY);
                that.touchesDistStart = m.sqrt(c1 * c1 + c2 * c2);

                that.originX = m.abs(e.touches[0].pageX + e.touches[1].pageX - that.wrapperOffsetLeft * 2) / 2 - that.x;
                that.originY = m.abs(e.touches[0].pageY + e.touches[1].pageY - that.wrapperOffsetTop * 2) / 2 - that.y;

                if (that.options.onZoomStart) that.options.onZoomStart.call(that, e);
            }

            if (that.options.momentum) {
                if (that.options.useTransform) {
                    // Very lame general purpose alternative to CSSMatrix
                    matrix = getComputedStyle(that.scroller, null)[transform].replace(/[^0-9\-.,]/g, '').split(',');
                    x = +(matrix[12] || matrix[4]);
                    y = +(matrix[13] || matrix[5]);
                } else {
                    x = +getComputedStyle(that.scroller, null).left.replace(/[^0-9-]/g, '');
                    y = +getComputedStyle(that.scroller, null).top.replace(/[^0-9-]/g, '');
                }

                if (x != that.x || y != that.y) {
                    if (that.options.useTransition) that._unbind(TRNEND_EV);
                    else cancelFrame(that.aniTime);
                    that.steps = [];
                    that._pos(x, y);
                    if (that.options.onScrollEnd) that.options.onScrollEnd.call(that);
                }
            }

            that.absStartX = that.x;    // Needed by snap threshold
            that.absStartY = that.y;

            that.startX = that.x;
            that.startY = that.y;
            that.pointX = point.pageX;
            that.pointY = point.pageY;

            that.startTime = e.timeStamp || Date.now();

            if (that.options.onScrollStart) that.options.onScrollStart.call(that, e);

            that._bind(MOVE_EV, window);
            that._bind(END_EV, window);
            that._bind(CANCEL_EV, window);
        },

        _move: function (e) {
            var that = this,
                point = hasTouch ? e.touches[0] : e,
                deltaX = point.pageX - that.pointX,
                deltaY = point.pageY - that.pointY,
                newX = that.x + deltaX,
                newY = that.y + deltaY,
                c1, c2, scale,
                timestamp = e.timeStamp || Date.now();

            if (that.options.onBeforeScrollMove) that.options.onBeforeScrollMove.call(that, e);

            // Zoom
            if (that.options.zoom && hasTouch && e.touches.length > 1) {
                c1 = m.abs(e.touches[0].pageX - e.touches[1].pageX);
                c2 = m.abs(e.touches[0].pageY - e.touches[1].pageY);
                that.touchesDist = m.sqrt(c1 * c1 + c2 * c2);

                that.zoomed = true;

                scale = 1 / that.touchesDistStart * that.touchesDist * this.scale;

                if (scale < that.options.zoomMin) scale = 0.5 * that.options.zoomMin * Math.pow(2.0, scale / that.options.zoomMin);
                else if (scale > that.options.zoomMax) scale = 2.0 * that.options.zoomMax * Math.pow(0.5, that.options.zoomMax / scale);

                that.lastScale = scale / this.scale;

                newX = this.originX - this.originX * that.lastScale + this.x;
                newY = this.originY - this.originY * that.lastScale + this.y;

                this.scroller.style[transform] = 'translate(' + newX + 'px,' + newY + 'px) scale(' + scale + ')' + translateZ;

                if (that.options.onZoom) that.options.onZoom.call(that, e);
                return;
            }

            that.pointX = point.pageX;
            that.pointY = point.pageY;

            // Slow down if outside of the boundaries
            if (newX > 0 || newX < that.maxScrollX) {
                newX = that.options.bounce ? that.x + (deltaX / 2) : newX >= 0 || that.maxScrollX >= 0 ? 0 : that.maxScrollX;
            }
            if (newY > that.minScrollY || newY < that.maxScrollY) {
                newY = that.options.bounce ? that.y + (deltaY / 2) : newY >= that.minScrollY || that.maxScrollY >= 0 ? that.minScrollY : that.maxScrollY;
            }

            that.distX += deltaX;
            that.distY += deltaY;
            that.absDistX = m.abs(that.distX);
            that.absDistY = m.abs(that.distY);

            if (that.absDistX < 6 && that.absDistY < 6) {
                return;
            }

            // Lock direction
            if (that.options.lockDirection) {
                if (that.absDistX > that.absDistY + 5) {
                    newY = that.y;
                    deltaY = 0;
                } else if (that.absDistY > that.absDistX + 5) {
                    newX = that.x;
                    deltaX = 0;
                }
            }

            that.moved = true;
            that._pos(newX, newY);
            that.dirX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
            that.dirY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0;

            if (timestamp - that.startTime > 300) {
                that.startTime = timestamp;
                that.startX = that.x;
                that.startY = that.y;
            }

            if (that.options.onScrollMove) that.options.onScrollMove.call(that, e);
        },

        _end: function (e) {
            if (hasTouch && e.touches.length !== 0) return;

            var that = this,
                point = hasTouch ? e.changedTouches[0] : e,
                target, ev,
                momentumX = {dist: 0, time: 0},
                momentumY = {dist: 0, time: 0},
                duration = (e.timeStamp || Date.now()) - that.startTime,
                newPosX = that.x,
                newPosY = that.y,
                distX, distY,
                newDuration,
                snap,
                scale;

            that._unbind(MOVE_EV, window);
            that._unbind(END_EV, window);
            that._unbind(CANCEL_EV, window);

            if (that.options.onBeforeScrollEnd) that.options.onBeforeScrollEnd.call(that, e);

            if (that.zoomed) {
                scale = that.scale * that.lastScale;
                scale = Math.max(that.options.zoomMin, scale);
                scale = Math.min(that.options.zoomMax, scale);
                that.lastScale = scale / that.scale;
                that.scale = scale;

                that.x = that.originX - that.originX * that.lastScale + that.x;
                that.y = that.originY - that.originY * that.lastScale + that.y;

                that.scroller.style[transitionDuration] = '200ms';
                that.scroller.style[transform] = 'translate(' + that.x + 'px,' + that.y + 'px) scale(' + that.scale + ')' + translateZ;

                that.zoomed = false;
                that.refresh();

                if (that.options.onZoomEnd) that.options.onZoomEnd.call(that, e);
                return;
            }

            if (!that.moved) {
                if (hasTouch) {
                    if (that.doubleTapTimer && that.options.zoom) {
                        // Double tapped
                        clearTimeout(that.doubleTapTimer);
                        that.doubleTapTimer = null;
                        if (that.options.onZoomStart) that.options.onZoomStart.call(that, e);
                        that.zoom(that.pointX, that.pointY, that.scale == 1 ? that.options.doubleTapZoom : 1);
                        if (that.options.onZoomEnd) {
                            setTimeout(function () {
                                that.options.onZoomEnd.call(that, e);
                            }, 200); // 200 is default zoom duration
                        }
                    } else if (this.options.handleClick) {
                        that.doubleTapTimer = setTimeout(function () {
                            that.doubleTapTimer = null;

                            // Find the last touched element
                            target = point.target;
                            while (target.nodeType != 1) target = target.parentNode;

                            if (target.tagName != 'SELECT' && target.tagName != 'INPUT' && target.tagName != 'TEXTAREA') {
                                ev = doc.createEvent('MouseEvents');
                                ev.initMouseEvent('click', true, true, e.view, 1,
                                    point.screenX, point.screenY, point.clientX, point.clientY,
                                    e.ctrlKey, e.altKey, e.shiftKey, e.metaKey,
                                    0, null);
                                ev._fake = true;
                                target.dispatchEvent(ev);
                            }
                        }, that.options.zoom ? 250 : 0);
                    }
                }

                that._resetPos(400);

                if (that.options.onTouchEnd) that.options.onTouchEnd.call(that, e);
                return;
            }

            if (duration < 300 && that.options.momentum) {
                momentumX = newPosX ? that._momentum(newPosX - that.startX, duration, -that.x, that.scrollerW - that.wrapperW + that.x, that.options.bounce ? that.wrapperW : 0) : momentumX;
                momentumY = newPosY ? that._momentum(newPosY - that.startY, duration, -that.y, (that.maxScrollY < 0 ? that.scrollerH - that.wrapperH + that.y - that.minScrollY : 0), that.options.bounce ? that.wrapperH : 0) : momentumY;

                newPosX = that.x + momentumX.dist;
                newPosY = that.y + momentumY.dist;

                if ((that.x > 0 && newPosX > 0) || (that.x < that.maxScrollX && newPosX < that.maxScrollX)) momentumX = {
                    dist: 0,
                    time: 0
                };
                if ((that.y > that.minScrollY && newPosY > that.minScrollY) || (that.y < that.maxScrollY && newPosY < that.maxScrollY)) momentumY = {
                    dist: 0,
                    time: 0
                };
            }

            if (momentumX.dist || momentumY.dist) {
                newDuration = m.max(m.max(momentumX.time, momentumY.time), 10);

                // Do we need to snap?
                if (that.options.snap) {
                    distX = newPosX - that.absStartX;
                    distY = newPosY - that.absStartY;
                    if (m.abs(distX) < that.options.snapThreshold && m.abs(distY) < that.options.snapThreshold) {
                        that.scrollTo(that.absStartX, that.absStartY, 200);
                    }
                    else {
                        snap = that._snap(newPosX, newPosY);
                        newPosX = snap.x;
                        newPosY = snap.y;
                        newDuration = m.max(snap.time, newDuration);
                    }
                }

                that.scrollTo(m.round(newPosX), m.round(newPosY), newDuration);

                if (that.options.onTouchEnd) that.options.onTouchEnd.call(that, e);
                return;
            }

            // Do we need to snap?
            if (that.options.snap) {
                distX = newPosX - that.absStartX;
                distY = newPosY - that.absStartY;
                if (m.abs(distX) < that.options.snapThreshold && m.abs(distY) < that.options.snapThreshold) that.scrollTo(that.absStartX, that.absStartY, 200);
                else {
                    snap = that._snap(that.x, that.y);
                    if (snap.x != that.x || snap.y != that.y) that.scrollTo(snap.x, snap.y, snap.time);
                }

                if (that.options.onTouchEnd) that.options.onTouchEnd.call(that, e);
                return;
            }

            that._resetPos(200);
            if (that.options.onTouchEnd) that.options.onTouchEnd.call(that, e);
        },

        _resetPos: function (time) {
            var that = this,
                resetX = that.x >= 0 ? 0 : that.x < that.maxScrollX ? that.maxScrollX : that.x,
                resetY = that.y >= that.minScrollY || that.maxScrollY > 0 ? that.minScrollY : that.y < that.maxScrollY ? that.maxScrollY : that.y;

            if (resetX == that.x && resetY == that.y) {
                if (that.moved) {
                    that.moved = false;
                    if (that.options.onScrollEnd) that.options.onScrollEnd.call(that);      // Execute custom code on scroll end
                }

                if (that.hScrollbar && that.options.hideScrollbar) {
                    if (vendor == 'webkit') that.hScrollbarWrapper.style[transitionDelay] = '300ms';
                    that.hScrollbarWrapper.style.opacity = '0';
                }
                if (that.vScrollbar && that.options.hideScrollbar) {
                    if (vendor == 'webkit') that.vScrollbarWrapper.style[transitionDelay] = '300ms';
                    that.vScrollbarWrapper.style.opacity = '0';
                }

                return;
            }

            that.scrollTo(resetX, resetY, time || 0);
        },

        _wheel: function (e) {
            var that = this,
                wheelDeltaX, wheelDeltaY,
                deltaX, deltaY,
                deltaScale;

            if ('wheelDeltaX' in e) {
                wheelDeltaX = e.wheelDeltaX / 12;
                wheelDeltaY = e.wheelDeltaY / 12;
            } else if ('wheelDelta' in e) {
                wheelDeltaX = wheelDeltaY = e.wheelDelta / 12;
            } else if ('detail' in e) {
                wheelDeltaX = wheelDeltaY = -e.detail * 3;
            } else {
                return;
            }

            if (that.options.wheelAction == 'zoom') {
                deltaScale = that.scale * Math.pow(2, 1 / 3 * (wheelDeltaY ? wheelDeltaY / Math.abs(wheelDeltaY) : 0));
                if (deltaScale < that.options.zoomMin) deltaScale = that.options.zoomMin;
                if (deltaScale > that.options.zoomMax) deltaScale = that.options.zoomMax;

                if (deltaScale != that.scale) {
                    if (!that.wheelZoomCount && that.options.onZoomStart) that.options.onZoomStart.call(that, e);
                    that.wheelZoomCount++;

                    that.zoom(e.pageX, e.pageY, deltaScale, 400);

                    setTimeout(function () {
                        that.wheelZoomCount--;
                        if (!that.wheelZoomCount && that.options.onZoomEnd) that.options.onZoomEnd.call(that, e);
                    }, 400);
                }

                return;
            }

            deltaX = that.x + wheelDeltaX;
            deltaY = that.y + wheelDeltaY;

            if (deltaX > 0) deltaX = 0;
            else if (deltaX < that.maxScrollX) deltaX = that.maxScrollX;

            if (deltaY > that.minScrollY) deltaY = that.minScrollY;
            else if (deltaY < that.maxScrollY) deltaY = that.maxScrollY;

            if (that.maxScrollY < 0) {
                that.scrollTo(deltaX, deltaY, 0);
            }
        },

        _transitionEnd: function (e) {
            var that = this;

            if (e.target != that.scroller) return;

            that._unbind(TRNEND_EV);

            that._startAni();
        },


        /**
         *
         * Utilities
         *
         */
        _startAni: function () {
            var that = this,
                startX = that.x, startY = that.y,
                startTime = Date.now(),
                step, easeOut,
                animate;

            if (that.animating) return;

            if (!that.steps.length) {
                that._resetPos(400);
                return;
            }

            step = that.steps.shift();

            if (step.x == startX && step.y == startY) step.time = 0;

            that.animating = true;
            that.moved = true;

            if (that.options.useTransition) {
                that._transitionTime(step.time);
                that._pos(step.x, step.y);
                that.animating = false;
                if (step.time) that._bind(TRNEND_EV);
                else that._resetPos(0);
                return;
            }

            animate = function () {
                var now = Date.now(),
                    newX, newY;

                if (now >= startTime + step.time) {
                    that._pos(step.x, step.y);
                    that.animating = false;
                    if (that.options.onAnimationEnd) that.options.onAnimationEnd.call(that);            // Execute custom code on animation end
                    that._startAni();
                    return;
                }

                now = (now - startTime) / step.time - 1;
                easeOut = m.sqrt(1 - now * now);
                newX = (step.x - startX) * easeOut + startX;
                newY = (step.y - startY) * easeOut + startY;
                that._pos(newX, newY);
                if (that.animating) that.aniTime = nextFrame(animate);
            };

            animate();
        },

        _transitionTime: function (time) {
            time += 'ms';
            this.scroller.style[transitionDuration] = time;
            if (this.hScrollbar) this.hScrollbarIndicator.style[transitionDuration] = time;
            if (this.vScrollbar) this.vScrollbarIndicator.style[transitionDuration] = time;
        },

        _momentum: function (dist, time, maxDistUpper, maxDistLower, size) {
            var deceleration = 0.0006,
                speed = m.abs(dist) / time,
                newDist = (speed * speed) / (2 * deceleration),
                newTime = 0, outsideDist = 0;

            // Proportinally reduce speed if we are outside of the boundaries
            if (dist > 0 && newDist > maxDistUpper) {
                outsideDist = size / (6 / (newDist / speed * deceleration));
                maxDistUpper = maxDistUpper + outsideDist;
                speed = speed * maxDistUpper / newDist;
                newDist = maxDistUpper;
            } else if (dist < 0 && newDist > maxDistLower) {
                outsideDist = size / (6 / (newDist / speed * deceleration));
                maxDistLower = maxDistLower + outsideDist;
                speed = speed * maxDistLower / newDist;
                newDist = maxDistLower;
            }

            newDist = newDist * (dist < 0 ? -1 : 1);
            newTime = speed / deceleration;

            return {dist: newDist, time: m.round(newTime)};
        },

        _offset: function (el) {
            var left = -el.offsetLeft,
                top = -el.offsetTop;

            while (el = el.offsetParent) {
                left -= el.offsetLeft;
                top -= el.offsetTop;
            }

            if (el != this.wrapper) {
                left *= this.scale;
                top *= this.scale;
            }

            return {left: left, top: top};
        },

        _snap: function (x, y) {
            var that = this,
                i, l,
                page, time,
                sizeX, sizeY;

            // Check page X
            page = that.pagesX.length - 1;
            for (i = 0, l = that.pagesX.length; i < l; i++) {
                if (x >= that.pagesX[i]) {
                    page = i;
                    break;
                }
            }
            if (page == that.currPageX && page > 0 && that.dirX < 0) page--;
            x = that.pagesX[page];
            sizeX = m.abs(x - that.pagesX[that.currPageX]);
            sizeX = sizeX ? m.abs(that.x - x) / sizeX * 500 : 0;
            that.currPageX = page;

            // Check page Y
            page = that.pagesY.length - 1;
            for (i = 0; i < page; i++) {
                if (y >= that.pagesY[i]) {
                    page = i;
                    break;
                }
            }
            if (page == that.currPageY && page > 0 && that.dirY < 0) page--;
            y = that.pagesY[page];
            sizeY = m.abs(y - that.pagesY[that.currPageY]);
            sizeY = sizeY ? m.abs(that.y - y) / sizeY * 500 : 0;
            that.currPageY = page;

            // Snap with constant speed (proportional duration)
            time = m.round(m.max(sizeX, sizeY)) || 200;

            return {x: x, y: y, time: time};
        },

        _bind: function (type, el, bubble) {
            (el || this.scroller).addEventListener(type, this, !!bubble);
        },

        _unbind: function (type, el, bubble) {
            (el || this.scroller).removeEventListener(type, this, !!bubble);
        },


        /**
         *
         * Public methods
         *
         */
        destroy: function () {
            var that = this;

            that.scroller.style[transform] = '';

            // Remove the scrollbars
            that.hScrollbar = false;
            that.vScrollbar = false;
            that._scrollbar('h');
            that._scrollbar('v');

            // Remove the event listeners
            that._unbind(RESIZE_EV, window);
            that._unbind(START_EV);
            that._unbind(MOVE_EV, window);
            that._unbind(END_EV, window);
            that._unbind(CANCEL_EV, window);

            if (!that.options.hasTouch) {
                that._unbind('DOMMouseScroll');
                that._unbind('mousewheel');
            }

            if (that.options.useTransition) that._unbind(TRNEND_EV);

            if (that.options.checkDOMChanges) clearInterval(that.checkDOMTime);

            if (that.options.onDestroy) that.options.onDestroy.call(that);
        },

        refresh: function () {
            var that = this,
                offset,
                i, l,
                els,
                pos = 0,
                page = 0;

            if (that.scale < that.options.zoomMin) that.scale = that.options.zoomMin;
            that.wrapperW = that.wrapper.clientWidth || 1;
            that.wrapperH = that.wrapper.clientHeight || 1;

            that.minScrollY = -that.options.topOffset || 0;
            that.scrollerW = m.round(that.scroller.offsetWidth * that.scale);
            that.scrollerH = m.round((that.scroller.offsetHeight + that.minScrollY) * that.scale);
            that.maxScrollX = that.wrapperW - that.scrollerW;
            that.maxScrollY = that.wrapperH - that.scrollerH + that.minScrollY;
            that.dirX = 0;
            that.dirY = 0;

            if (that.options.onRefresh) that.options.onRefresh.call(that);

            that.hScroll = that.options.hScroll && that.maxScrollX < 0;
            that.vScroll = that.options.vScroll && (!that.options.bounceLock && !that.hScroll || that.scrollerH > that.wrapperH);

            that.hScrollbar = that.hScroll && that.options.hScrollbar;
            that.vScrollbar = that.vScroll && that.options.vScrollbar && that.scrollerH > that.wrapperH;

            offset = that._offset(that.wrapper);
            that.wrapperOffsetLeft = -offset.left;
            that.wrapperOffsetTop = -offset.top;

            // Prepare snap
            if (typeof that.options.snap == 'string') {
                that.pagesX = [];
                that.pagesY = [];
                els = that.scroller.querySelectorAll(that.options.snap);
                for (i = 0, l = els.length; i < l; i++) {
                    pos = that._offset(els[i]);
                    pos.left += that.wrapperOffsetLeft;
                    pos.top += that.wrapperOffsetTop;
                    that.pagesX[i] = pos.left < that.maxScrollX ? that.maxScrollX : pos.left * that.scale;
                    that.pagesY[i] = pos.top < that.maxScrollY ? that.maxScrollY : pos.top * that.scale;
                }
            } else if (that.options.snap) {
                that.pagesX = [];
                while (pos >= that.maxScrollX) {
                    that.pagesX[page] = pos;
                    pos = pos - that.wrapperW;
                    page++;
                }
                if (that.maxScrollX % that.wrapperW) that.pagesX[that.pagesX.length] = that.maxScrollX - that.pagesX[that.pagesX.length - 1] + that.pagesX[that.pagesX.length - 1];

                pos = 0;
                page = 0;
                that.pagesY = [];
                while (pos >= that.maxScrollY) {
                    that.pagesY[page] = pos;
                    pos = pos - that.wrapperH;
                    page++;
                }
                if (that.maxScrollY % that.wrapperH) that.pagesY[that.pagesY.length] = that.maxScrollY - that.pagesY[that.pagesY.length - 1] + that.pagesY[that.pagesY.length - 1];
            }

            // Prepare the scrollbars
            that._scrollbar('h');
            that._scrollbar('v');

            if (!that.zoomed) {
                that.scroller.style[transitionDuration] = '0';
                that._resetPos(400);
            }
        },

        scrollTo: function (x, y, time, relative) {
            var that = this,
                step = x,
                i, l;

            that.stop();

            if (!step.length) step = [{x: x, y: y, time: time, relative: relative}];

            for (i = 0, l = step.length; i < l; i++) {
                if (step[i].relative) {
                    step[i].x = that.x - step[i].x;
                    step[i].y = that.y - step[i].y;
                }
                that.steps.push({x: step[i].x, y: step[i].y, time: step[i].time || 0});
            }

            that._startAni();
        },

        scrollToElement: function (el, time) {
            var that = this, pos;
            el = el.nodeType ? el : that.scroller.querySelector(el);
            if (!el) return;

            pos = that._offset(el);
            pos.left += that.wrapperOffsetLeft;
            pos.top += that.wrapperOffsetTop;

            pos.left = pos.left > 0 ? 0 : pos.left < that.maxScrollX ? that.maxScrollX : pos.left;
            pos.top = pos.top > that.minScrollY ? that.minScrollY : pos.top < that.maxScrollY ? that.maxScrollY : pos.top;
            time = time === undefined ? m.max(m.abs(pos.left) * 2, m.abs(pos.top) * 2) : time;

            that.scrollTo(pos.left, pos.top, time);
        },

        scrollToPage: function (pageX, pageY, time) {
            var that = this, x, y;

            time = time === undefined ? 400 : time;

            if (that.options.onScrollStart) that.options.onScrollStart.call(that);

            if (that.options.snap) {
                pageX = pageX == 'next' ? that.currPageX + 1 : pageX == 'prev' ? that.currPageX - 1 : pageX;
                pageY = pageY == 'next' ? that.currPageY + 1 : pageY == 'prev' ? that.currPageY - 1 : pageY;

                pageX = pageX < 0 ? 0 : pageX > that.pagesX.length - 1 ? that.pagesX.length - 1 : pageX;
                pageY = pageY < 0 ? 0 : pageY > that.pagesY.length - 1 ? that.pagesY.length - 1 : pageY;

                that.currPageX = pageX;
                that.currPageY = pageY;
                x = that.pagesX[pageX];
                y = that.pagesY[pageY];
            } else {
                x = -that.wrapperW * pageX;
                y = -that.wrapperH * pageY;
                if (x < that.maxScrollX) x = that.maxScrollX;
                if (y < that.maxScrollY) y = that.maxScrollY;
            }

            that.scrollTo(x, y, time);
        },

        disable: function () {
            this.stop();
            this._resetPos(0);
            this.enabled = false;

            // If disabled after touchstart we make sure that there are no left over events
            this._unbind(MOVE_EV, window);
            this._unbind(END_EV, window);
            this._unbind(CANCEL_EV, window);
        },

        enable: function () {
            this.enabled = true;
        },

        stop: function () {
            if (this.options.useTransition) this._unbind(TRNEND_EV);
            else cancelFrame(this.aniTime);
            this.steps = [];
            this.moved = false;
            this.animating = false;
        },

        zoom: function (x, y, scale, time) {
            var that = this,
                relScale = scale / that.scale;

            if (!that.options.useTransform) return;

            that.zoomed = true;
            time = time === undefined ? 200 : time;
            x = x - that.wrapperOffsetLeft - that.x;
            y = y - that.wrapperOffsetTop - that.y;
            that.x = x - x * relScale + that.x;
            that.y = y - y * relScale + that.y;

            that.scale = scale;
            that.refresh();

            that.x = that.x > 0 ? 0 : that.x < that.maxScrollX ? that.maxScrollX : that.x;
            that.y = that.y > that.minScrollY ? that.minScrollY : that.y < that.maxScrollY ? that.maxScrollY : that.y;

            that.scroller.style[transitionDuration] = time + 'ms';
            that.scroller.style[transform] = 'translate(' + that.x + 'px,' + that.y + 'px) scale(' + scale + ')' + translateZ;
            that.zoomed = false;
        },

        isReady: function () {
            return !this.moved && !this.zoomed && !this.animating;
        }
    };

    function prefixStyle(style) {
        if (vendor === '') return style;

        style = style.charAt(0).toUpperCase() + style.substr(1);
        return vendor + style;
    }

    dummyStyle = null;  // for the sake of it

    if (typeof exports !== 'undefined') exports.iScroll = iScroll;
    else window.iScroll = iScroll;

})(window, document);
/*
 *@NOTICE:common.js作为全站公用文件，其主要功能为：
 A:创建一个全局的命名空间，对常用的零散功能进行归类和管理
 B:对JQ类库以及宿主对象做适当的扩充
 C:针对部分TZT特有的方法进行管理扩充
 *@ALT：公共类会保持定期的更新，请勿擅自修改,如发现有BUG请联系开发人员
 *@author:YYY 1037159943@qq.com  13282131370
 *@version:v1.0
 *@结构说明：见同目录文档

 */
var TZT = {};

function fnTZT() {
    var
        _floder = '/hxlc',//项目根目录
    /*时间戳*/
        _tag = new Date().getTime(),
    //前端资源管理
        _host = {
            DN: location.href.slice(0, location.href.indexOf(_floder)),
            PACKAGE: _floder + "/package/",
            COMCSS: _floder + "/common/css/",
            COMJS: _floder + "/common/js/",
            COMIMG: _floder + "/common/img/",
            BASEJS: function () {
                var oTHIS = this;
                return (oTHIS.DN + oTHIS.COMJS + 'common-min.js');
            },
            BASECSS: function () {
                var oTHIS = this;
                return (oTHIS.DN + oTHIS.COMCSS + 'base-min.css');
            },
            CITYMESG: function () {
                var oTHIS = this;
                return (oTHIS.DN + oTHIS.COMJS + 'cityMesg-min.js');
            }
        },
        _req = {
            XML: '/reqxml?', //请求服务器数据
            LOCAL: '/reqlocal?',//请求客户端数据
            BINARY: '/reqbinary?',//请求服务器文件数据
            SAVEMAP: '/reqsavemap?',//请求本地保存数据
            READMAP: '/reqreadmap?',//读取本地保存数据
            SAVEFILE: '/reqsavefile?',//请求本地保存文件
            READFILE: '/reqreadfile?',//读取本地保存文件
            SOFTTODO: '/reqsofttodo?',//设置本地数据
            LOADFILE: '/reqloadfile?',//加载本地文件
            SIGNATURE: '/reqsignature?',//请求签名数据
            TZTVEDIO: '/tztvideo?'//本地播放指定URL视频
        },
        _gowhere = {
            G1964: '/action:1964/?',//关闭当前页面，打开新页面
            G3413: '/action:3413/?',//关闭当前页面
            G10002: '/action:10002/?',//关闭当前页面，返回前一页面
            G10049: '/action:10049/?',//是否显示进度条
            G10050: '/action:10050/?',//视频验证
            G10051: '/action:10051/?',//拍照
            G10052: '/action:10052/?',//证书申请并安装
            G10053: '/action:10053/?',//证书校验
            G10054: '/action:10054/?',//下载并打开下载文件
            G10055: '/action:10055/?',//分享
            G10060: '/action:10060/?',//打开指定URL并定制右上角操作
            G10061: '/action:10061/?',//打开指定URL并定制右上角操作
            G10062: '/action:10062/?',//获取GPS位置，并打开指定URL
            G10063: '/action:10063/?',//调用个股查询界面，获取查询结果，并调用指定js返回
            G10068: '/action:10068/?',//打开专题指定URI

            G10064: '/action:10064/?',//华泰-个人中心
            G10065: '/action:10065/?',//华泰-商城
            G10066: '/action:10066/?',//华泰-添加账户
            G10067: '/action:10067/?',//华泰-切换账户

            G10069: '/action:10069/?',//华西-PK
            G2608: '/action:2608/?',//华西-组合申购
            G2615: '/action:2615/?',//华西-组合说明

            G10070: '/action:10070/?',//银联支付
            G10071: '/action:10071/?',//清理通知栏
            G10302: '/action:10302/?',//系统登出
            G10330: '/action:10330/?',//升级版本
            G10090: '/action:10090/?'//调用客户端登陆界面
        },
    //常用附件类型判断
        _fileType = {
            'application/msword': 'doc',
            'application/pdf': 'pdf',
            'application/x-shockwave-flash': 'swf',
            'application/zip': 'zip',
            'audio/mpeg': 'mp3',
            'audio/x-wav': 'wav',
            'image/gif': 'gif',
            'image/jpeg': 'jpeg',
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'text/css': 'css',
            'text/html': 'html',
            'text/htm': 'htm',
            'text/plain': 'txt'
        },
    //常用正则表达式集合
        _reg = {
            //中文姓名
            "NAME": /^[\u4e00-\u9fa5]{2,8}$/i,

            //一个或多个空格
            "SPACE": /\s+/g,

            //手机号码验证
            "PHONE": /^1(33|42|44|46|48|49|53|80|81|89|30|31|32|41|43|45|55|56|85|86|34|35|36|37|38|39|40|47|50|51|52|57|58|59|82|83|87|88|77|76|84|78|70)[0-9]{8}$/,
            //六位数字验证
            "SIXNUM": /^\d{6}$/,
            //发证机关
            "ISSUING": /^[\u4e00-\u9fa5]{4,}/,
            //6位长度密码（中英文字母加下划线）
            "PASSWORD": /^\w{6}$/,
            //QQ号码
            'QQ': /^[1-9][0-9]{4,12}$/,
            //邮箱地址
            "EMAIL": /^(\w)+(\.\w+)*@(\w)+((\.\w+)+)$/,
            //银行卡号
            "BANKNUM": /^\d{16,19}$/,
            //座机号码
            "TELNO": /^0\d{2,3}-?\d{7,8}-?(\d{1,6})?$/,
            //日期验证，格式为 20140221 ,2014/02/21,2014-02-21,2014.02.21
            "DATE": /^(?:(?:1[0-9]|[0-9]{2})[0-9]{2}([-/.]?)(?:(?:0?[1-9]|1[0-2])\1(?:0?[1-9]|1[0-9]|2[0-8])|(?:0?[13-9]|1[0-2])\1(?:29|30)|(?:0?[13578]|1[02])\1(?:31))|(?:(?:1[6-9]|[2-9][0-9])(?:0[48]|[2468][048]|[13579][26])|(?:16|[2468][048]|[3579][26])00)([-/.]?)0?2\2(?:29))$/,
            //HTML标签
            "HTMLTAG": /<[^>]*?>/g
        },
        _splitTag = {
            A: '@', D: ',', F: ';', S: '|', M: ':', Y1: '&', Y2: '&&', Q: '$'
        },
        _baseVar = {
            //局部公用设备信息变量
            ISDEV: true,
            FOLDER: _floder,
            APP: navigator.appVersion,
            APPVERSION: navigator.appVersion.toLocaleLowerCase(),
            ISANDROID: (/android/i).test(navigator.appVersion),
            ISIOS: (/iphone|ipad/i).test(navigator.appVersion),  //isIDevice
            ISPLAYBOOK: (/playbook/i).test(navigator.appVersion),
            ISTOUCHPAD: (/hp-tablet/i).test(navigator.appVersion),
            _PHONEEVENT: ['touchstart', 'touchmove', 'touchend', 'touchcancel'],//touch Event
            _MOUSEEVENT: ['mousedown', 'mousemove', 'mouseup', 'mouseup'],//mouse Event
            HASTOUCH: function () {
                return ( ('ontouchstart' in window) && !this.ISTOUCHPAD);
            },//检测是否有触摸{事件}对象
            //事件兼容性
            STARTEVENT: function () {
                return (this.HASTOUCH() ? this._PHONEEVENT[0] : this._MOUSEEVENT[0]);
            },
            MOVEEVENT: function () {
                return (this.HASTOUCH() ? this._PHONEEVENT[1] : this._MOUSEEVENT[1]);
            },
            ENDEVENT: function () {
                return (this.HASTOUCH() ? this._PHONEEVENT[2] : this._MOUSEEVENT[2]);
            },
            CANCELEVENT: function () {
                return (this.HASTOUCH() ? this._PHONEEVENT[3] : this._MOUSEEVENT[3]);
            }
        },
        _tools = {
            /*@保存信息到本地客户端
             *@param obj {object} - 要保存的对象型数据 - 必要性 - Y
             *@param fnSuccess {function} - 成功保存的回调函数 ，可接收一个Boolean类型参数 - 必要性 - N
             *@return void
             */
            saveMapMesg: function (obj, fnSccess) {
                var sSendURL = '';
                for (var x in obj) {
                    sSendURL += x + "=" + obj[x] + "&";
                }
                sSendURL = sSendURL.slice(0, -1);
                $.ajax({
                    url: '/reqsavemap?',
                    data: obj,
                    success: function (oData) {
                        fnSccess && fnSccess(oData);
                    }
                })
            },
            readLocalMesg: function (sArray, fnSuccess) {
                var sSendURL = '', oThis = this;
                for (var x = 0; x < sArray.length; x++) {
                    sSendURL += sArray[x] + "=" + "&";
                }
                sSendURL = sSendURL.slice(0, -1);
                $.ajax({
                    url: "/reqlocal?" + sSendURL,
                    success: function (oData) {
                        fnSuccess && fnSuccess(oData);
                    }
                })
            },
            reqSoftTodo: function (obj, fnSccess) {
                var sSendURL = '';
                for (var x in obj) {
                    sSendURL += x + "=" + obj[x] + "&";
                }
                sSendURL = sSendURL.slice(0, -1);
                $.ajax({
                    url: '/reqsofttodo?',
                    data: obj,
                    success: function (oData) {
                        fnSccess && fnSccess(oData);
                    }
                })
            },
            /*@读取本地客户端信息
             *@param sArray {Array} - 要读取的信息群 - 必要性 - Y
             *@param fnSuccess {function} - 成功读取的回调函数 ，并把读取的对象型信息作为参数传入该函数 - 必要性 - N
             *@return void
             */
            readMapMesg: function (sArray, fnSuccess) {
                var sSendURL = '', oThis = this;
                for (var x = 0; x < sArray.length; x++) {
                    sSendURL += sArray[x] + "=" + "&";
                }
                sSendURL = sSendURL.slice(0, -1);
                $.ajax({
                    url: "/reqreadmap?" + sSendURL,
                    success: function (oData) {
                        fnSuccess && fnSuccess(oData);
                    }
                })
            },
            /*
             *@保存信息到本地文件
             *@param:aOdata [obj,obj]  要缓存的数据 对象型数组类型 或者 字符串 或者 数组类型 见如下说明
             *@param:fileName  string  保存数据的模块名称 字符串类型
             *@param:fnSuccess {function} 保存成功的回调函数
             *@ALT 四种保存数据格式说明：
             //A 当保存数据为对象型数组时	[{"url":"/action:10061" ,"img":"ad2.png"},{"name":"simon","age":23} ]
             //B 当保存数据为数组时	["banner","new","adver","version"]
             //C 当保存数据为对象型	{"age":23}
             //D 直接保存字符串信息	 'asdfa'
             */
            saveFileMesg: function (saveMesg, fileName, fnSuccess) {
                var
                    sMesgType = $.type(saveMesg),
                    sFileType = $.type(fileName),
                    TYPE = '', SAVEDATA = '';
                if (sMesgType === "object") { //C类型
                    TYPE = 'C';
                } else if (sMesgType === "string") {
                    if (sFileType === "function") {
                        return false;//两种情况：传了参数1,3，或者参数2,3 都是非法参数
                    } else if (sFileType == "string") {
                        TYPE = 'D';
                    } else {
                        return false;//非法格式
                    }
                } else if (sMesgType == "array") {
                    var aThisType = $.type(saveMesg[0]);
                    if (aThisType === "object") {
                        TYPE = 'A';
                    } else {
                        TYPE = 'B';
                    }
                }
                if (TYPE && TYPE == 'A') {
                    for (var x = 0; x < saveMesg.length; x++) {
                        for (var p in saveMesg[x]) {
                            SAVEDATA += p + "|" + saveMesg[x][p] + "|";
                        }
                        SAVEDATA = SAVEDATA.slice(0, -1);
                        SAVEDATA += ",";
                    }
                } else if (TYPE && TYPE == 'B') {
                    SAVEDATA = saveMesg.toString();
                } else if (TYPE && TYPE == 'C') {
                    for (var x in saveMesg) {
                        SAVEDATA += x + '=' + saveMesg[x] + '&';
                    }
                } else if (TYPE && TYPE == 'D') {
                    SAVEDATA = saveMesg;
                } else {
                    return false;
                }
                if (TYPE == 'A' || TYPE == 'C') {
                    SAVEDATA = SAVEDATA.slice(0, -1);
                }
                SAVEDATA = TYPE + '$$' + SAVEDATA;
                //console.log(SAVEDATA);
                var sSendURL = "/reqsavefile?filename=" + fileName;
                $.ajax({
                    url: sSendURL,
                    type: "POST",
                    data: encodeURI(SAVEDATA),
                    success: function (oData) {
                        fnSuccess && fnSuccess(oData);
                    }
                })
            },
            /*
             *@读取本地缓存文件信息
             *@param:fileName  string  读取文件的文件名
             *@param:fnSuccess {function} 读取成功的回调函数
             */
            readFileMesg: function (fileName, fnSuccess) {
                var sSendURL = "/reqreadfile?filename=" + fileName;
                $.ajax({
                    url: sSendURL,
                    success: function (oData) {
                        if (!oData) {
                            fnSuccess(false);
                        } else {
                            splits(oData);
                        }
                    }
                })
                var MESG, TYPE, READDATA, SPLITDATA;

                function splits(oData) {
                    MESG = decodeURI(oData).split('$$');
                    TYPE = MESG[0];
                    READDATA = MESG[1];
                    if (TYPE == 'A') {
                        SPLITDATA = [];
                        var aThisSplit = READDATA.split(',');
                        for (var x = 0; x < aThisSplit.length; x++) {
                            var oThis = {}, aSecod = aThisSplit[x].split('|');
                            for (var p = 0; p < aSecod.length; p++) {
                                if (p % 2 == 0) {
                                    oThis[aSecod[p]] = aSecod[p + 1];
                                    p++;
                                }
                            }
                            SPLITDATA.push(oThis);
                        }
                    } else if (TYPE == 'B') {
                        SPLITDATA = READDATA.split(',');
                    } else if (TYPE == 'C') {
                        SPLITDATA = {};
                        var aThisSplit = READDATA.split('&');
                        for (var x = 0; x < aThisSplit.length; x++) {
                            var aThis = aThisSplit[x].split('=');
                            SPLITDATA[aThis[0]] = aThis[1];
                        }
                    } else if (TYPE == 'D') {
                        SPLITDATA = READDATA;
                    }
                    fnSuccess && fnSuccess(SPLITDATA);
                }
            },
            filterCdata: function () {
                str.replace(new RegExp(/\>\<\!\[CDATA\[/g), '').replace(/\]\]/g, '"');
            }
        },

    //针对宿主对象的一些扩展
        _expandHostOBj = function () {
            /*@数组去重
             *@param  array{Array} - 要去重的数组
             *@param  isHard {Boolean} - 是否开启严格模式，默认true
             *@return void
             */
            Array.prototype.ditto = function (array) {
                if (array.length < 2) {
                    return array;
                }
                var aNew = [array[0]];
                for (var x = 1; x < array.length; x++) {
                    var i = 0;
                    for (var p = 0; p < aNew.length; p++) {
                        if (array[x] === aNew[p]) {
                            i++;
                        }
                    }
                    if (i < 1) {
                        aNew.push(array[x]);
                    }
                }
                return aNew;
            }
            //Array.ditto = Array.prototype.ditto;
            String.prototype.wordCount = function (sContent, bIstrim) {
                sContent = (sContent || "")
                    .replace(/<br[^>]*?>/g, "**")	// 将换行符替换成一个双字节字符。
                    .replace(/<[^>]*?>/g, "")	// 过滤 HTML标签。
                    .replace(/[\r\n	]*/g, "")	// 过去换行和 tab 符。
                    .replace(/\&nbsp;/g, " ")	// 空格转换。
                    .replace(/[^\x00-\xff]/g, "**")	// 转换成双字节统计。
                    .replace(/\s/g, "")          //过滤空格
                    .replace(/[\r\n]/g, "")         //过滤回车
                ;

                if (bIstrim) {
                    sContent = $.trim(sContent);
                }
                // 使用双字节统计，并且小数向上取整。
                return sContent.length / 2 + 0.5 >> 0;
            }
            window.changeURL = function (str) {

                //$('input').blur(); //切换页面键盘不消失bug
                var app = window.navigator.appVersion.toLocaleLowerCase();
                if (app.indexOf("windows phone") > 0) {
                    window.external.notify(str);
                } else if (app.indexOf("iphone") > 0) {
                    window.location.href = str;
                } else if (app.indexOf("android") > 0) {
                    setTimeout(function () {
                        window.MyWebView.onJsOverrideUrlLoading(str);
                    }, 200)
                } else {
                    window.location.href = str;
                }
            }

            /*
             *touch绑定事件
             *param obj { DOM OBJECT}
             *param callback
             */
            window.bindTouch = function (obj, callback) {
                obj.addEventListener(_baseVar.STARTEVENT(), function (e) {
                    obj.bTouchBtn = true;
                }, false);
                obj.addEventListener(_baseVar.MOVEEVENT(), function (e) {
                    obj.bTouchBtn = false;
                }, false);
                obj.addEventListener(_baseVar.ENDEVENT(), function (e) {
                    if (obj.bTouchBtn) {
                        callback();
                    }
                }, false);
            }

            /*
             *@notice模拟点击按钮时类似 a:hover 效果
             *@param  id { string } 操作按钮的ID，或者CLASS，优先绑定ID
             *@param className {string} 高亮的样式名
             *@param fnClick { funciton } 点击后的触发函数
             */

            window.btnActive = function (id, className, fnClick) {
                var OBJECT = null;
                if ($("#" + id).length > 0) {
                    OBJECT = $("#" + id);
                } else if ($("." + id).length > 0) {
                    OBJECT = $("." + id);
                } else {
                    return false;
                }
                OBJECT.live(_baseVar.STARTEVENT() + " " + _baseVar.ENDEVENT(), function (oEvent) {
                    if (oEvent.type == _baseVar.STARTEVENT()) {
                        $(id).addClass(className);
                    } else {
                        $(id).removeClass(className);
                        fnClick && fnClick();
                    }
                });
            }

            /*
             *@NOTICE：兼容性处理区域滚动效果
             *@param elementID {string} 内容滚动区域的ID
             */
            window.OnTouchScreen = function (elementID) {
                var elem, tx, ty;
                if ('ontouchstart' in document.documentElement) {
                    if (elem = document.getElementById(elementID)) {
                        elem.style.overflow = 'hidden';
                        elem.ontouchstart = ts;
                        elem.ontouchmove = tm;
                    }
                }
                function ts(e) {
                    var tch;
                    if (e.touches.length == 1) {
                        e.stopPropagation();
                        tch = e.touches[0];
                        tx = tch.pageX;
                        ty = tch.pageY;
                    }
                }

                function tm(e) {
                    var tch;
                    if (e.touches.length == 1) {
                        e.preventDefault();
                        e.stopPropagation();
                        tch = e.touches[0];
                        this.scrollTop += ty - tch.pageY;
                        ty = tch.pageY;
                    }
                }
            }
        }, //_expandHostOBj END

    /*对JQ的扩展*/
        _expandJQuery = function () {
            var oExpends = {
                /*jsonp扩展
                 * @param sUrl{string} 请求的地址
                 * @param oData{object || undefine} 请求数据要传输的参数
                 * @param fnSuccess{function} 成功之后的回调函数
                 * @param oSetter{object || undefine} ajax请求的其它配置项
                 */
                jsonp: function (sUrl, oData, fnSuccess, oSetter) {
                    /*第二种传递参数形式（参数连接在sUrl后面）*/
                    if ($.isFunction(oData)) {
                        fnSuccess = oData;
                        oSetter = fnSuccess;
                        oData = null;
                    }
                    var oConfig = $.extend({
                        url: sUrl,
                        data: oData,
                        dataType: "jsonp",
                        success: fnSuccess
                    }, oSetter || {})
                    return $.ajax(oConfig);
                }, //jsonp END

                /*同步加载脚本
                 * @param sUrl {string} 脚本地址
                 * @param fnSuccess{function} 成功后的回调函数
                 * @param oSetter{object} ajax配置重写
                 */
                asyncGetScript: function (sUrl, fnSuccess, oSetter) {
                    var oConfig = $.extend({
                        url: sUrl,
                        dataType: "script",
                        cache: false, //不从缓存加载
                        async: false, //同步加载
                        success: fnSuccess
                    }, oSetter || {});

                    return $.ajax(oConfig);
                }, // asyncGetScript END

                /*加载脚本集合
                 * @param asUrl{array} 要加载的脚本地址数组
                 * @param fnSuccess{function} 成功后的回调函数
                 * @param oSetter{object} ajax配置重写
                 */
                getScripts: function (asUrl, fnSuccess, oSetter) {
                    var oThis = this, thisUrl = [], abStatus = [];

                    if ($.type(asUrl) == "string") {
                        thisUrl = [asUrl];
                    } else {
                        thisUrl = asUrl;
                    }
                    $.each(thisUrl, function (nIndex, sUrl) {
                        abStatus[nIndex] = false;
                        oThis.asyncGetScript(sUrl, function () {
                            abStatus[nIndex] = true;
                            checkLoad(fnSuccess);
                            //验证每个文件是否都加载成功
                        }, oSetter)
                    })
                    function checkLoad(fnSuccess) {
                        for (var i = 0; i < abStatus.length; i++) {
                            if (!abStatus[i]) {
                                return;
                            }
                        }
                        fnSuccess && fnSuccess();
                    }

                },
                /*加载样式文件
                 * @param sUrl{string} 加载文件地址
                 * @param fnSuccess{function} 回调函数(该方法中回调函数始终执行，通过回调函数的参数来判断执行方式)
                 *  @param nTime{number} 超时时间，单位秒
                 */
                getStyle: function (sUrl, fnSuccess, nTime) {
                    var nTime = nTime || 3, bIsLoad = false, nTimeout = setTimeout(function () {
                        fnSuccess & fnSuccess(false);
                        //超时模式
                    }, nTime * 1000);
                    return $('<link href="' + sUrl + '" rel="stylesheet" />').appendTo($("head")).on("load", function () {//该Link标签的加载事件
                        clearTimeout(nTimeout);
                        fnSuccess && fnSuccess(true);
                        //成功模式
                    })
                },

                //通用ajax请求出错处理
                ajaxError: function (textStatus, fnErr) {
                    var oMessage = {
                        "timeout": "请求超时.",
                        "datatypeErr": "数据格式出错"
                    };
                    switch (textStatus) {
                        case 'timeout':
                            OVERLAY({'mesg': '<p>' + oMessage.timeout + '</p>'});
                            break;
                        case 'dataerr':
                            OVERLAY({'mesg': '<p>' + oMessage.datatypeErr + '</p>'});
                            break;
                        default:
                            break;
                    }
                    fnErr && fnErr();
                    return false;
                },
                /*
                 *@notice 通用Ajax请求
                 *@params sRequestURL { string } 发起请求的地址
                 *@params oSendData { Object } 请求的参数
                 *@params fnSuccess { function  } 请求成功后的回调函数
                 *@params oConfig { Object } Ajax 的配置项
                 */
                getData: function (sRequestURL, oSendData, fnSuccess, oConfig) {//回调函数 cfunc
                    var aFuncid = ['310228', '501308'];//出错不需要提示的功能号
                    var oThis = this;
                    var async = oConfig && (oConfig.async === false) ? false : true;
                    var notPaseXml = oConfig && (oConfig.notPaseXml === true) ? true : false;
                    var oDefConfig = {
                        type: "POST",
                        url: sRequestURL,
                        async: async,
                        data: oSendData,
                        contentType: "application/x-www-form-urlencoded;", //避免乱码
                        success: function (oData) {
                            if (!notPaseXml && oData.GRID0 && oData.GRID0[0] == TZT.XMLHEAD) {
                                var GRID0 = oData.GRID0;
                                GRID0[0] = '<xml></xml>';
                                oData.GRID0 = GRID0;
                            }
                            //如果登录过期（超时）
                            if (oData.ERRORNO == "-204001" || oData.ERRORNO == "-204007" || oData.ERRORNO == "-204009" || oData.ERRORNO == "-203008") {
                                //重置客户端登录标识
                                TZT.TOOLS.reqSoftTodo({jyloginflag: 0}, function () {
                                    //重置前端token标识
                                    TZT.TOOLS.saveMapMesg({TOKENLOGIN: "", LOGINLATER: "t"}, function () {
                                        //登录过期获取提示窗提示次数
                                        TZT.TOOLS.readMapMesg(["TIPSCOUNT"], function (oTIPS) {
                                            if (oTIPS.TIPSCOUNT == "t") {
                                                RELOGIN();
                                                return;
                                            }
                                            else {
                                                TZT.TOOLS.saveMapMesg({TIPSCOUNT: "t"}, function () {
                                                    /*if (confirm("亲爱的客户，由于您长时间未操作，为保证安全，请点击“确认”后重新登录。点击“确定”直接跳转登录页面!")) {*/
                                                    RELOGIN();
                                                    return;
                                                    /*}*/
                                                });
                                            }
                                        });
                                    });
                                });
                                return;
                            }
                            var bIs25002 = (oData.ACTION == '25002'),
                                ERRORNO = oData.ERRORNO, ERRORMESSAGE = oData.ERRORMESSAGE;
                            var XML, ERRCODE, ERRMSG, FUNCID;
                            if (bIs25002) {
                                XML = oData.GRID0 && oData.GRID0.join('').replace(TZT.XMLHEAD, ''),
                                    ERRCODE = XML && $(XML).find('errcode').html(),
                                    ERRMSG = XML && $(XML).find('errmsg').html(),
                                    FUNCID = XML && $(XML).find('func_id').html();
                            }
                            window.getDataSuccess && window.getDataSuccess(oData);
                            if ((bIs25002 && ERRCODE >= 0) || (!bIs25002 && ERRORNO >= 0)) {
                                if (ERRORNO > 0 & !ERRORMESSAGE) {
                                    if (oData && oData.GRID0) {
                                        var otcReturn = oData.GRID0.join('');
                                        if (otcReturn.indexOf('errmsg') > -1) {
                                            if ($(otcReturn).find('errcode').text() > 0 && $(otcReturn).find('errmsg').text()) {
                                                var func_id = $(otcReturn).find('func_id').text();
                                                var func_id_array = [
                                                    "2620102",
                                                    "2620105",
                                                    "2620200",
                                                    "2620100",
                                                    "99001338",
                                                    "99001335",
                                                    "26120110",
                                                    "99001334",
                                                    "99001345",
                                                    "10000507",
                                                    "2620101",
                                                    "99001270"
                                                ];
                                                if (oConfig && oConfig.fnZeroLeft && oConfig.fnZeroLeft) {
                                                    oConfig.fnZeroLeft(oData)
                                                }
                                                else if (func_id_array.indexOf(func_id) > -1) {
                                                    OVERLAY({'mesg': '<p>' + otcReturn.get('errmsg') + '</p>'});
                                                    return;
                                                }
                                            }
                                        }
                                    }
                                }

                                //部分接口会返回token，需要重新保存
                                if (oData.TOKEN) {
                                    TZT.TOOLS.saveMapMesg({TOKENLOGIN: oData.TOKEN}, function () {
                                        fnSuccess && fnSuccess(oData);
                                    });
                                }
                                else {
                                    fnSuccess && fnSuccess(oData);
                                }
                            }
                            else {
                                //部分接口会返回token，需要重新保存
                                if (oData.TOKEN && oData.ERRORNO >= 0) {
                                    TZT.TOOLS.saveMapMesg({TOKENLOGIN: oData.TOKEN}, function () {
                                        (ERRORMESSAGE || ERRMSG) && (aFuncid.indexOf(FUNCID) < 0) && OVERLAY({'mesg': '<p>' + (ERRORMESSAGE || ERRMSG) + '</p>'});
                                        oConfig && oConfig.fnZeroLeft && oConfig.fnZeroLeft(oData);
                                    });
                                } else {
                                    //有错误但是不弹窗进入fnSuccess();
                                    if (oConfig && oConfig.NotAlert == "true") {
                                        fnSuccess && fnSuccess(oData);
                                    } else {
                                        (ERRORMESSAGE || ERRMSG) && (aFuncid.indexOf(FUNCID) < 0) && OVERLAY({'mesg': '<p>' + (ERRORMESSAGE || ERRMSG) + '</p>'});
                                        oConfig && oConfig.fnZeroLeft && oConfig.fnZeroLeft(oData);
                                    }
                                }
                            }
                        },
                        error: function (oErr) {
                            oThis.ajaxError(oErr);
                        }
                    }, oAjaxParm = {}, oParam = oConfig || {};
                    if (oParam) {
                        delete oParam.url;
                        delete oParam.success;
                    }
                    oAjaxParm = $.extend(oDefConfig, oParam);
                    $.ajax(oAjaxParm);
                },

                /*把seajs的核心方法赋予扩展到JQ中*/
                //use : seajs && seajs.use,
                //add : seajs && define,
                /*字符串替换既定关键词
                 *@param sString{string} 被替换的字符串   TZT.HOST + "login.shtml?user={mail}&pwd = {pwd}"
                 *@param oData{object} 包含替关键字段的替换对象 {user : **** , pwd:****}
                 *@return sString{string}
                 */
                replaceString: function (sString, oData) {
                    if (oData == null) {
                        return sString;
                    }
                    for (x in oData) {
                        sString = sString.replace(new RegExp("\\{" + x + "\\}", "g"), oData[x]);
                    }
                    return sString;
                },
                /*参数解析
                 * param sContent{string}  传入的参数字符串
                 * return Object 返回被解析的参数对象
                 */
                parsingParam: function (sContent) {
                    var sContent = sContent || location.search.slice(1), sKey = '&&';
                    (sContent.indexOf(sKey) < 0) ? sKey = '&' : '';
                    var asContent = sContent.split(sKey), oContent = {};
                    for (var x = 0; x < asContent.length; x++) {
                        if (!asContent[x]) {
                            continue;
                        }
                        var aSnap = asContent[x].split("=");
                        if (aSnap.length > 2) {
                            var sThisPar = asContent[x], nSign = sThisPar.indexOf("=");
                            oContent[sThisPar.slice(0, nSign)] = sThisPar.slice(nSign + 1, sThisPar.length);
                        } else {
                            oContent[aSnap[0]] = aSnap[1];
                        }
                    }
                    return oContent;
                },
                /*
                 *@notice 获取url中的参数
                 *@param sParamName {string } 要获取的参数字段名 必传参数
                 *@param sURL { string }  获取字段值的源地址 可不传，默认为 window.location.search
                 */
                getUrlParameter: function (sParamName, sURL) {
                    var oThis = this, sURL = sURL || location.search.slice(1);
                    return ((oThis.parsingParam(sURL))[sParamName]);
                },
                /*
                 *获取两个两个数字间的随机数
                 *param firstNum {number} 一个数
                 *param lastNum {number} 另一个数
                 *return  {Number}
                 */
                getRandom: function (firstNum, lastNum) {
                    var nChoices;
                    if (lastNum > firstNum) {
                        nChoices = lastNum - firstNum + 1;
                    } else {
                        nChoices = firstNum - lastNum + 1;
                    }
                    return Math.floor(Math.random() * nChoices + firstNum);
                },

                /*
                 *生成N位数的时间戳，默认6位，最大17位
                 * param nLength {Number} 时间戳的位数
                 * return sTimespoint {string}
                 */
                timesPoint: function (nLength) {
                    var
                        oThis = this,
                        nMixLen = 6,
                        nRandom = 0
                    nMaxLen = 17,
                        sTimespoint = '',
                        sTime = String(+new Date()),
                        LENGTHNUM = nLength || sTime.length;
                    LENGTHNUM < nMixLen ? LENGTHNUM = nMixLen : LENGTHNUM;
                    LENGTHNUM > nMaxLen ? LENGTHNUM = nMaxLen : LENGTHNUM;
                    if (LENGTHNUM <= sTime.length) {//获取的长度小于时间戳长度，尾部截取
                        sTimespoint = sTime.slice(0 - LENGTHNUM);
                    } else {
                        var nGap = LENGTHNUM - nMixLen, //计算补给长度
                            nFirst = Math.pow(10, nGap - 1), nLash = Math.pow(10, nGap) - 1;
                        nRandom = this.getRandom(nFirst, nLash);
                        //获取补给长度等长的随机数
                        sTimespoint = sTime + String(nRandom);
                    }
                    return sTimespoint;
                },
                /*检测标签是否拥有某属性
                 *param ElementName  { string }  标签名称
                 *param attrName { string } 属性名称
                 *return  Boolean
                 */
                hasAttr: function (ElementName, attrName) {
                    if (ElementName == null || attrName == null) {
                        return false;
                    }
                    return ( attrName in document.createElement(ElementName));
                },
                /*检测对象是否为JQ对象
                 * param oTester{object} 被检测的对象
                 * return Boolean
                 */
                isJQuery: function (oTester) {
                    return $.isElement(oTester.get(0));
                },
                /*检测对象是否为为DOM对象
                 * param oTester{object} 被检测的对象
                 * return Boolean
                 */
                isElement: function (oTester) {
                    var nodeType = oTester.nodeType, oDomNodeType = {
                        elementNode: 1, //元素节点
                        attributeNode: 2, //属性节点
                        textNode: 3, //文本节点
                        commentNode: 8, //注释节点
                        documentNode: 9 //文档节点
                    }, bIsElement = false;
                    try {
                        for (var x in oDomNodeType) {
                            if (oDomNodeType[x] == nodeType) {
                                bIsElement = true;
                                break;
                            }
                        }
                        return bIsElement;
                    } catch (err) {
                        return bIsElement;
                    }
                },
                /*
                 *常规性数据类型检测
                 */
                isNumber: function (oTester) {
                    if ($.type(oTester) === "string") {
                        oTester = Number(oTester);
                    }
                    return ($.type(oTester) === "number" && oTester != NaN)
                },
                isString: function (oTester) {
                    return ($.type(oTester) === "string")
                },
                isDate: function (oTester) {
                    return ($.type(oTester) === "date")
                },
                isBoolean: function (oTester) {
                    return ($.type(oTester) === "boolean")
                },
                isObject: function (oTester) {
                    return ($.type(oTester) === "object")
                },
                isFunction: function (oTester) {
                    return ($.type(oTester) === "function")
                },
                isUndefined: function (oTester) {
                    return ($.type(oTester) === "undefined")
                },
                isArray: function (oTester) {
                    return ($.type(oTester) === "array")
                },
                isNull: function (oTester) {
                    return ($.type(oTester) === "null");
                },
                //检测一个对象是否是空对象
                //@param OBJ{object}
                //return Boolean
                isEmptyObj: function (OBJ) {
                    var bIsEmpty = true, N = 0;
                    for (var x in OBJ) {
                        x ? N++ : '';
                    }
                    N > 0 ? bIsEmpty = false : '';
                    return bIsEmpty;
                }
            }//oExpends END

            //对扩展进行合并
            $.extend($, oExpends);
            return _TZT;
        }, // _expandJQuery END

    /*
     * seajs的配置项
     * 具体配置参数参考：https://github.com/seajs/seajs/issues/262
     */
        _setPackage = function () {
            if (!seajs) return false;
            seajs.config({
                //TZT系列插件的路径快捷方式
                alias: {
                    "TZT": _host.DN + _host.PACKAGE
                },
                // 文件编码
                charset: 'utf-8'
            })
            return _TZT;
        };

    /*
     全局命名空间TZT的内部对象
     */
    var _TZT = {
        TAG: _tag, //时间戳
        HOST: _host,//常用地址
        REQ: _req,//常用请求标头
        REG: _reg,//正则表达式集
        SPLITTAG: _splitTag,//分隔符集
        FILETYPE: _fileType,
        GOWHERE: _gowhere,
        BASEVAR: _baseVar,
        TOOLS: _tools
    }
    //全局执行入口
    function reader() {
        TZT = _TZT;
        _expandHostOBj();		//宿主对象的扩展
        _expandJQuery();		//JQ的扩展方法
        //_setPackage();		//seajs的配置
    }

    reader();
}//fnTZT END

fnTZT();

//更新日志  
/*
 * YYY 1037159943 20140617
 *UP1：getData 方法 在配置项中添加 oConfig.fnZeroLeft 方法，用来定义ERRORNO小于0时的回调
 *UP2：顶部添加 私有属性 _floder 用来定义项目应用的根目录，解决基础路径拼接BUG
 */

/*
 *YYY 1037159943 20140619
 *UP1：readFileMesg 读取文件失败，也执行回调函数，入参 false 
 */

/*
 *YYY 1037159943 20140624
 *UP1：parsingParam 参数解析二级参数解析失败BUG
 */

/*
 *YYY 1037159943 20140708
 *UP1：TZT.GOWHERE  新增分享，系统登出，等成员
 *UP2：changeURL 方法字符串大小写BUG修复
 *UP3:getData方法添加优先执行方法 getDataSuccess
 */



/* ---------------该项目专用公用对象---------------- */
TZT.XMLHEAD = '<?xml version="1.0" encoding="UTF-8"?>';
TZT.GOWHERE.G25027 = '/action:25027/?'; //获取首页产品信息
TZT.FILE = {
    sDetailFileName: 'pro_detail.data',
    sAccountFileName: 'account.data',
    sAssetFile: 'asset.data',
    sMyProFile: 'my_pro.data',
    sMsgFile: 'more_msg.data',
    sOptListFile: 'opt_list.data'
};
String.prototype.replaceAll = function (s1, s2) {
    return this.replace(new RegExp(s1, "gm"), s2);
}
//检测是否登录
window.jumpUrl = function (url, flag) {
    TZT.TOOLS.readMapMesg(["Token", "Reqno", "MobileCode"], function (oData) {
        if (oData.TOKEN && oData.REQNO && oData.MOBILECODE) {
            //不跳转
            if (flag) {
                return false;
            } else {
                changeURL(url);
            }
        } else {
            changeURL(TZT.BASEVAR.FOLDER + '/reg/login.html?returnUrl=' + url.replaceAll('=', '!!').replaceAll('&', '%%'));
        }
    });
}

//公共开户请求方法
function khReq(sUrl, oParams, succs, $btn) {
    $.getData(sUrl, oParams, function (oData) {
        if (oData.ERRORNO > 0) {
            var oData = $(oData.GRID0.join('').replace(sXmlHead, ''));
            //nErrCode = oData.find('errcode').text();
            succs && succs(oData);
        }
    }, {
        fnZeroLeft: function () {
            btnStatus($btn);
        },
        error: function () {
            btnStatus($btn);
        }
    });
};

//提交后按钮状态变化
window.btnStatus = function ($obj, staus) {
    var sVal0 = $obj.attr('data-val');
    window.btnTimer;
    if (staus) {
        $obj.addClass('btn-disabled').attr('disabled', 'disabled');
        var nInitNum = 0;
        btnTimer = setInterval(function () {
            nInitNum++;
            var nCurrent = nInitNum % 4;
            if (nCurrent == 0) {
                $obj.val('' + sVal0 + '中');
            }
            if (nCurrent == 1) {
                $obj.val(' ' + sVal0 + '中.');
            }
            if (nCurrent == 2) {
                $obj.val('  ' + sVal0 + '中..');
            }
            if (nCurrent == 3) {
                $obj.val('   ' + sVal0 + '中...');
            }
        }, 500)
    } else {
        clearInterval(btnTimer);
        $obj.removeAttr('disabled').removeClass('btn-disabled').val(sVal0)
    }
}

$.alert = function (sMsg, nTime) {
    if ($('.tips-wrap').length) {
        $('.globle-tips').text(sMsg);
        $('.tips-wrap').removeClass('hide');
    } else {
        $('body').append('<p class="tips-wrap"><span class="globle-tips">' + sMsg + '</span></p>');
    }
    setTimeout(function () {
        $('.tips-wrap').addClass('hide');
    }, (nTime ? nTime * 1000 : 3000))
}

/**
 * 弹出密码框
 * 参数：str 模板  callback 回调函数
 * 返回：HTML代码
 */
$.loadPassword = function (str, callback, tit) {
    var sPsw = '';
    var sTemp =
        '<div class="mask"></div>'
        + '<div class="psw-pop">'
        + '<div class="pop-inner">'
            /*+ '<p class="psw-tit"><span>请输入交易密码</span><a href="forget-password">忘记密码</a></p>'*/
        + '<p class="psw-tit"><span>' + (tit ? tit : '请输入交易密码') + '</span></p>'
        + '<p class="psw-line"></p>'
        + '{template}'
        + '<p class="psw-input">'
        + '<input type="password" maxlength="1" /><input type="password" maxlength="1"/><input type="password" maxlength="1"/><input type="password" maxlength="1"/><input type="password" maxlength="1"/><input type="password" maxlength="1"/>'
        + '</p>'
        + '<input type="tel" maxlength="6" autofocus="autofocus" id="rel-psw" class="psw-on" />'
        + '<p class="psw-btn">'
        + '<input type="button" class="btn btn-gray" id="cancel" value="取消"><input type="button" class="btn btn-gray btn-disabled" id="ok" disabled value="确认">'
        + '</p>'
        + '</div>'
        + '</div>';
    var $mask = $('.mask'),
        $pop = $('.psw-pop');
    $mask.remove();
    $pop.remove();
    $template = $($.replaceString(sTemp, {template: str || ''}));

    var $cancel = $template.find('#cancel'),
        $ok = $template.find('#ok');
    $cancel.on('click', function () {
        $cancel.attr("data-click", "true");
        //callback&&callback('');
        $('.mask,.psw-pop').remove();
    });

    $('body').append($template);
    //$('#rel-psw').focus();
    var $psw = $('body').find('.psw-input input[type="password"]');
    var nWidth = $psw.eq(0).width();
    $('.psw-on').css({'letter-spacing': 7 * nWidth / 8, 'padding-left': nWidth / 2 - 2});
    $('.psw-on').on('focus click', function (e) {
        var self = this;
        var nVal = $(self).val();
        if (self.setSelectionRange) {
            setTimeout(function () {
                var len = nVal.length;
                self.setSelectionRange(len, len);
            }, 0);
        } else if (self.createTextRange) {
            var txt = self.createTextRange();
            txt.moveEnd("character", txt.text.length);
            //txt.select(); 
        }
    });
    $('.psw-on').on('input', function (e) {
        var self = this;
        var nVal = $(self).val();
        if (/^\d{1,6}$/.test(nVal) && nVal.length <= 6) {
            var aVal = nVal.split('');
            $psw.val('');
            $.each($psw, function (i, n) {
                $(n).val(aVal[i] || '');
            });
        }
        if (!/^\d{1,6}$/.test(nVal)) {
            $(this).val('');
            $psw.val('');
        }
        if (nVal == '') {
            $psw.val('');
        }
        if (/^\d{1,6}$/.test(nVal) && nVal.length == 6) {
            $(this).blur();
            $ok.removeClass('btn-disabled').removeAttr('disabled').css({'color': '#c52728'});
            $ok.off('click').on('click', function () {
                $('.mask,.psw-pop').remove();
                sPsw = nVal;
                callback && callback(sPsw);
            });
        } else {
            $ok.addClass('btn-disabled').attr('disabled', 'disabled');
        }
    });
    return sPsw;
}

function objChangeXml(obj, parent) {
    if (!parent) {
        sChangeXML = '<?xml version="1.0" encoding="utf-8"?><extinfo>';
    } else {
        sChangeXML = sChangeXML;
    }
    if (!$.isEmptyObj(obj)) {
        if (parent) {
            sChangeXML += '<' + parent + '>';
        }
        for (var x in obj) {
            if (typeof(obj[x]) != "object") {
                sChangeXML += ('<' + x + '>' + obj[x] + '</' + x + '>');

            } else {
                objChangeXml(obj[x], x);
            }
        }
        if (parent) {
            sChangeXML += '</' + parent + '>';
        }
    }
    if (!parent) {
        sChangeXML += '</extinfo>';
    }
    return ({'GRID': sChangeXML});
}

//xml获取节点
String.prototype.get = function (key) {
    return $(String(this)).find(key).html();
}

/*
 *@name LoginTest {fn} 判断token是否失效
 */
/*var LoginTest = function(url){
 var aLocal = ["TOKENLOGIN","TIMELOGIN"],
 _this = this;
 TZT.TOOLS.readMapMesg(aLocal,function(oData){
 _this.TIMELOGIN = oData.TIMELOGIN;
 _this.check(url);
 });
 }
 LoginTest.prototype = {
 "check":function(url){
 var dNowTime = new Date().getTime();
 this.convert(dNowTime,this.TIMELOGIN);
 if(!this.TIMELOGIN){
 TZT.TOOLS.saveMapMesg({'isLoginUrl':url},function(){
 changeURL(TZT.GOWHERE.G10090 + "logintype=1&&loginkind=1&&url=" + (url || '/index/index.html'));
 });
 return false;
 };
 if(this.interval > 10){
 TZT.TOOLS.saveMapMesg({"TOKENLOGIN":"","TIMELOGIN":"",'isLoginUrl':url},function(){
 changeURL(TZT.GOWHERE.G10090 + "logintype=1&&loginkind=1&&url=" + (url || '/index/index.html'));
 });
 return false;
 }
 },
 "convert" : function(now,timeLogin){
 this.interval = (now - timeLogin)/60000;
 }
 }*/
// 对Date的扩展，将 Date 转化为指定格式的String   
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，   
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)   
// 例子：   
// (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423   
// (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18   
Date.prototype.Format = function (fmt) { //author: meizz   
    var o = {
        "M+": this.getMonth() + 1,                 //月份   
        "d+": this.getDate(),                    //日   
        "h+": this.getHours(),                   //小时   
        "m+": this.getMinutes(),                 //分   
        "s+": this.getSeconds(),                 //秒   
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度   
        "S": this.getMilliseconds()             //毫秒   
    };
    if (/(y+)/.test(fmt))
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt))
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}
var _commonVar = {
    nGLOBLECOUNT: 0//一个页面只能弹出一个提示登录的窗口
};

function RELOGIN(str) {
    TZT.TOOLS.readLocalMesg(["jyloginflag"], function (oData) {
        var _thisUrl = "/action:10061?fullscreen=1&&firsttype=10&&url=" + encodeURIComponent((str || location.href));
        if (oData.JYLOGINFLAG == "0" || oData.JYLOGINFLAG == "") {
            //调用系统功能号登录
            changeURL("/action:10090?logintype=1&&loginkind=1&&url=" + encodeURIComponent(_thisUrl));
        } else {
            changeURL(_thisUrl);
        }
    });
    //$.getData(TZT.REQ.LOCAL, { "jyloginflag": "" }, function (oData) {

    //});
}
function fnISLOGINPAGE() {
    //在另外判断该页页面是否登陆的，在body中加上data-isneedlogin=login
    if ($("body").data("isneedlogin") == "login") {
        TZT.TOOLS.readMapMesg(["TOKENLOGIN"], function (oData) {
            if (!oData.TOKENLOGIN) {
                if (confirm("您好，请你先登录！")) {
                    RELOGIN();
                }
            }
        });
    }
    ;
}
//两个时间点相减返回天数差值
TZT.Diff = function (date1, date2) {
    var sDate1 = String(date1);
    var sDate2 = String(date2);
    if (!date1 && !date2) {
        return "0";
    } else {
        var sDate2Format = sDate2.substr(0, 4) + "/" + sDate2.substr(4, 2) + "/" + sDate2.substr(6, 2);
        var sDate1Format = sDate1.substr(0, 4) + "/" + sDate1.substr(4, 2) + "/" + sDate1.substr(6, 2);
        return ((new Date(sDate2Format).getTime() - new Date(sDate1Format).getTime()) / (24 * 60 * 60 * 1000));
    }
}
var MYSCROLL;
function loadscroll() {
    //MYSCROLL.refresh();
    //MYSCROLL.scrollTo(0, 0);
}
//判断当前页面是否需要登录
$(function () {


    //iScroll兼容
    var iScrollCompat = function () {
        [].slice.call(document.querySelectorAll('input, a, select, textarea, button')).forEach(function (el) {
            el.addEventListener(('ontouchstart' in window) ? 'touchstart' : 'mousedown', function (e) {
                e.stopPropagation();
            });
        });
        /*document.addEventListener('touchmove', function (e) { e.preventDefault(); }, false);*/
    };

    var scrollid = "bodywapper";
    //检查是设计全页面滚动，还是部分滚动
    if ($("#wrapper").length > 0) {
        setTimeout(function () {
            scrollid = "wrapper";
            $("body").add($("html")).add($("#wrapper")).css({"height": "100%"});
            MYSCROLL = new iScroll(scrollid, {vScrollbar: false});

            iScrollCompat();
        }, 500);
    }

    //修正密码输入框弹出数字键盘
    //20141030 kangming
    (function () {
        var digitPwd = $("input[type='tel'].digitPwd");
        if (digitPwd) {
            for (var i = 0, j = digitPwd.length; i < j; i++) {
                var digitPwdItem = $(digitPwd[i]);
                var pwdId = digitPwdItem.attr("id"),
                    pwdName = digitPwdItem.attr("name"),
                    maxlength = digitPwdItem.attr("maxlength");
                var clonePwd = $("<input>", {
                    "type": "hidden",
                    "id": pwdId + "-realVal",
                    "class": "digitPwd",
                    "name": pwdName
                });
                clonePwd.insertAfter(digitPwdItem);

                (function (clonePwd) {
                    digitPwdItem.on("input", function (e) {
                        var pwdItem = $(this),
                            pwdVal = pwdItem.val();
                        var pwdCache = clonePwd.val();
                        if (!pwdVal) {
                            clonePwd.val("");
                            pwdCache = "";
                            return true;
                        }
                        ;
                        var pwdValLength = pwdVal.length,
                            pwdCacheLength = pwdCache.length,
                            lastInputChar = pwdVal.charAt(pwdValLength - 1);

                        if (!/^[0-9]{1,7}$/.test(lastInputChar) && lastInputChar != "*") {
                            var pwdReplace = new Array(pwdValLength).join("*");
                            pwdItem.val(pwdReplace);
                            return true;
                        }
                        ;
                        if (pwdValLength > pwdCacheLength) {
                            pwdCache = pwdCache + lastInputChar;
                        } else if (pwdValLength < pwdCacheLength) {
                            pwdCache = pwdCache.substring(0, pwdCacheLength - 1);
                        }
                        var pwdReplace = new Array(pwdValLength + 1).join("*");
                        pwdItem.val(pwdReplace);
                        clonePwd.val(pwdCache);
                        var self = this;
                        locatePoint();
                        function locatePoint() {
                            if (self.setSelectionRange) {
                                setTimeout(function () {
                                    var len = pwdReplace.length;
                                    self.setSelectionRange(len, len);
                                }, 0);
                            } else if (self.createTextRange) {
                                var txt = self.createTextRange();
                                txt.moveEnd("character", txt.text.length);
                                //txt.select(); 
                            }
                        }

                        return true;
                    });
                })(clonePwd);
            }
            ;
        }
        ;
    })();

    //下拉刷新控制
    //20141110 kangming
    (function () {
        function pullRefreshHandle() {
            var refreshContainer = $("#refreshWrapper");
            if (refreshContainer && refreshContainer.length) {

                refreshContainer.css({
                    "position": "absolute",
                    "left": "0",
                    "right": "0",
                    "bottom": "0",
                    "top": "0"
                });

                var OFFSET = 30;
                var myScroll, pullDownEl, pullDownLabel, pullDownOffset;

                var pageRefresh = function () {
                    pullDownEl.className = 'loading';
                    pullDownLabel.innerHTML = '加载中...';
                    init();
                    setTimeout(function () {
                        myScroll.refresh();
                    }, 600);
                };

                (function () {
                    pullDownEl = document.getElementById('pullDown');
                    pullDownLabel = pullDownEl.querySelector('.pullDownLabel');
                    pullDownOffset = pullDownEl.offsetHeight;

                    myScroll = new iScroll('refreshWrapper', {
                        vScrollbar: !1,
                        hScrollbar: !1,
                        hScroll: !1,
                        momentum: true,
                        bounce: true,
                        useTransition: true,
                        handleClick: false,
                        checkDOMChanges: true,
                        topOffset: pullDownOffset,
                        onRefresh: function () {
                            if (pullDownEl.className.match('loading')) {
                                pullDownLabel.innerHTML = '下拉刷新';
                                pullDownEl.className = '';
                                if (myScroll) {
                                    myScroll.refresh();
                                }
                            }
                        },
                        onScrollMove: function () {
                            if (this.y > OFFSET && !pullDownEl.className.match('flip')) {
                                pullDownEl.className = 'flip';
                                pullDownLabel.innerHTML = '松开刷新';
                                this.minScrollY = 0;
                            } else if (this.y < OFFSET && pullDownEl.className.match('flip')) {
                                pullDownLabel.innerHTML = '下拉刷新';
                                this.minScrollY = -pullDownOffset;
                            }
                        },
                        onScrollEnd: function () {
                            if (pullDownEl.className.match('flip')) {
                                pageRefresh();
                            }
                        }
                    });
                    iScrollCompat();
                })();
            }
            ;
        };

        /**/

        setTimeout(pullRefreshHandle, 500);

    })();
});

function logReq(oSendData, callback) {
    /*$.getData(TZT.REQ.XML + "action=25002", objChangeXml(oSendData), function (oData) {
     var res = $(oData.GRID0.join(""));
     callback&&callback(res);
     });*/
    TZT.TOOLS.readFileMesg('pageLog', function (oData) {
        oData.push(oSendData);
        TZT.TOOLS.saveFileMesg(oData, 'pageLog', function (res) {
        });
    });
};
function buttonLog(data) {
    /*$(window).on('beforeunload',function(){
     buttonName = data.buttonName;
     var oButtonData = {
     func_id: "300211",
     buttonname: buttonName,
     custid:clientId
     };
     logReq(oButtonData,function(res){
     });
     });*/
};

function pageLog(data) {
    /* TZT.TOOLS.readMapMesg(['mobileno','USERCODE'],function(oData){
     var pageName = data.pageName,
     referer = data.referer||'',
     resultId = 0,
     oSendData;

     window.clientId = oData.USERCODE||oData.MOBILENO||0;
     $(function(){
     oSendData = {
     func_id: "300210",
     sysid:'2',
     operate: "1",
     pagename: pageName,
     custid:clientId,
     enterfrom:referer,
     entertime:(new Date()).getTime(),
     exittime:(new Date()).getTime(),
     vernum:'',         //版本号
     os:'',             //系统标识（iOS系统或Android系统）
     imei:'',           //设备号
     phone:'',          //手机号码
     channel:'',        //渠道号
     chlserial:''       //渠道明细序号（特指Android系统）
     };
     });

     $(window).on('beforeunload',function(){
     oSendData.exittime = (new Date()).getTime();
     logReq(oSendData,function(res){
     //var errcode = res.find("errcode");
     });


     });
     });*/
};

function updateVersion(type) {
    if (type) return;
    var sUpversion = '';
    //从客户端获取内部版本号
    if (!(TZT.BASEVAR.ISANDROID || TZT.BASEVAR.ISIOS)) return;
    TZT.TOOLS.readLocalMesg(["upversion"], function (oData) {
        var sThisVersion = oData.UPVERSION;
        if (sThisVersion == null || sThisVersion == '') {
            OVERLAY({'mesg': '<p>检查版本出错，建议下载最新客户端！</p>'});
            return false;
        } else {
            sUpversion = sThisVersion;
            $.getData('/reqxml' + encodeURI('?action=2&version=' + sUpversion + '&Tfrom=($Tfrom)'), '', function (oData) {
                if (oData.ERRORNO != 0) {
                    var sUpdateURL = null;
                    if (TZT.BASEVAR.ISANDROID) {
                        sUpdateURL = '/action:10330?url=' + oData.UPDATEADDR; //attractive
                    } else {
                        sUpdateURL = '/action:10330?url=' + oData.UPDATEADDR; //attractive  
                    }
                    //强制更新
                    if (oData.UPDATESIGN == '2' || oData.UPDATESIGN == '1') {
                        if (type) {
                            var params = {
                                "mesg": '<p>请更新到最新版本！</p>',
                                "btnMesg": [
                                    {
                                        "name": "确定",
                                        "fn": function () {
                                            changeURL(sUpdateURL);
                                            OVERLAY(params);
                                        }
                                    }
                                ]
                            };
                            OVERLAY(params);
                        } else {
                            OVERLAY({
                                "mesg": '<p>发现新版本，是否更新？</p>',
                                "btnMesg": [
                                    {
                                        "name": "确定",
                                        "fn": function () {
                                            changeURL(sUpdateURL);
                                        }
                                    },
                                    {
                                        "name": "取消"
                                    }
                                ]
                            });
                        }
                    } else {
                        if (!type) {
                            OVERLAY({"mesg": '<p>当前版本已经是最新版本！</p>'});
                        }
                    }
                    return false;
                } else {
                    if (!type) {
                        OVERLAY({"mesg": '<p>当前版本已经是最新版本！</p>'});
                    }
                }
            });
        }
    });
};