require './style/ProgressBar.scss';
#Input base class

{h,Component} = require 'preact'
el = h
cn = require 'classnames'

class ProgressBar
	render: ->
		el 'div',
			className: cn '-i-progress-bar',@props.className
		,
			el 'div',
				className: '-i-progress-bar-inner'
				style: 
					transform:'translateX(-'+(50*(1-@props.ratio).clamp(0,1))+'%)'
			,
				el 'div',
					className: '-i-progress-bar-left'
				el 'div',
					className: '-i-progress-bar-right'

ProgressBar.defaultProps = 
	ratio:0

module.exports =  ProgressBar