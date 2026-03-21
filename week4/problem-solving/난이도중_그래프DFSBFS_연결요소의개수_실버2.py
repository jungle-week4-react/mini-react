# 그래프, DFS, BFS - 연결 요소의 개수 (백준 실버2)
# 문제 링크: https://www.acmicpc.net/problem/11724

import sys
from collections import deque

input = sys.stdin.readline
number_of_data = list(map(int, input().rstrip().split()))

edges = []
graph = {}
for _ in range(number_of_data[-1]):
    edge = list(map(int, input().rstrip().split()))
    if edge[0] not in graph:
        graph[edge[0]] = []
    if edge[1] not in graph:
        graph[edge[1]] = []
    graph[edge[0]].append(edge[1])
    graph[edge[1]].append(edge[0])
    edges.append(edge)
queue = deque([edges[0][0]])
visited = []
while True:
    q = queue.popleft()
    if q not in visited:
        visited.append(q)
        for i in graph[q]:
            if i not in visited:
                queue.append(i)
        