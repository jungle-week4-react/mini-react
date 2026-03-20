# 그래프, DFS, BFS - 바이러스 (백준 실버3)
# 문제 링크: https://www.acmicpc.net/problem/2606
from collections import deque


total_computer = int(input())
number_of_connect = int(input())
list_of_connect = []
graph = {}
for _ in range(number_of_connect):
    appending_list = list(map(int,input().split()))
    list_of_connect.append(appending_list)
    if appending_list[0] not in graph:
        graph[appending_list[0]] = []
    if appending_list[1] not in graph:
        graph[appending_list[1]] = []
    graph[appending_list[0]].append(appending_list[1])
    graph[appending_list[1]].append(appending_list[0])

queue = deque([1])
visited = []

while len(queue) != 0:
    q = queue.popleft()
    if q not in visited:
        visited.append(q)
        if q in graph:
            for i in graph[q]:
                if i not in visited:
                    queue.append(i)

print(len(visited)-1)