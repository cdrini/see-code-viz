window.FONT_HEIGHT = 16;
window.CHAR_WIDTH = 10 * FONT_HEIGHT/16;
window.TRACE = true;

function Node(type, code) {
	this.type = type;
	this.code = code;
	this.children = [];
	this.childrenConnections = [];
	this.parentConnections = [];
	this.parent = [];
	
	this.makeGroup = function(){
		if(TRACE){
			console.log("Started making group for type " + this.type);
		}
		this.group = document.createElementNS("http://www.w3.org/2000/svg", 'g');
		var shape = document.createElementNS("http://www.w3.org/2000/svg", Node.shapeKey[this.type].shape);
		this.group.appendChild(shape);
		this.group.setAttribute('class', this.type);
		
		var text = document.createElementNS("http://www.w3.org/2000/svg", 'text');
		text.innerHTML = this.code;
		this.group.appendChild(text);
		
		for(var i = 0; i < Node.shapeKey[this.type].properties.length; i++){
			var attr = Node.shapeKey[this.type].properties[i].attribute;
			var attrDet = Node.shapeKey[this.type].properties[i].determinant; //the function that determines the attribute based on the node
			shape.setAttribute(attr, attrDet(this));
		}
		text.setAttribute('y', this.group.firstChild.getAttribute('height')/2 + FONT_HEIGHT/2 - 2);
		if(Node.shapeKey[this.type].textOffset) text.setAttribute('x', this.group.firstChild.getAttribute('width')/2 + Node.shapeKey[this.type].textOffset);
		else text.setAttribute('x', this.group.firstChild.getAttribute('width')/2);
		
		//making the input/output dots
		if(Node.shapeKey[this.type].outputs){
			for(var j = 0; j < Node.shapeKey[this.type].outputs.length; j++){
				var loc = Node.shapeKey[this.type].outputs[j];
				var output = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
				output.setAttribute('class', 'output');
				output.setAttribute('cx', loc.x(this));
				output.setAttribute('cy', loc.y(this));
				output.setAttribute('r', 2);
				this.group.appendChild(output);
			}
		}
		if(Node.shapeKey[this.type].inputs){
			for(var j = 0; j < Node.shapeKey[this.type].inputs.length; j++){
				var loc = Node.shapeKey[this.type].inputs[j];
				var input = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
				input.setAttribute('class', 'input');
				input.setAttribute('cx', loc.x(this));
				input.setAttribute('cy', loc.y(this));
				input.setAttribute('r', 2);
				this.group.appendChild(input);
			}
		}
	}
	
	this.startNode = function(){
		if(!this.group) this.makeGroup();
		this.row = 0;
		this.col = 0;
		this.group.setAttribute('transform', "translate(200,0)");
		document.getElementById('mainSVG').appendChild(this.group);
		Node.occupied[0] = {0:this};
	}
	
	this.addChild = function(child){
		if(!this.group) this.makeGroup();
		child.makeGroup();
		
		if(TRACE) console.log("Type " + this.type + " has " + this.group.getElementsByClassName('output').length + " possible output(s).");
		var output = this.group.getElementsByClassName('output')[this.children.length];
		if(!output){
			output = this.group.getElementsByClassName('output')[this.group.getElementsByClassName('output').length-1];
			/*
			throw("ERROR: No more outputs available");
			return;
			*/
		}
		var start_x = Number(this.group.getAttribute('transform').match(/[0-9]{1,}|-[0-9]{1,}/g)[0]) + Number(output.getAttribute('cx'));
		var start_y = Number(this.group.getAttribute('transform').match(/[0-9]{1,}|-[0-9]{1,}/g)[1]) + Number(output.getAttribute('cy'));
		
		var input = child.group.getElementsByClassName('input')[child.parent.length];
		if(!output){
			throw("ERROR: No more inputs available");
			return;
		}
		var end_x = this.group.getElementsByClassName('output').length == this.children.length + 1 ? 0 : 50 + Number(input.getAttribute('cx'));
		var end_y = 50;
		//note these are relative to start_x and start_y
		
		this.children = this.children.concat(child);
		child.parent = child.parent.concat(this);
		
		var new_row = this.row + 1;
		var new_col = this.col + Boolean(end_x);
		
		var block;
		while(block = Node.isOccupied(new_row, new_col)){
			if (block.parent[0].col < this.col){
				this.shift(1);
				start_x = Number(this.group.getAttribute('transform').match(/[0-9]{1,}|-[0-9]{1,}/)) + Number(output.getAttribute('cx'));
				end_x = this.group.getElementsByClassName('output').length == this.children.length + 1 ? 0 : 50 + Number(input.getAttribute('cx'));
				new_col = this.col + Boolean(end_x);
			} else {
				block.parent[0].shift(1);
				break;
			}
		}
		
		if(!Node.occupied[new_col]) Node.occupied[new_col] = {new_row:child};
		else Node.occupied[new_col][new_row] = child;
		child.col = new_col;
		child.row = new_row;
		
		//make the connector path
		var path = document.createElementNS("http://www.w3.org/2000/svg", 'path');
		path.setAttribute('d', "m " + start_x + "," + start_y + " c 0,-10 " + end_x + ",1 " + end_x + "," + end_y);
		path.setAttribute('class', 'connector');
		document.getElementById('mainSVG').appendChild(path);
		this.childrenConnecitons = this.childrenConnections.concat(path);
		child.parentConnections = child.parentConnections.concat(path);
		
		child.group.setAttribute('transform', "translate(" + (start_x - Number(input.getAttribute('cx')) + end_x) + "," + (start_y + end_y) + ")");
		document.getElementById('mainSVG').appendChild(child.group);
	}
	
	this.shift = function(num){
		if(TRACE) console.log('Shifting Begun');
		var old_transform = this.group.getAttribute('transform').match(/[0-9]{1,}|-[0-9]{1,}/g);
		var new_shift = Number(old_transform[0]) + num*(50);
		for(var i = 0; i < this.parentConnections.length; i++){
			var old = this.parentConnections[i].getAttribute('d');
			var temp = old.match(/[^ ]+$/);
			var newr = old.replace(/[^ ]+$/, Number(temp.match(/[0-9]{1,}/)[0]) + new_shift + "," + temp.match(/[^, ]+$/));
			this.parentConnections[i].setAttribute('d', newr);
		}
		for(var j = 0; i < this.childrenConnections.length; i++){
			var old = this.childrenConnections[i].getAttribute('d');
			var newr = old.replace(/[0-9]{1,}/, Number(old.match(/[0-9]{1,}/)) + new_shift)
			this.childrenConnections[i].setAttribute('d', newr);
		}
		this.group.setAttribute('transform', "translate(" + new_shift + "," + old_transform[1]+")");
		delete(Node.occupied[this.col][this.row]);
		this.col += num;
		if(Node.isOccupied(this.row, this.col)){
			this.parent[0].shift(1);
		}
		if(!Node.occupied[this.col]) Node.occupied[this.col] = {};
		Node.occupied[this.col][this.row] = this;
		
		for(var i = 0; i < this.children.length; i++){
			this.children[i].shift(num);
		}
	}

	
	this.endings = function(){
		if(TRACE) console.log("Grabbing endings of " + this.type + "("+this.code+")");
		if(this.children.length === 0){
			if(TRACE) console.log("Ending found " + this.type + "("+this.code+")");
			return [this];
		}
		
		var result = [];
		for(var i = 0; i < this.children.length; i++){
			if(this.children[i].type == 'if' || this.children[i].type == 'else if') continue;
			result = result.concat(this.children[i].endings());
		}
		if(TRACE) console.log("Endings are " + result);
		return result;
	}
	
	this.connectToChild = function(child){
		var start = this.group.getElementsByClassName('output')[this.group.getElementsByClassName('output').length-1];
		var end = child.group.getElementsByClassName('input')[0];
		var start_x = Number(this.group.getAttribute('transform').match(/[0-9]{1,}|-[0-9]{1,}/g)[0]) + Number(start.getAttribute('cx'));
		var start_y = Number(this.group.getAttribute('transform').match(/[0-9]{1,}|-[0-9]{1,}/g)[1]) + Number(start.getAttribute('cy'));
		
		var end_x = Number(child.group.getAttribute('transform').match(/[0-9]{1,}|-[0-9]{1,}/g)[0]) + Number(end.getAttribute('cx'));
		var end_y = Number(child.group.getAttribute('transform').match(/[0-9]{1,}|-[0-9]{1,}/g)[1]) + Number(end.getAttribute('cy'));
		
		//make the connector path
		var path = document.createElementNS("http://www.w3.org/2000/svg", 'path');
		path.setAttribute('d', "m " + start_x + "," + start_y + " c 0,-10 " + (end_x-start_x) + ",1 " + (end_x-start_x) + "," + (end_y-start_y));
		path.setAttribute('class', 'connector');
		document.getElementById('mainSVG').appendChild(path);
		this.childrenConnecitons = this.childrenConnections.concat(child);
		child.parentConnections = child.parentConnections.concat(this);
	}

}
Node.isOccupied = function(row, col){
	if(!Node.occupied[col]) return false;
	return Node.occupied[col][row];
}
Node.occupied = {}; //col then row
Node.shapeKey = {};
Node.shapeKey['function'] = { shape:'rect', properties:[
{attribute:'height', determinant:function(node){return 30;}},
{attribute:'ry', determinant:function(node){return node.group.firstChild.getAttribute('height')/2;}},
{attribute:'width', determinant:function(node){return node.code.length * CHAR_WIDTH + 2*node.group.firstChild.getAttribute('ry') + 2;}},],
outputs:[{x:function(node){return node.group.firstChild.getAttribute('width')/2;},
		  y:function(node){return node.group.firstChild.getAttribute('height');}}]};

