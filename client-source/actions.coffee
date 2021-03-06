uuid = require 'uuid/v4'
parseUrl = require('url-parse')


uploadImage = (form,res,rej,use_get)->
	$.ajax
		type: 'post'
		url: 'api/user/upload'
		data: form
		contentType: false
		processData: false
		success: (img)->
			res img
		error: (xhr,type)->
			actions.mergeState
				error: xhr.response || 'error'


sendState = (opt)->
	$.ajax
		type: opt.type
		url: opt.route
		data: opt.type == 'post' && JSON.stringify(opt.state) || opt.state
		dataType: 'json'
		contentType: 'application/json'
		timeout: 1000
		success: actions.mergeState
		error: (xhr,type)->
			actions.mergeState
				error: xhr.response
			if opt.rej
				opt.rej(new Error 'error')










getPinWH = (width,height)->
	w = 1
	h = 1
	# console.log width,height
	if width > height * 1.4
		w = 2
	else if height > width * 1.4
		h = 2

	# console.log w,h

	return
		w: w
		h: h



class Actions 


	signup: (state)->
		if state.pass != state.pass_confirm
			return @showError 'passwords dont match'
		
		sendState 
			type: 'post'
			route: 'api/auth/signup'
			state: 
				email: state.email
				pass: state.pass

	setView: (state)->
		return state

	login: (state)->
		sendState 
			type: 'get'
			route: 'api/auth/local'
			state: 
				email: state.email
				pass: state.pass
				# document.location.href = '/group/'+state.group.id


	logout: (state)->
		sendState 
			type: 'get'
			route: 'api/user/logout'
		@hideModal()


	goUserHome: (state)->
		@setView
			show_todo: null
		sendState
			type: 'get'
			route: 'api/user'

		@hideModal()

	addFriend: (user)->
		sendState
			type: 'post'
			route: 'api/user/add_friend/'+user._id

		@hideModal()	


	addTodo: (state)->
		todo = 
			name: state.text
			created_at: Date.now()
			completed_at: null

		if state.parent_todo_id
			route = 'api/user/group/'+state.group_id+'/todo/'+state.parent_todo_id+'/addtodo'
		else
			route = 'api/user/group/'+state.group_id+'/addtodo'


		sendState
			type: 'post'
			route: route
			state: todo
		@hideModal()
	
	editTodo: (group_id,todo,state)->
		if todo.sub
			route = 'api/user/group/'+group_id+'/todo/'+todo.parent_id+'/subtodo/'+todo._id+'/set'
		else
			route = 'api/user/group/'+group_id+'/todo/'+todo._id+'/set'

		sendState
			type: 'post'
			route: route
			state: state
		@hideModal()


	findFriend: (name)->
		sendState
			type: 'get'
			route: 'api/user/find/user'
			state:
				name: name


	generateGroupLink: (group_id)->
		sendState
			type: 'get'
			route: 'api/user/group/'+group_id+'/invite_link'

	setTodoState: (index,state,sub_index)->
		return {
			index: index
			sub_index: sub_index
			state: state
		}

	showAddPinModal: (todo,sub_todo)->
		return
			edit_todo: todo

	
	addPin: (group_id,todo,form,state)->
		state = Object.assign {},state
		delete state.files 
		if todo.sub
			route = '/api/user/group/'+group_id+'/todo/'+todo.parent_id+'/subtodo/'+todo._id+'/addpin'
		else
			route = '/api/user/group/'+group_id+'/todo/'+todo._id+'/addpin'
		
		
		if state.type == 'link'
			link = parseUrl(state.link)
			state.link_icon_img = 'http://www.google.com/s2/favicons?domain='+link.host


		

		if form.get('file')
			uploadImage form,
			(img)->

				state.img = img.img
				state.thumb = img.thumb
				sendState
					type: 'post'
					route: route
					state: state

			url = URL.createObjectURL(form.get('file'))
			img = new Image()
			img.src = url
			img.onload = ()->
				dim = getPinWH(img.width,img.height)
				Object.assign state,dim
		else
			sendState
				type: 'post'
				route: route
				state: state
			
			
			

		@hideModal()
			

	



	setState: (state)->
		return state

	mergeState: (state)->
		return state




	showTodoEditModal: (todo,sub_todo)->
		return
			edit_todo: todo
			edit_todo_sub: sub_todo


	removeTodo: (group_id,todo_id,sub_todo_id)->
		if sub_todo_id
			route = 'api/user/group/'+group_id+'/todo/'+todo_id+'/subtodo/'+sub_todo_id+'/remove'
		else
			route = 'api/user/group/'+group_id+'/todo/'+todo_id+'/remove'
		

		sendState
			type: 'post'
			route: route
		
		@hideModal()




	showAddSubTodo: (todo)->
		return
			parent_todo: todo
		# @setModal('addTodo')

	searchUsers: (name)->
		sendState
			type: 'get'
			route: '/api/user/find/user'
			state: 
				name: name

	setUser: (state)->
		
		
		if state.file
			form = new FormData()
			form.append 'file',state.file
			uploadImage form,
			(img)->
				user = 
					name: state.name
					img: img.img
					thumb: img.thumb
				sendState
					type: 'post'
					route: '/api/user/set'
					state: user
		else
			user = 
				name: state.name
			sendState
				type: 'post'
				route: '/api/user/set'
				state: user


	showGroup: (id)->
		sendState
			type: 'get'
			route: 'api/user/group/'+id


	createGroup: (state)->
		sendState 
			type: 'post'
			route: 'api/user/group/new'
			state: state
		@hideModal()


	editGroup: (state,id)->
		sendState 
			type: 'post'
			route: 'api/user/group/'+id+'/set'
			state: state
		@hideModal()
	
	leaveGroup: (id)->
		sendState 
			type: 'post'
			route: 'api/user/group/'+id+'/leave'
		@hideModal()


	
	sendState: (state)->
		return (dispatch)->
			sendState state,
				(state)->
					# console.log "GOT SERVER STATE",state
					dispatch state
				(error)->
					# console.log "GOT SERVER STATE ERROR",error
					dispatch
						# show_modal: false
						error: error.message


	setModal: (content)->
		return content

	newPin: (form)->
		type = form.get('type')
		pin = 
			id : uuid()
			type: type
		if type == 'photo'
			pin.img = URL.createObjectURL(form.get('file'))
			img = new Image()
			img.src = pin.img
			dim = getPinWH(img.naturalWidth,img.naturalHeight)
			Object.assign pin,dim
			pin.width = img.naturalWidth
			pin.height = img.naturalHeight
			pin.caption = form.get('caption')

		else if type == 'link'
			link = form.get('link')
			link = parseUrl(link)
			pin.link = link
			pin.link_icon_img = 'http://www.google.com/s2/favicons?domain='+link.host

		else if type == 'textsms'
			pin.text = form.get('text')


		return pin

	newGroupUser: (form)->
		user = 
			name: form.get('name')

		form.append 'id',user.id
		return (dispatch)->
			uploadImage form,
			(got_user)->
				dispatch Object.assign got_user,user




	showPins: (id)->
		show_todo: id
	

	setRooomPass: (pass)->
		return send
			pass: pass
		.then (ok)->
			return {
				ok: yes
			}
		.catch (err)->
			return {
				error: err
				ok: no
			}



	showSlides: (opt)->
		return opt



	
	hideSide: ()->
		return true


	hideModal: ()->
		return true

	showTodoForm: ()->
		return true
	
	showError: (message)->
		return message
	


module.exports = alt.createActions Actions