# 그래프, DFS, BFS - 연결 요소의 개수 (백준 실버2)
# 문제 링크: https://www.acmicpc.net/problem/11724

import sys
from collections import deque

input = sys.stdin.readline
number_of_data = list(map(int, input().rstrip().split()))

edges = []
graph = {}

for i in range(1,number_of_data[0]+1):
    graph[i] = []

for _ in range(number_of_data[-1]):
    edge = list(map(int, input().rstrip().split()))
    graph[edge[0]].append(edge[1])
    graph[edge[1]].append(edge[0])
    edges.append(edge)

graph_number = 0
visited = set()
while len(visited) < number_of_data[0]:
    queue = deque([])
    for i in range(1,number_of_data[0]+1):
        if i not in visited:
            queue.append(i)
            break
    graph_number += 1
    while len(visited) < number_of_data[0]:
        q = queue.popleft()
        if q not in visited:
            visited.add(q)
            for i in graph[q]:
                if i not in visited:
                    queue.append(i)
        if not queue:
            break
print(graph_number)