Node.shapeKey['if'] = Node.shapeKey['else if'] = Node.shapeKey['while'] = { shape:'path', textOffset:-12, properties:[
{attribute:'height', determinant:function(node){return 30;}},
{attribute:'width', determinant:function(node){return node.code.length * CHAR_WIDTH + 24;}},
{attribute:'d', determinant:function(node){return "m 0,0 WIDTH,0 12,15 -12,15 -WIDTH,0 -12,-15 12,-15 z".replace(/WIDTH/g, node.group.firstChild.getAttribute('width')-24);}}],
inputs:[{x:function(node){return node.group.firstChild.getAttribute('width')/2 - 12;},
		  y:function(node){return 0;}}],
outputs:[{x:function(node){return node.group.firstChild.getAttribute('width') - 12;},
		  y:function(node){return node.group.firstChild.getAttribute('height')/2;}},
		 {x:function(node){return node.group.firstChild.getAttribute('width')/2 -12;},
		  y:function(node){return node.group.firstChild.getAttribute('height');}},]};
		  
Node.shapeKey.statement = Node.shapeKey['for'] = Node.shapeKey['do'] = Node.shapeKey['else']= { shape:'rect', properties:[
{attribute:'height', determinant:function(node){return 30;}},
{attribute:'width', determinant:function(node){return node.code.length * CHAR_WIDTH + 20;}},],
inputs:[{x:function(node){return node.group.firstChild.getAttribute('width')/2;},
		  y:function(node){return 0;}}],
outputs:[{x:function(node){return node.group.firstChild.getAttribute('width')/2;},
		  y:function(node){return node.group.firstChild.getAttribute('height');}}]};