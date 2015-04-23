'use strict'

module.exports = Graph

var UnionFind = require('union-find')
var vtx = require('./vertex')
var NIL = vtx.NIL

var OPEN    = 0
var ACTIVE  = 1
var CLOSED  = 2

function Graph() {
  this.target   = vtx.create(0,0)
  this.verts    = []
  this.freeList = this.target
  this.toVisit  = NIL
  this.lastS    = null
  this.lastT    = null
  this.nudge    = 1.0
  this.srcX     = 0
  this.srcY     = 0
  this.dstX     = 0
  this.dstY     = 0
}

var proto = Graph.prototype

proto.vertex = function(x, y) {
  var v = vtx.create(x, y)
  this.verts.push(v)
  return v
}

proto.link = function(u, v) {
  vtx.link(u, v)
}

proto.setSourceAndTarget = function(sx, sy, tx, ty) {
  this.srcX = sx
  this.srcY = sy
  this.dstX = tx
  this.dstY = ty
}

proto.heuristic = function(v) {
  return this.nudge * (Math.abs(v.x-this.dstX) + Math.abs(v.y-this.dstY))
}

//Mark vertex connected to source
proto.addS = function(v) {
  var w = Math.abs(this.srcX - v.x) + Math.abs(this.srcY - v.y)
  v.distance = w
  v.weight = w + this.heuristic(v)
  v.state = ACTIVE
  v.pred = null
  this.toVisit = vtx.push(this.toVisit, v)
  this.freeList = vtx.insert(this.freeList, v)
  this.lastS = v
}

//Mark vertex connected to target
proto.addT = function(v) {
  v.target = true
  this.freeList = vtx.insert(this.freeList, v)
  this.lastT = v
}

//Retrieves the path from dst->src
proto.getPath = function(out) {
  out.push(this.dstX, this.dstY)
  var head = this.target.pred
  if(head.x === this.dstX && head.y === this.dstY) {
    head = head.pred
  }
  while(head) {
    out.push(head.x, head.y)
    head = head.pred
  }
  if(out[out.length-2] !== this.srcX || out[out.length-1] !== this.srcY) {
    out.push(this.srcX, this.srcY)
  }
  return out
}

proto.findComponents = function() {
  var n = this.verts.length
  var ds = new UnionFind(n)
  for(var i=0; i<n; ++i) {
    var v = this.verts[i]
    v.component = i
  }
  for(var i=0; i<n; ++i) {
    var v = this.verts[i]
    var adj = v.edges
    for(var j=0; j<adj.length; ++j) {
      ds.link(i, adj[j].component)
    }
  }
  for(var i=0; i<n; ++i) {
    var v = this.verts[i]
    v.component = ds.find(i)
  }
}

//Runs a* on the graph
proto.search = function() {
  var target = this.target
  var freeList = this.freeList
  var sx = this.srcX
  var sy = this.srcY
  var tx = this.dstX
  var ty = this.dstY
  var nudge = this.nudge

  //Initialize target properties
  var dist = Infinity

  //Test for case where S and T are disconnected
  if( this.lastS && this.lastT &&
      this.lastS.component === this.lastT.component )
  for(var toVisit=this.toVisit; toVisit!==NIL; ) {
    var node = toVisit
    node.state = CLOSED
    toVisit = vtx.pop(toVisit)

    var nx = node.x
    var ny = node.y

    //If node is connected to target, add in target distance
    if(node.target) {
      dist = node.distance + Math.abs(nx-tx) + Math.abs(ny-ty)
      target.pred = node
      break
    } else {
      var adj = node.edges
      var d = node.distance
      var n = adj.length
      for(var i=0; i<n; ++i) {
        var v = adj[i]
        if(v.state === CLOSED) {
          continue
        }
        var vx = v.x
        var vy = v.y
        var dd = Math.abs(nx-vx) + Math.abs(ny-vy) + d
        var w = dd + nudge * (Math.abs(vx-tx) + Math.abs(vy-ty))
        if(v.state === OPEN) {
          v.state = ACTIVE
          v.weight = w
          v.distance = dd
          v.pred = node
          toVisit = vtx.push(toVisit, v)
          freeList = vtx.insert(freeList, v)
        } else if(w < v.weight) {
          v.weight = w
          v.distance = dd
          v.pred = node
          toVisit = vtx.decreaseKey(toVisit, v)
        }
      }
    }
  }

  //Clear the free list & priority queue
  vtx.clear(freeList)

  //Reset pointers
  this.freeList = target
  this.toVisit = NIL
  this.lastS = this.lastT = null

  //Return target distance
  return dist
}
