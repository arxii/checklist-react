
function clamp(n,min,max){
	if (n <= min) return min
	if(n >= max) return max
	return n
}

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };


var SlideMixin = require('./SlideMixin.js')
var createClass = require('react').createClass;
var PropTypes = require('react').PropTypes;
var createElement = require('react').createElement;


var Slide = createClass({
	displayName: 'Slide',
	mixins: [SlideMixin],


	/* default props */
	getDefaultProps: function() {

		return {
			pause_scroll: false,
			ease: 'cubic-bezier(0.25, 0.34, 0, 1)',
			index_offset: null,
			flip: false,
			vertical: false,
			_intui_slide: true, //intui slide identifier.
			ease_dur: 0.4, //slide ease_dur
			pos: 0, //current nested slide index.
			offset: 0, //slide offset in pixels
			overflow: 0,
			beta: 100, //beta relative to parent
			c: null, //inner and static classname shortcut
			oc: null, //outer classname shortcut
			slide: false,
			size: null,
			height: null, //height override
			width: null, //width override
			center: false,
			auto: false,
			reverse: false
		};
	},

	/* default state and instance variables */
	getInitialState: function() {
		this.stage = {
			x: 0,
			y: 0,
			o_time: 0,
			velocity: 0
		};

		this.i_w = null;
		this.i_h = null;

		this.set_timer = null;
		this.scroll_ppos = null;
		this.scroll_pos = 0;
		this.prev_pos = false; //im not sure what this does anymore
		this.scroll_events = [];

		this.rect = {
			width: 0,
			height: 0
		};

		return {
			dim: 0
		};
	},

	/* context for talking up and down the tree */
	contextTypes: {
		_intui_slide: PropTypes.bool, //this is a uique prop to identify a react component as an intui slide.
		total_beta: PropTypes.number, //total beta is the total beta of all children for this slide passed in the declarative props
		width: PropTypes.number, 
		height: PropTypes.number,
		vertical: PropTypes.bool 
	},


	childContextTypes: {
		_intui_slide: PropTypes.bool,
		total_beta: PropTypes.number,
		width: PropTypes.number,
		height: PropTypes.number,
		vertical: PropTypes.bool
	},

	// react method
	getChildContext: function() {
		return {
			_intui_slide: true,
			height: this.refs.outer ? this.refs.outer.clientHeight : null,
			width: this.refs.outer ? this.refs.outer.clientWidth : null,
			vertical: this.props.vertical
		};
	},

	//return the width/height of the slide in percentages based on parent context total beta.
	getBeta: function() {
		var beta = this.props.beta + '%';
		if (this.props.offset) return 'calc(' + beta + ' ' + (this.props.offset > 0 ? '+ ' : '- ') + Math.abs(this.props.offset) + 'px)';else return beta;
	},

	//get the calculated outer height and width of the slide.
	getOuterHW: function() {

		var w =  (!this.props.vertical && this.props.size) || this.props.width
		var h =  (this.props.vertical && this.props.size) || this.props.height

		var ph = this.props.vertical && this.props.auto ? 'auto' : typeof h == 'number' ? (h) + 'px' : (h);
		var pw = !this.props.vertical && this.props.auto ? 'auto' : typeof w == 'number' ? (w) + 'px' : (w);

		if (this.context.vertical) {
			pw = pw || '100%';
			ph = ph || this.getBeta();
		} else {
			pw = pw || this.getBeta();
			ph = ph || '100%';
		}



		return {
			height: ph,
			width: pw
		};
	},

	//get the calculated inner height and width of the slide.
	getInnerHW: function() {

		var dims = {
			width: this.props.vertical ? '100%' : 'auto',
			height: this.props.vertical ? 'auto' : '100%'
		};

		return dims;
	},

	//check to see if child is a valid intui slide.
	isValidChild: function(child) {

		if (child == null) return false;
		if (child.nodeName.displayName == 'Slide') return true;
		if (child.attributes && child.attributes['_intui_slide']) return true;
		if (child.type == null) return false;
		if (child.type.contextTypes == null) return false;
		if (child.type.contextTypes._intui_slide != null) return true;
		if (child.type.WrappedComponent != null && child.type.WrappedComponent.contextTypes._intui_slide != null) return true;
		return false;
	},

	//scroll to a position, the default transition time is 0.07 but may need to be adjusted based on performance.
	scrollTo: function(pos, dur) {
		if (this.scroll_ppos == pos) return null;
		this.scroll_ppos = pos;
		if (this.props.vertical) {
			this.refs.inner.style.transform = 'matrix(1, 0, 0, 1, 0, -' + pos + ')';
			this.stage.y = -pos;
		} else {
			this.refs.inner.style.transform = 'matrix(1, 0, 0, 1, -' + pos + ', 0)';
			this.stage.x = -pos;
		}
	},

	scroll_delta: function(delta) {
		if (this.props.pause_scroll == true) {
			// this.scrollTo(this.scroll_pos,true)
			return null;
		}

		var r_min = 0;
		var r_max = this.props.vertical ? this.refs.inner.clientHeight - this.refs.outer.clientHeight : this.refs.inner.clientWidth - this.refs.outer.clientWidth; //relative max (600px innerHeight)
		if (r_max < 0) r_max = 0;

		this.scroll_pos = clamp(this.scroll_pos + delta, r_min, r_max);

		for (var i = 0; i < this.scroll_events.length; i++) {
			// if (this.scroll_pos == r_min) this.scroll_events[i](0,r_max);
			// else if(this.scroll_pos == r_max) this.scroll_events[i](r_max,0);
			this.scroll_events[i](this.scroll_pos, r_max - this.scroll_pos);
		}

		this.scrollTo(this.scroll_pos);

		if (this.scroll_pos == r_max) return 1; //this.scroll_cb(1,delta);
		else if (this.scroll_pos == r_min) return -1; //this.scroll_cb(-1,delta);
			else return 0; //this.scroll_cb(0,delta);
	},

	
	getHWRatio: function() {
		if (this.rect.width != 0 && this.rect.height != 0) {
			return this.rect.width / this.rect.height;
		} else {
			return 0;
		}
	},

	// getHWInnerRatio: function() {
	// 	if (this.refs.inner.clientWidth != 0 && this.refs.inner.clientHeight != 0) {
	// 		return this.refs.inner.clientWidth / this.refs.inner.clientHeight;
	// 	} else {
	// 		return 0;
	// 	}
	// },

	toXY: function(x, y) {
		if (!this.refs.inner){
			return
		}
		if (this.props.vertical) y += this.props.index_offset;else x += this.props.index_offset;

		// console.log(this.props.index_offset);
		this.refs.inner.style.transform = 'matrix(1, 0, 0, 1, ' + String(-x) + ', ' + String(-y) + ')';
		this.showNonVisible(x, y);
		this.stage.y = -y;
		this.stage.x = -x;
		
		clearTimeout(this.slide_timer);
		// console.log(this.refs.inner);
		this.slide_timer = setTimeout(function () {
			// console.log(this.refs.inner);
			// console.log("HIDE TIMER")
			if(!this.refs.inner){
				return;
			}
			this.hideNonVisible(-this.stage.x, -this.stage.y);
			if (this.props.onSlideEnd != null) this.props.onSlideEnd(this.props.pos);
		}.bind(this), this.props.ease_dur * 1000);
	},

	setXY: function(x, y) {
		if (this.props.vertical) y += this.props.index_offset;else x += this.props.index_offset;

		//// console.log('set XY',x,y,this.props.id)
		clearTimeout(this.slide_timer);
		clearTimeout(this.set_timer);
		this.showNonVisible(x, y);
		// console.log("HIDE")
		this.hideNonVisible(x, y);
		
		this.refs.inner.style.transition = '';
		this.refs.inner.style.transform = 'matrix(1, 0, 0, 1, -' + x + ', -' + y + ')';
		this.stage.y = -y;
		this.stage.x = -x;

		this.set_timer = setTimeout(function () {

			if (this.refs.inner) {
				if (this.props.scroll) {
					this.refs.inner.style.transition = '';
				} else {
					this.refs.inner.style.transition = 'transform ' + this.props.ease_dur + 's ' + this.props.ease;
				}
			}
		}.bind(this),0);
	},

	//get x and y coordinates of child index.

	getIndexXY: function(index) {
		if(!this.props.children){
			throw new Error('getIndexXY, slide has no children')
		}
		if(!this.refs.outer){
			return {x:0,y:0}
		}
		if (!this.props.slide) return { x: 0, y: 0 };
		var o_w = this.refs.outer.clientWidth
		var o_h = this.refs.outer.clientHeight

		var i_w = 0
		var i_h = 0
		//// console.log(this.refs.outer.scrollWidth)
		var x,
		    y = 0;
		var self_x = -this.stage.x;
		var self_y = -this.stage.y;
		
	
		var cc = null;
		// log(this.props.children)
		for (var i = 0, j = 0; i < this.props.children.length; i++) {
			cc = this.refs.inner.children[i];
			if (!this.isValidElement(cc)) continue;
			i_w += cc.clientWidth
			i_h += cc.clientHeight
			if (j == index) break;
			j++;
		}

		if (cc == null){
			throw new Error('getIndexXY no valid children')
		}

		var max_y = Math.abs(i_h - o_h);
		var max_x = Math.abs(i_w - o_w);

		if (!this.props.vertical) {
			x = cc.offsetLeft;
			y = 0;
		} else {
			y = cc.offsetTop;
			x = 0;
		}


		i_pos = {
			x: this.props.vertical ? 0 : x > max_x ? max_x : x,
			y: this.props.vertical ? y > max_y ? max_y : y : 0
		};

		//// console.log(i_pos,max_x,this.props.slide)


		return i_pos
	},

	on: function(event, listener) {
		if (event == 'scroll') {
			this.scroll_events.push(listener);
		}
	},

	width: function() {
		if (!this.refs.outer) return -1;else return this.refs.outer.clientWidth;
	},

	height: function() {
		if (!this.refs.outer) return -1;else return this.refs.outer.clientHeight;
	},

	getRekt: function() {
		this.rect = {
			width: this.props.width || this.refs.outer.clientWidth,
			height: this.props.height || this.refs.outer.clientHeight
		};
	},

	betaToDim: function(beta) {
		if (!this.refs.outer) return 0;
		return (this.context.vertical ? this.refs.outer.parentElement.parentElement.clientHeight : this.refs.outer.parentElement.parentElement.clientWidth) / 100 * beta;
	},

	getDimChange: function(props) {
		if (props.height == this.props.height && props.width == this.props.width && props.beta == this.props.beta) return null;

		var diff_dim = null;
		var diff_beta = null;

		if (this.context.vertical && props.height != this.props.height) {
			if (props.height == null) {
				diff_dim = this.betaToDim(props.beta) - this.props.height;
			} else if (this.props.height == null) {
				diff_dim = props.height - this.betaToDim(this.props.beta);
			} else {
				diff_dim = props.height - this.props.height;
			}
		} else if (!this.context.vertical && props.width != this.props.width) {
			if (props.width == null) {} else if (this.props.width == null) {
				diff_dim = this.betaToDim(props.beta) - this.props.width;
				diff_dim = props.width - this.betaToDim(this.props.beta);
			} else {
				diff_dim = props.width - this.props.width;
			}
		} else if (props.beta != this.props.beta) {
			diff_beta = props.beta - this.props.beta;
		} else {
			throw 'something went wrong with dim transition.';
		}

		if (diff_beta) diff_dim = this.betaToDim(diff_beta);

		return {
			offset_x: this.context.vertical ? 0 : diff_dim,
			offset_y: !this.context.vertical ? 0 : diff_dim
		};
	},

	updateState: function(props, state, set) {

		state = state || this.state;
		props = props || this.props;

		if (this.refs.outer != null) {
			// //get dim change
			// var set_offset = this.getDimChange(props);

			// //if there is dim change pass offset along to transition manager
			// if(set_offset != null) DimController.add(this.refs.outer,set_offset);

			//get outer rectangle
			this.getRekt();

			//update self			
		}

		var ratio = this.getHWRatio();

		var d_needs_update = state.dim != ratio || props.width != this.props.width || props.height != this.props.height || props.beta != this.props.beta;



		if (d_needs_update) {
			var state = {
				offset_y: 0,
				offset_x: 0,
				dim: ratio
			};
			if (set) this.setState(state);else _extends(this.state, state);
		}

		return true;
	},

	/*
		toggle the child opacity
		@param {Boolean} if false then hide child, otherwise show child.
		
	*/
	toggleChildOpacity: function(cc, toggle) {
		// console.log('toggle',cc.getAttribute('class'),toggle)
		
		var cc_trans = cc.style.transition;
		var dur = this.props.ease_dur;
		var ease = this.props.ease;
		var old = cc.style.visibility || 'initial'
		cc.style.visibility = toggle ? 'initial' : 'hidden';

		var old_class = cc.className


		this.refs.inner.style.perspective =  Math.round( ( this.props.vertical ? this.refs.inner.clientHeight : this.refs.inner.clientWidth)) + 'px'

		
		if( toggle && old != cc.style.visibility && this.props.flip && cc._intui_timer == null && cc._intui_timer2 == null){
			
			if(toggle){
				cc.className += ' -i-slide-in_pre'
			}else{
				cc.className += ' -i-slide-out_pre'
			}
			// console.log('STAGE X',-this.stage.x)
			if( (!this.props.vertical && cc.offsetLeft >= -this.stage.x) || (this.props.vertical && cc.offsetTop > -this.stage.y) ){
				cc.className += ' -i-slide-right'
			}else{
				cc.className += ' -i-slide-left'
			}

			cc._intui_timer2 = setTimeout(function(){

				
				if(toggle){
					cc.className += ' -i-slide-in'
				}else{
					cc.className += ' -i-slide-out'
				}

			},50)
			cc._intui_old_class = old_class
			cc._intui_timer = setTimeout(function(){
				cc.className = cc._intui_old_class
				cc._intui_old_class = null
				cc._intui_timer = null
				cc._intui_timer2 = null
			},dur*1000+50)
		}
	},

	// check to see if element has intui class
	isValidElement: function(cc) {

		if (!cc) return false;

		if (cc.getAttribute('class') && cc.getAttribute('class').match(/-i-slide-outer|-i-slide-static/) != null) {
			return true;
		} else {
			return false;
		}
	},

	hideNonVisible: function(x, y) {
		return


		if (!this.props.slide) return false;
		// if (!this.refs.inner) return false;
		//// console.log('hide')
		for (var i = 0; i < this.props.children.length; i++) {
			var c = this.props.children[i];
			var cc = this.refs.inner.children[i];

			if (!this.isValidElement(cc)) continue;

			if (this.props.vertical) {
				//// console.log('hide',y,cc.offsetTop+cc.clientHeight)



				if (cc.offsetTop + cc.clientHeight <= y || cc.offsetTop >= y + this.refs.outer.clientHeight) {
					this.toggleChildOpacity(cc, 0);
					//// console.log('TOGGLE -',cc.offsetTop,cc.clientHeight)
				}
			} else {
				if (cc.offsetLeft + cc.clientWidth <= x || cc.offsetLeft >= x + this.refs.outer.clientWidth) {
					this.toggleChildOpacity(cc, 0);
					//// console.log('TOGGLE -')
				}
			}
		}
	},

	showNonVisible: function(x, y) {
		return 
		// y += (this.props.index_offset) || 0
		// x += (this.props.index_offset) || 0
		// console.log(this.props.index_offset)
		
		if (!this.props.slide) return;
		//// console.log('show',this.props.children.length)
		for (var i = 0; i < this.props.children.length; i++) {
			var c = this.props.children[i];
			
			// console.log(c,this.isValidChild(c))
			if (!this.isValidChild(c)) continue;

			var cc = this.refs.inner.children[i];
			if(!cc){
				continue
			}
			if (this.props.vertical) {
				// if(this.props.index_offset){
				// 	console.log(cc.offsetTop,cc.clientHeight,y)
				// }

				if( (cc.offsetTop >= y && cc.offsetTop < y + this.refs.outer.clientHeight) || ((cc.offsetTop + cc.clientHeight) > y) ){
					this.toggleChildOpacity(cc, 1);
				}
				
			} else {

				if((cc.offsetLeft >= x && cc.offsetLeft < x + this.refs.outer.clientWidth) || ((cc.offsetLeft + cc.clientWidth) > x)){
					this.toggleChildOpacity(cc, 1);
				}

			}
		}
	},

	toIndex: function() {
		if (this.props.index_offset == null && this.props.pos == null) return;
		var pos = this.getIndexXY(this.props.pos);

		this.toXY(pos.x, pos.y);
	},

	setIndex: function() {
		if (this.props.index_offset == null && this.props.pos == null) return;
		//// console.log('set index')
		var pos = this.getIndexXY(this.props.pos);
		this.setXY(pos.x, pos.y);
	},

	componentDidUpdate: function(props, state) {

		if (this.refs.inner) {
			if (this.props.scroll) {
				this.refs.inner.style.transition = '';
			} else {
				this.refs.inner.style.transition = 'transform ' + this.props.ease_dur + 's ' + this.props.ease;
			}
		}

		if ((this.props.pos != null || this.props.index_offset != null) && this.props.slide) {
			// if(this.props.c && this.props.c.match(/test/)){
	//			console.log(this.refs.inner.clientHeight)
			// }
			
			if (props.pos != this.props.pos || props.index_offset != this.props.index_offset) {

				setTimeout(this.toIndex, 100);
				this.i_h = this.refs.inner.clientHeight;
				this.i_w = this.refs.inner.clientWidth;
			} else if (this.prev_pos == true || this.i_h != this.refs.inner.clientHeight || this.i_w != this.refs.inner.clientWidth) {

				this.i_h = this.refs.inner.clientHeight;
				this.i_w = this.refs.inner.clientWidth;
				// var pos = this.getIndexXY(this.props.pos);
				if (props.pos != this.props.pos) {
					setTimeout(function(){
						this.toIndex()
					}.bind(this),0)
					
				} else {
					this.setIndex()
				}

				this.prev_pos = false;
			}
		}
	},

	componentWillUpdate: function componentWillUpdate(props, state) {
		// console.log('UPDATE SLIDE')
		this.updateState(props, state, false);
	},

	resize: function resize() {
		this.forceUpdate()
	},



	// on mount
	componentDidMount: function(){
		
		this.getRekt();
		this.updateState(null, null, true);
		if(this.props.slide == true){
			window.addEventListener ('resize',this.resize.bind(this))
		}
				//REMOVE
		if (this.props.pos != null && this.props.slide) {
			this.setIndex()
		}

	},


	onKeyDown: function(e){
		if (e.which == 13 && this.props.onEnter){
			this.props.onEnter()
		}
	},


	comopnentWillUnmount: function(){
		window.removeEventListener ('resize',this.resize.bind(this))
		window.removeEventListener ('resize',this.resize)
	},
	// will mount
	componentWillMount: function componentWillMount() {
		this.pass_props = {};
		this.events.forEach(function (e) {
			if (this.props[e]) {
				this.pass_props[e] = this.props[e];
			}
		}.bind(this));
	},

	// events (cant)
	events: ['onClick', 'onMouseEnter', 'onMouseLeave'],

	render: function(){
		var that = this;
		// if(this.props.c && this.props.c.match(/test/)) window.tslide = this

		// window._intui_render_calls = window._intui_render_calls || 0
		// window._intui_render_calls ++ 
		var dynamic = this.props.slide;
		var outer_hw_style, inner_hw_style, innerClass, inner, outerClass, staticClass,inner_2;
		// inner_2 = createElement(
		
		// )
		// console.log(this.props.children)

		if (dynamic && this.props.children){
			if(Array.isArray(this.props.children)){
				var inner_children = this.props.children.filter(function(c){
					return that.isValidChild(c);
				})			
				var outer_children = this.props.children.filter(function(c){
					return !that.isValidChild(c);
				})		
			}else{
				var inner_children = that.isValidChild(this.props.children) && this.props.children || null
				var outer_children = !that.isValidChild(this.props.children) && this.props.children || null
			}


				
		}


		

		if (dynamic) {
			outer_hw_style = _extends(this.getOuterHW(), this.props.style);
			inner_hw_style = this.getInnerHW();
			innerClass = ' -i-slide-inner ' + (this.props.vertical ? ' -i-slide-vertical ' : ' ') + (this.props.c || this.props.innerClassName || this.props.className || '') + (this.props.center ? ' -i-slide-center' : '')+ ' ' + (this.props.reverse && '-i-slide-reverse');
			inner = createElement(
				'div',
				{ className: innerClass, style: inner_hw_style, ref: 'inner' },
				inner_children
			);
			outerClass = ' -i-slide-outer ' + (this.props.oc || this.props.outerClassName || '') + (this.props.height != null || this.props.width != null ? ' -i-slide-fixed' : '');
			if(this.props.scroll){
				outerClass += ' -i-slide-scroll'
			}
		} else {
			outer_hw_style = _extends(this.getOuterHW(), this.props.style);
			inner = this.props.children;
			staticClass = ' -i-slide-static' + (this.props.center ? ' -i-slide-center' : '') + (this.props.vertical ? ' -i-slide-vertical ' : ' ') + (this.props.height != null || this.props.width != null ? ' -i-slide-fixed ' : ' ') + (this.props.c || this.props.innerClassName || this.props.className || '') + ' ' + (this.props.reverse && '-i-slide-reverse');
			if(this.props.scroll){
				staticClass += ' -i-slide-scroll'
			}
		}

		return createElement(
			'div',
			_extends({onKeyDown:this.onKeyDown.bind(this)}, this.pass_props, { id: this.props.id, className: dynamic ? outerClass : staticClass, style: outer_hw_style, ref: 'outer' }),
			inner,
			dynamic && outer_children || null

		);
	}
});

module.exports =  Slide