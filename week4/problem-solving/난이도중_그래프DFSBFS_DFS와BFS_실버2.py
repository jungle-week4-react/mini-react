# 그래프, DFS, BFS - DFS와 BFS (백준 실버2)
# 문제 링크: https://www.acmicpc.net/problem/1260
from collections import deque

def dfs(graph,start):
    visited = []
    def recursive(graph,start):
        visited.append(start)
        for i in graph[start]:
            if i not in visited:
                recursive(graph,i)
        return
    recursive(graph,start)
    return visited
def bfs(graph,start):
    visited = []
    queue = deque([start])
    while queue:
        q = queue.popleft()
        if q not in visited:
            visited.append(q)
            for i in graph[q]:
                if i not in visited:
                    queue.append(i)
    return visited




import sys
input = sys.stdin.readline
vertices, edge_number,start = list(map(int,(input().rstrip().split())))

graph = {}
for i in range(1,vertices+1):
    graph[i] = []

edges = []
for _ in range(edge_number):
    edge = list(map(int,(input().rstrip().split())))
    graph[edge[0]].append(edge[1])
    graph[edge[1]].append(edge[0])
for key in graph:
    graph[key].sort()
dfs_result = dfs(graph,start)
bfs_result = bfs(graph,start)
print(" ".join(list(map(str,dfs_result))))
print(" ".join(list(map(str,bfs_result))))