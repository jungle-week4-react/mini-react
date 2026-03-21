# 트리 - 트리의 부모 찾기 (백준 실버2)
# 문제 링크: https://www.acmicpc.net/problem/11725

start = 1
import sys
from collections import deque

input = sys.stdin.readline
number_of_connect = int(input().rstrip())

connect_list = []
graph = {}

for _ in range(number_of_connect-1):
    data = list(map(int,input().rstrip().split()))
    connect_list.append(data)
    if data[0] not in graph:
        graph[data[0]] = []
    if data[1] not in graph:
        graph[data[1]] = []
    graph[data[0]].append(data[1])
    graph[data[1]].append(data[0])

queue = deque([start])
visited = set()
depth = [-1] * number_of_connect
while queue:
    q = queue.popleft()
    if q not in visited:
        visited.add(q)
        for i in  graph[q]:
            if i not in visited:
                queue.append(i)
                depth[i-1] = str(q)
print("\n".join(depth[1:]))