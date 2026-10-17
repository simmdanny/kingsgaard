#!/usr/bin/env python3
"""THE BOULDERS' SHAPES (godot/tools/stones/make_stones.py): the browser game's one stone generator (src/world/wrlook.js makeStone,
the mockup's surface-study.html lines 432-456), ported line for line so the Godot boulders are the very same fourteen stones:
a box scaled unevenly, 3-6 plane cuts through corners and edges (big flat faces), then a small exact bevel - every vertex of an
icosphere is pulled onto the cut box shrunk by the bevel radius (Dykstra's projection onto the half-spaces) and pushed back out by
it, so faces stay flat, only edges and corners round, and the normals are exact. Seeds 1000 + 37 i, the same random stream (mkRng).
Three levels like the browser game's: the icosphere of three.js detail 5 (near), 4 and 3 (far).

Writes stones.json beside it; scripts/tools/bake_stones.gd turns that into art/stones/stones.res (a MeshLibrary, item = shape * 3 + level).
  python3 godot/tools/stones/make_stones.py && godot --headless --path godot --script res://scripts/tools/bake_stones.gd
Per vertex: COLOR = (edge, occ, rel, 1), UV = (seam, 0) - as the browser game's aEdge, aOcc, aRel, aSeam (shaders/stone.gdshader)."""
import json
import math
import os

N_SHAPES = 14
LEVELS = [5, 4, 3]


def mk_rng(seed):
    x = [(seed * 9301 + 49297) % 233280]

    def r():
        x[0] = (x[0] * 9301 + 49297) % 233280
        return x[0] / 233280

    return r


def icosphere(detail):
    """three.js r128 IcosahedronGeometry(1, detail): PolyhedronGeometry's subdivision, then welded (weld(): positions rounded to 1e-4)"""
    t = (1 + math.sqrt(5)) / 2
    v = [-1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0, 0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1]
    idx = [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6,
           3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1]
    V = [(v[i * 3], v[i * 3 + 1], v[i * 3 + 2]) for i in range(12)]
    out = []

    def lerp(a, b, k):
        return (a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k)

    for f in range(20):
        a, b, c = V[idx[f * 3]], V[idx[f * 3 + 1]], V[idx[f * 3 + 2]]
        cols = detail + 1
        grid = []
        for i in range(cols + 1):
            aj = lerp(a, c, i / cols)
            bj = lerp(b, c, i / cols)
            rows = cols - i
            grid.append([aj if (j == 0 and rows == 0) else lerp(aj, bj, j / rows) if rows else aj for j in range(rows + 1)])
        for i in range(cols):
            for j in range(2 * (cols - i) - 1):
                k = j // 2
                if j % 2 == 0:
                    out += [grid[i][k + 1], grid[i + 1][k], grid[i][k]]
                else:
                    out += [grid[i][k + 1], grid[i + 1][k + 1], grid[i + 1][k]]
    pts, tris, seen = [], [], {}
    for p in out:
        l = math.sqrt(p[0] ** 2 + p[1] ** 2 + p[2] ** 2)
        q = (p[0] / l, p[1] / l, p[2] / l)
        key = (round(q[0] * 1e4), round(q[1] * 1e4), round(q[2] * 1e4))
        if key not in seen:
            seen[key] = len(pts)
            pts.append(q)
        tris.append(seen[key])
    return pts, tris


def make_stone(seed, det):
    r = mk_rng(seed)
    sx = 0.75 + 0.75 * r()
    sy = 0.45 + 0.6 * r()
    sz = 0.6 + 0.6 * r()
    PL = [[1, 0, 0, sx], [-1, 0, 0, sx], [0, 1, 0, sy], [0, -1, 0, sy], [0, 0, 1, sz], [0, 0, -1, sz]]
    k = 3 + math.floor(r() * 4)
    for _c in range(k):
        nx = (-1 if r() < 0.5 else 1) * (0.4 + 0.6 * r())
        ny = (1 if r() < 0.75 else -0.35) * (0.25 + 0.7 * r())
        nz = (-1 if r() < 0.5 else 1) * (0.4 + 0.6 * r())
        if r() < 0.35:
            if r() < 0.5:
                nx *= 0.15
            else:
                nz *= 0.15
        L = math.sqrt(nx * nx + ny * ny + nz * nz)
        nx, ny, nz = nx / L, ny / L, nz / L
        sup = abs(nx) * sx + abs(ny) * sy + abs(nz) * sz
        PL.append([nx, ny, nz, sup * (0.52 + 0.3 * r())])
    bev = 0.075 * min(sx, sy, sz) * 2
    SH = [[q[0], q[1], q[2], q[3] - bev] for q in PL]
    pts, tris = icosphere(det)
    R0 = 3 * max(sx, sy, sz)
    P, Nr, edge = [], [], []
    for (px, py, pz) in pts:
        P0 = [px * R0, py * R0, pz * R0]
        x = P0[:]
        Y = [[0.0, 0.0, 0.0] for _ in SH]
        for _it in range(40):
            for j, q in enumerate(SH):
                zx, zy, zz = x[0] + Y[j][0], x[1] + Y[j][1], x[2] + Y[j][2]
                d = zx * q[0] + zy * q[1] + zz * q[2] - q[3]
                nxv = [zx - d * q[0], zy - d * q[1], zz - d * q[2]] if d > 0 else [zx, zy, zz]
                Y[j] = [zx - nxv[0], zy - nxv[1], zz - nxv[2]]
                x = nxv
        dx, dy, dz = P0[0] - x[0], P0[1] - x[1], P0[2] - x[2]
        dl = math.sqrt(dx * dx + dy * dy + dz * dz) or 1
        dx, dy, dz = dx / dl, dy / dl, dz / dl
        P.append((x[0] + dx * bev, x[1] + dy * bev, x[2] + dz * bev))
        Nr.append((dx, dy, dz))
        best = max(dx * q[0] + dy * q[1] + dz * q[2] for q in PL)
        edge.append(min(1.0, (1 - best) * 6))
    ymin = min(p[1] for p in P)
    ymax = max(p[1] for p in P)
    sm = None
    if r() < 0.35:
        a = r() * 6.283
        b = (r() - 0.5) * 0.8
        sm = [math.cos(b) * math.cos(a), math.sin(b), math.cos(b) * math.sin(a), (r() - 0.5) * 0.4 * min(sx, sz)]
    rel, occ, seam = [], [], []
    for p in P:
        rl = (ymax - p[1]) / (ymax - ymin)
        rel.append(rl)
        occ.append(0.6 * rl ** 1.5)
        seam.append(p[0] * sm[0] + p[1] * sm[1] + p[2] * sm[2] - sm[3] if sm else 10.0)
    # three.js draws counter-clockwise faces as the front, Godot clockwise: every triangle reversed
    ind = []
    for i in range(0, len(tris), 3):
        ind += [tris[i], tris[i + 2], tris[i + 1]]
    rnd = lambda v: round(v, 5)
    return {
        "p": [rnd(c) for q in P for c in q], "n": [rnd(c) for q in Nr for c in q], "edge": [rnd(v) for v in edge], "occ": [rnd(v) for v in occ],
        "rel": [rnd(v) for v in rel], "seam": [rnd(v) for v in seam], "i": ind,
        "ymin": ymin, "ymax": ymax, "rx": max(sx, sz),
    }


if __name__ == "__main__":
    out = {"levels": LEVELS, "shapes": []}
    for i in range(N_SHAPES):
        out["shapes"].append([make_stone(1000 + i * 37, det) for det in LEVELS])
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "stones.json")
    with open(path, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print("wrote", path, os.path.getsize(path), "bytes")
