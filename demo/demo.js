'use strict'

var now = require('right-now')
var ndarray = require('ndarray')
var imshow = require('ndarray-imshow')
var mazegen = require('maze-generator')
var morphology = require('ball-morphology')
var mouseChange = require('mouse-change')
var shuffle = require('shuffle-array')
var createPlanner = require('../lib/planner')

var BALL_RADIUS = 6
var WIDTH = 1024
var HEIGHT = 512
var TILE_R = 16
var MAZE_X = (WIDTH/TILE_R)|0
var MAZE_Y = (HEIGHT/TILE_R)|0

var COLOR_MAIN  = '#C288E2'
var COLOR_A     = '#FFD293'
var COLOR_B     = '#88B7E1'
var COLOR_MINOR = '#FFFF93'

var COLORS = [
  '#88B7E1',
  '#A5CEF4',
  '#96C3E3',
  '#7CA9D2',
  '#709BC1'
]

var maze = mazegen([MAZE_Y,MAZE_X])

var canvas = document.createElement('canvas')
canvas.width = WIDTH
canvas.height = HEIGHT

var context = canvas.getContext('2d')

function line(x0, y0, x1, y1) {
  context.moveTo(x0*TILE_R, y0*TILE_R)
  context.lineTo(x1*TILE_R, y1*TILE_R)
}

function drawText(colorful) {
  context.fillStyle = colorful ? COLOR_MAIN : '#000'
  context.fillRect(0, 0, WIDTH, HEIGHT)

  context.strokeStyle = colorful ? COLOR_A : '#fff'
  context.beginPath()
  for(var i=0; i<MAZE_X; ++i) {
    for(var j=0; j<MAZE_Y; ++j) {
      var cell = maze[i][j]
      if(cell & 8) {
        line(i,j, i+1,j)
      }
      if(cell & 1) {
        line(i,j, i,j+1)
      }
    }
  }
  context.stroke()

  context.fillRect(0, 0, WIDTH, 65)
  context.fillRect(0, 512-65, WIDTH, 64)
  context.fillRect(32, 180, WIDTH-64, 128)


  context.fillStyle = colorful ? COLOR_MINOR : '#fff'
  context.textAlign = 'center'
  context.font = "80pt 'Courier New'"
  context.fillText('l1-path-finder', WIDTH>>1, 32+HEIGHT>>1)
}

drawText()
var pixels = context.getImageData(0, 0, WIDTH, HEIGHT)
var pixelArray = ndarray(pixels.data, [HEIGHT, WIDTH, 4])
var dilated = morphology.dilate(pixelArray.pick(-1,-1,0), BALL_RADIUS)
var planner = createPlanner(dilated.transpose(1,0))

//Render colorful text
drawText(true)

var renderCanvas = document.createElement('canvas')
renderCanvas.width = WIDTH
renderCanvas.height = HEIGHT
renderCanvas.style.position = 'absolute'
renderCanvas.style.left = '0'
renderCanvas.style.top = '0'
renderCanvas.style.width = '100%'
document.body.appendChild(renderCanvas)

var renderContext = renderCanvas.getContext('2d')

var particles    = []
var paths        = []
var defTargets   = []
var oldTargets   = []
var speed        = []

for(var i=0; i<18; ++i) {
  particles.push([ 90 + i * 50, 32 ])
  defTargets.push([ 1024 - (90 + i * 50), 512-32 ])
  speed.push((Math.random()*2+2)|0)
}
oldTargets = particles.map(function(p) {
  return p.slice()
})

function recalcPaths(targets) {
  for(var i=0; i<particles.length; ++i) {
    var p = particles[i]
    var t = targets[i]
    var npath = []
    planner.search(p[0], p[1],
      Math.max(Math.min(t[0], WIDTH-1), 0),
      Math.max(Math.min(t[1], HEIGHT-1), 0), npath)
    if(npath.length > 0) {
      paths[i] = npath
    }
  }
}

recalcPaths(defTargets)

var mouseDown = false
var mouseX = 0
var mouseY = 0
mouseChange(renderCanvas, function(buttons, x, y) {
  x = Math.round(x / renderCanvas.clientWidth * WIDTH)|0
  y = Math.round(y / renderCanvas.clientHeight * HEIGHT)|0
  if(buttons) {
    mouseDown = true
    mouseX = x
    mouseY = y
  } else if(mouseDown) {
    mouseDown = false
    recalcPaths(defTargets)
  }
})

function moveParticle(loc, path, speed) {
  while(speed > 0 && path.length > 0) {
    var x = path[0]
    var y = path[1]
    if(loc[0] < x) {
      loc[0] += 1
      speed -= 1
    } else if(loc[0] > x) {
      loc[0] -= 1
      speed -= 1
    } else if(loc[1] < y) {
      loc[1] += 1
      speed -= 1
    } else if(loc[1] > y) {
      loc[1] -= 1
      speed -= 1
    } else {
      path.shift()
      path.shift()
    }
  }
}

function searchSquare(dx, dy) {
  if(dilated.get(dy, dx)) {
    var cx = dx
    var cy = dy
    var r = 10000
    for(var ox=-5; ox<=5; ++ox) {
      for(var oy=-5; oy<=5; ++oy) {
        if(ox*ox + oy*oy < r) {
          var nx = Math.max(Math.min(dx+ox, WIDTH-1), 0)
          var ny = Math.max(Math.min(dy+oy, HEIGHT-1), 0)
          if(!dilated.get(ny, nx)) {
            cx = nx
            cy = ny
            r = ox*ox + oy*oy
          }
        }
      }
    }
    dx = cx
    dy = cy
  }
  return [dx, dy]
}

var theta = 0.0

function render() {

  requestAnimationFrame(render)

  renderContext.drawImage(canvas, 0, 0)


  if(mouseDown) {
    theta = (theta + 0.005) % (2.0 * Math.PI)
    var targets = []

    for(var i=0; i<particles.length; ++i) {
      var phi = theta + 2.0 * Math.PI*i/18

      var dx = Math.round(mouseX + Math.cos(phi) * 30)|0
      var dy = Math.round(mouseY + Math.sin(phi) * 30)|0
      dx = Math.max(Math.min(dx, WIDTH-1), 0),
      dy = Math.max(Math.min(dy, HEIGHT-1), 0)

      targets[i] = searchSquare(dx, dy)
    }

    recalcPaths(targets)
  }

  var numActive = 0
  for(var i=0; i<particles.length; ++i) {
    var p = particles[i]
    renderContext.fillStyle = COLORS[i % COLORS.length]
    renderContext.beginPath()
    renderContext.arc(p[0], p[1], BALL_RADIUS, 0, 2 * Math.PI, false)
    renderContext.fill()
    var s = speed[i]
    if(mouseDown) {
      s = 10
    }
    moveParticle(p, paths[i], s)
    if(paths[i].length > 0) {
      numActive ++
    }
  }

  if(numActive === 0 && !mouseDown) {
    var tmp = oldTargets
    oldTargets = defTargets
    defTargets = shuffle(tmp)
    for(var i=0; i<particles.length; ++i) {
      speed[i] = (Math.random()*5+2)|0
    }
    recalcPaths(defTargets)
  }
}

render()
