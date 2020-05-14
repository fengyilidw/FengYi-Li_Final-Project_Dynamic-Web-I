//When animating on canvas, it is best to use requestAnimationFrame instead of setTimeout or setInterval.
//In addition, it might not supported in all browsers though and sometimes needs a prefix, so that's why we need the shim.
window.requestAnimFrame = ( function() {
	return window.requestAnimationFrame ||
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame ||
				function( callback ) {
					window.setTimeout( callback, 1000 / 60 );
				};
})();

//  First I need to setup the basic variables
var canvas = document.getElementById( 'canvas' ),
		ctx = canvas.getContext( '2d' ),
		// This is full screen dimensions
		cw = window.innerWidth,
		ch = window.innerHeight,
		// This is firework collection
		fireworks = [],
		// This will be particle collection
		particles = [],
		// Then, I need to starting hue
		hue = 120,
		// In addition, when launching fireworks with a click, too many get launched at once without a limiter, one launch per 5 loop ticks
		limiterTotal = 5,
		limiterTick = 0,
		// Then, this will time the auto launches of fireworks, one launch per 80 loop ticks
		timerTotal = 80,
		timerTick = 0,
		mousedown = false,
		// This is mouse x coordinate,
		mx,
		// This is mouse y coordinate
		my;
		
// Next, set canvas dimensions
canvas.width = cw;
canvas.height = ch;

// Then to setup the function placeholders for the entire project

// Next, to get a random number within a range
function random( min, max ) {
	return Math.random() * ( max - min ) + min;
}

// Then, I need to calculate the distance between two points
function calculateDistance( p1x, p1y, p2x, p2y ) {
	var xDistance = p1x - p2x,
			yDistance = p1y - p2y;
	return Math.sqrt( Math.pow( xDistance, 2 ) + Math.pow( yDistance, 2 ) );
}

// I need to create firework
function Firework( sx, sy, tx, ty ) {
	// Then, actual coordinates
	this.x = sx;
	this.y = sy;
	// Next, starting coordinates
	this.sx = sx;
	this.sy = sy;
	//Next, target coordinates
	this.tx = tx;
	this.ty = ty;
	//Then, distance from starting point to target
	this.distanceToTarget = calculateDistance( sx, sy, tx, ty );
	this.distanceTraveled = 0;
	// I also need to track the past coordinates of each firework to create a trail effect, increase the coordinate count to create more prominent trails
	this.coordinates = [];
	this.coordinateCount = 3;
	// Then, populate initial coordinate collection with the current coordinates
	while( this.coordinateCount-- ) {
		this.coordinates.push( [ this.x, this.y ] );
	}
	this.angle = Math.atan2( ty - sy, tx - sx );
	this.speed = 2;
	this.acceleration = 1.05;
	this.brightness = random( 50, 70 );
	// Next, I need to circle target indicator radius
	this.targetRadius = 1;
}

// Next step will be update firework
Firework.prototype.update = function( index ) {
	// Then, remove last item in coordinates array
	this.coordinates.pop();
	// In addition, add current coordinates to the start of the array
	this.coordinates.unshift( [ this.x, this.y ] );
	
	// Then, cycle the circle target indicator radius
	if( this.targetRadius < 8 ) {
		this.targetRadius += 0.3;
	} else {
		this.targetRadius = 1;
	}
	
	// I need to speed up the firework
	this.speed *= this.acceleration;
	
	// Next, will be getting the current velocities based on angle and speed
	var vx = Math.cos( this.angle ) * this.speed,
			vy = Math.sin( this.angle ) * this.speed;
	// I need to know how far will the firework have traveled with velocities applied?
	this.distanceTraveled = calculateDistance( this.sx, this.sy, this.x + vx, this.y + vy );
	
	// If the distance traveled, including velocities, is greater than the initial distance to the target, then the target has been reached
	if( this.distanceTraveled >= this.distanceToTarget ) {
		createParticles( this.tx, this.ty );
		// I need to remove the firework, use the index passed into the update function to determine which to remove
		fireworks.splice( index, 1 );
	} else {
		// Then, target not reached, keep traveling
		this.x += vx;
		this.y += vy;
	}
}

// Next, I will draw firework
Firework.prototype.draw = function() {
	ctx.beginPath();
	// First move to the last tracked coordinate in the set, then draw a line to the current x and y
	ctx.moveTo( this.coordinates[ this.coordinates.length - 1][ 0 ], this.coordinates[ this.coordinates.length - 1][ 1 ] );
	ctx.lineTo( this.x, this.y );
	ctx.strokeStyle = 'hsl(' + hue + ', 100%, ' + this.brightness + '%)';
	ctx.stroke();
	
	ctx.beginPath();
	// Second, draw the target for this firework with a pulsing circle
	ctx.arc( this.tx, this.ty, this.targetRadius, 0, Math.PI * 2 );
	ctx.stroke();
}

