# 위상정렬 - 작업 (백준 골드4)
# 문제 링크: https://www.acmicpc.net/problem/2056

import sys
from collections import deque

input = sys.stdin.readline

input_number = int(input().rstrip())

input_list = []
graph = {}
work_time = {}
edges = []
vertice_graph = {}

for i in range(1, input_number + 1):
    graph[i] = []
    vertice_graph[i] = 0
for i in range(input_number):
    input_data = list(map(int, input().rstrip().split()))
    work_time[i + 1] = input_data[0]
    if len(input_data) > 2:
        edge_shape = input_data[2:]
        for j in edge_shape:
            edges.append([j, i+1])
            if i + 1 not in graph:
                graph[i + 1] = []
            if j not in graph:
                graph[j] = []

            graph[j].append(i + 1)
            vertice_graph[i + 1] += 1
    input_list.append(input_data)
queue = deque([])
remain_time = [[-1,-1] for _ in range(len(work_time))]
max_time = -1
for i in vertice_graph:
    if vertice_graph[i] == 0:
        if work_time[i] > max_time:
            max_time = work_time[i]
        remain_time[i-1] = [0,work_time[i]]
        queue.append(i)
while queue:
    q = queue.popleft()
    for i in graph[q]:
        vertice_graph[i] -= 1
        if remain_time[i-1][1] < work_time[i] + remain_time[q-1][1]:
            remain_time[i-1][1] = work_time[i] + remain_time[q-1][1]
        if max_time < remain_time[i-1][1]:
            max_time = remain_time[i-1][1]
        if vertice_graph[i] == 0:
            queue.append(i)
print(max_time)
