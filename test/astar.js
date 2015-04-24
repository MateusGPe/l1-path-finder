'use strict'

var tape = require('tape')
var vtx = require('../lib/vertex')
var Graph = require('../lib/graph')

var checkDefaultGraphInvariant = require('./graph-invariant')

tape('a-star - singleton', function(t) {

  var g = new Graph()
  var v = g.vertex(0,0)

  checkDefaultGraphInvariant(t, g)

  g.setSourceAndTarget(-1,-1,  1,1)
  g.addS(v)
  t.equals(v.weight, 2+g.heuristic(v), 'weight ok')
  t.equals(v.state, 1, 'v active')

  g.addT(v)
  t.ok(v.target, 'target ok')

  t.equals(g.search(), 4, 'distance ok')

  var p = g.getPath([])
  t.same(p, [1,1,0,0,-1,-1], 'path ok')

  checkDefaultGraphInvariant(t, g)

  g.setSourceAndTarget(-1,-1,  1,1)
  g.addS(v)
  t.equals(v.state, 1, 'v active')

  t.equals(g.search(), Infinity, 'disconnected')

  checkDefaultGraphInvariant(t, g)

  t.end()
})

tape('a-star - grid', function(t) {

  var g = new Graph()
  var verts = []

  for(var i=0; i<11; ++i) {
    var row = verts[i] = []
    for(var j=0; j<11; ++j) {
      row[j] = g.vertex(i, j)
    }
  }

  //Link edges
  for(var i=0; i<10; ++i) {
    for(var j=0; j<10; ++j) {
      g.link(verts[i][j], verts[i+1][j])
      g.link(verts[i][j], verts[i][j+1])
    }
  }

  checkDefaultGraphInvariant(t, g)

  //Run a series of random tests
  for(var i=0; i<100; ++i) {
    var sx = (Math.random()*10)|0
    var sy = (Math.random()*10)|0
    var tx = (Math.random()*10)|0
    var ty = (Math.random()*10)|0

    g.setSourceAndTarget(sx,sy, tx,ty)
    g.addS(verts[sx][sy])
    t.equals(verts[sx][sy].state, 1, 'v active')

    g.addT(verts[tx][ty])
    t.ok(verts[tx][ty].target, 'target ok')

    t.equals(g.search(), Math.abs(sx-tx) + Math.abs(sy-ty), 'dist ok')
    checkDefaultGraphInvariant(t, g)

    var path = g.getPath([])
    t.ok(path.length >= 2)
    t.equals(path[0], tx, 'path end x ok')
    t.equals(path[1], ty, 'path end y ok')
    for(var nn=1; 2*(nn+1)<path.length; ++nn) {
      t.equals(
          Math.abs(path[2*nn] - path[2*nn-2]) +
          Math.abs(path[2*nn+1] - path[2*nn-1]), 1, 'step ok')
    }
    t.equals(path[path.length-2], sx, 'path start x ok')
    t.equals(path[path.length-1], sy, 'path start y ok')
  }

  t.end()
})
