//////////////////////////////////////
// Network flow - Dual primes (aka magic)
// - Thanks Bjarki
//////////////////////////////////////

function MinCostMatching(cost, Lmate, Rmate) {
  var n = cost.length;

  // construct dual feasible solution
  // VD u(n);
  // VD v(n);
  var u = [], v = [];

  for (var i = 0; i < n; i++) {
    u[i] = cost[i][0];
    for (var j = 1; j < n; j++) u[i] = Math.min(u[i], cost[i][j]);
  }
  for (var j = 0; j < n; j++) {
    v[j] = cost[0][j] - u[0];
    for (var i = 1; i < n; i++) v[j] = Math.min(v[j], cost[i][j] - u[i]);
  }

  // construct primal solution satisfying complementary slackness
  // Lmate = VI(n, -1);
  // Rmate = VI(n, -1);

  for (var i = 0; i < n; i++) Lmate[i] = Rmate[i] = -1;

  var mated = 0;
  for (var i = 0; i < n; i++) {
    for (var j = 0; j < n; j++) {
      if (Rmate[j] !== -1) continue;
      if (Math.abs(cost[i][j] - u[i] - v[j]) < 1e-10) {
        Lmate[i] = j;
        Rmate[j] = i;
        mated++;
        break;
      }
    }
  }

  // VD dist(n);
  // VI dad(n);
  // VI seen(n);
  var dist = [], dad = [], seen = [];

  // repeat until primal solution is feasible
  while (mated < n) {

    // find an unmatched left node
    var s = 0;
    while (Lmate[s] !== -1) s++;

    // initialize Dijkstra
    // fill(dad.begin(), dad.end(), -1);
    // fill(seen.begin(), seen.end(), 0);
    for (var i = 0; i < n; i++) {
      dad[i] = -1;
      seen[i] = false;
    }
    for (var k = 0; k < n; k++)
      dist[k] = cost[s][k] - u[s] - v[k];

    var j = 0;
    while (true) {

      // find closest
      j = -1;
      for (var k = 0; k < n; k++) {
        if (seen[k]) continue;
        if (j == -1 || dist[k] < dist[j]) j = k;
      }
      seen[j] = true;

      // termination condition
      if (Rmate[j] === -1) break;

      // relax neighbors
      var i = Rmate[j];
      for (var k = 0; k < n; k++) {
        if (seen[k]) continue;
        var new_dist = dist[j] + cost[i][k] - u[i] - v[k];
        if (dist[k] > new_dist) {
          dist[k] = new_dist;
          dad[k] = j;
        }
      }
    }

    // update dual variables
    for (var k = 0; k < n; k++) {
      if (k == j || !seen[k]) continue;
      var i = Rmate[k];
      v[k] += dist[k] - dist[j];
      u[i] -= dist[k] - dist[j];
    }
    u[s] += dist[j];

    // augment along path
    while (dad[j] >= 0) {
      var d = dad[j];
      Rmate[j] = Rmate[d];
      Lmate[Rmate[j]] = j;
      j = d;
    }
    Rmate[j] = s;
    Lmate[s] = j;

    mated++;
  }

  var value = 0;
  for (var i = 0; i < n; i++)
    value += cost[i][Lmate[i]];

  return value;
}

maxCostBipartiteMatching = function(adj_matrix) {
  var VERYSMALlCONSTANT = -1000000000;
  var n = adj_matrix.length,
      m = adj_matrix[0].length;

  while (n < m) {
    adj_matrix.push([]);
    for (var i = 0; i < m; i++) {
      adj_matrix[n][i] = VERYSMALlCONSTANT;
    }

    n++;
  }

  while (m < n) {
    for (var i = 0; i < n; i++) {
      adj_matrix[i].push(0);
    }

    m++;
  }


  for (var i = 0; i < n; i++) {
    for (var j = 0; j < m; j++) {
      adj_matrix[i][j] = -adj_matrix[i][j];
    }
  }

  var Lmate = [], Rmate = [];
  var res = MinCostMatching(adj_matrix, Lmate, Rmate);


  var matching = [];
  for (var i = 0; i < n; i++)
  {
    matching.push([ i, Lmate[i] ]);
  }

  return matching;
}