// Next step will be creating particle
function Particle( x, y ) {
	this.x = x;
	this.y = y;
	// First, I need track the past coordinates of each particle to create a trail effect, increase the coordinate count to create more prominent trails
	this.coordinates = [];
	this.coordinateCount = 5;
	while( this.coordinateCount-- ) {
		this.coordinates.push( [ this.x, this.y ] );
	}
	// Second, set a random angle in all possible directions, in radians
	this.angle = random( 0, Math.PI * 2 );
	this.speed = random( 1, 10 );
	// Then, friction will slow the particle down
	this.friction = 0.95;
	// Next, gravity will be applied and pull the particle down
	this.gravity = 1;
	// Then, set the hue to a random number +-20 of the overall hue variable
	this.hue = random( hue - 20, hue + 20 );
	this.brightness = random( 50, 80 );
	this.alpha = 1;
	// Next, set how fast the particle fades out
	this.decay = random( 0.015, 0.03 );
}

// Next step I need to update particle
Particle.prototype.update = function( index ) {
	// First, remove last item in coordinates array
	this.coordinates.pop();
	// Second, add current coordinates to the start of the array
	this.coordinates.unshift( [ this.x, this.y ] );
	// Third, slow down the particle
	this.speed *= this.friction;
	// Then, I apply velocity
	this.x += Math.cos( this.angle ) * this.speed;
	this.y += Math.sin( this.angle ) * this.speed + this.gravity;
	// Next, fade out the particle
	this.alpha -= this.decay;
	
	// Then, I remove the particle once the alpha is low enough, based on the passed in index
	if( this.alpha <= this.decay ) {
		particles.splice( index, 1 );
	}
}

// Then, draw particle
Particle.prototype.draw = function() {
	ctx. beginPath();
	// First, move to the last tracked coordinates in the set, then draw a line to the current x and y
	ctx.moveTo( this.coordinates[ this.coordinates.length - 1 ][ 0 ], this.coordinates[ this.coordinates.length - 1 ][ 1 ] );
	ctx.lineTo( this.x, this.y );
	ctx.strokeStyle = 'hsla(' + this.hue + ', 100%, ' + this.brightness + '%, ' + this.alpha + ')';
	ctx.stroke();
}

// Second, create particle group/explosion
function createParticles( x, y ) {
	// Third, I need to increase the particle count for a bigger explosion, beware of the canvas performance hit with the increased particles though
	var particleCount = 30;
	while( particleCount-- ) {
		particles.push( new Particle( x, y ) );
	}
}

// Next step is main loop
function loop() {
	// First, this function will run endlessly with requestAnimationFrame
	requestAnimFrame( loop );
	
	// Then, I need toincrease the hue to get different colored fireworks over time
	hue += 0.5;
	
	// Normally, clearRect() would be used to clear the canvas
	// I want to create a trailing effect though
	// Addition, setting the composite operation to destination-out will allow us to clear the canvas at a specific opacity, rather than wiping it entirely
	ctx.globalCompositeOperation = 'destination-out';
	// Then, I will decrease the alpha property to create more prominent trails
	ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
	ctx.fillRect( 0, 0, cw, ch );
	// Next, I need to change the composite operation back to our main mode
	// lighter creates bright highlight points as the fireworks and particles overlap each other
	ctx.globalCompositeOperation = 'lighter';
	
	// Then, I will loop over each firework, draw it, update it
	var i = fireworks.length;
	while( i-- ) {
		fireworks[ i ].draw();
		fireworks[ i ].update( i );
	}
	
	// Next, I will loop over each particle, draw it, update it
	var i = particles.length;
	while( i-- ) {
		particles[ i ].draw();
		particles[ i ].update( i );
	}
	
	// Then, launch fireworks automatically to random coordinates, when the mouse isn't down
	if( timerTick >= timerTotal ) {
		if( !mousedown ) {
			// I need to start the firework at the bottom middle of the screen, then set the random target coordinates, the random y coordinates will be set within the range of the top half of the screen
			fireworks.push( new Firework( cw / 2, ch, random( 0, cw ), random( 0, ch / 2 ) ) );
			timerTick = 0;
		}
	} else {
		timerTick++;
	}
	
	// Then, limit the rate at which fireworks get launched when mouse is down
	if( limiterTick >= limiterTotal ) {
		if( mousedown ) {
			// Next, start the firework at the bottom middle of the screen, then set the current mouse coordinates as the target
			fireworks.push( new Firework( cw / 2, ch, mx, my ) );
			limiterTick = 0;
		}
	} else {
		limiterTick++;
	}
}

// This will be the mouse event bindings
// First, update the mouse coordinates on mousemove
canvas.addEventListener( 'mousemove', function( e ) {
	mx = e.pageX - canvas.offsetLeft;
	my = e.pageY - canvas.offsetTop;
});

// Second, toggle mousedown state and prevent canvas from being selected
canvas.addEventListener( 'mousedown', function( e ) {
	e.preventDefault();
	mousedown = true;
});

canvas.addEventListener( 'mouseup', function( e ) {
	e.preventDefault();
	mousedown = false;
});

// Finally, once the window loads, we are ready for some fireworks!Yes! Good job!
window.onload = loop;